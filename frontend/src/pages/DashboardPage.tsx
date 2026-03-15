
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { meRequest } from "../api/auth.api";
import {
  createPipelineRequest,
  deletePipelineRequest,
  getPipelineByIdRequest,
  getPipelinesRequest,
  type Pipeline,
} from "../api/pipelines.api";
import {
  createPipelineStepRequest,
  deletePipelineStepRequest,
  getPipelineStepsRequest,
  updatePipelineStepRequest,
  type PipelineStep,
  type StepType,
} from "../api/pipeline-steps.api";
import {
  createSubscriberRequest,
  deleteSubscriberRequest,
  getSubscribersRequest,
  type Subscriber,
} from "../api/subscribers.api";
import {
  getJobByIdRequest,
  getJobsRequest,
  getPipelineJobsRequest,
  type Job,
} from "../api/jobs.api";
import { ingestWebhookRequest } from "../api/webhooks.api";
import { buildRateLimitMessage, getApiErrorMessage, getRetryAfterSeconds } from "../utils/api-error";
import { removeToken } from "../utils/token";
import "../assets/css/dashboard.css";

type User = { id: string; username: string; email: string };
type Toast = { id: number; type: "success" | "error"; message: string };
type DialogView = null | "pipeline" | "step" | "subscriber" | "webhook" | "job";
type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm?: () => Promise<void> | void;
};
type RenameRow = { id: string; from: string; to: string };
type AddRow = { id: string; key: string; value: string };

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const parsePrimitive = (value: string): unknown => {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) return asNumber;
  return value;
};

const humanizeKey = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

const formatSimpleValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value.map((item) => formatSimpleValue(item)).join(", ");
  }
  if (typeof value === "object") {
    const count = Object.keys(value as Record<string, unknown>).length;
    return `${count} nested field${count === 1 ? "" : "s"}`;
  }
  return String(value);
};

const toEntries = (value: unknown): Array<[string, unknown]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>);
};

const buildStepSummary = (step: PipelineStep): string => {
  const config = (step.stepConfig ?? {}) as Record<string, unknown>;
  if (step.stepType === "filter") {
    return `Filter: ${String(config.field ?? "field")} ${String(config.operator ?? "==")} ${formatSimpleValue(config.value)}`;
  }
  if (step.stepType === "transform") {
    const renameCount = Object.keys((config.rename ?? {}) as Record<string, unknown>).length;
    const addCount = Object.keys((config.add ?? {}) as Record<string, unknown>).length;
    const removeCount = Array.isArray(config.remove) ? config.remove.length : 0;
    return `Transform: rename ${renameCount}, add ${addCount}, remove ${removeCount}`;
  }
  return `Enrich HTTP: GET ${String(config.url ?? "")} (timeout ${String(config.timeoutMs ?? 5000)}ms)`;
};

async function generateHmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signatureBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const toastIdRef = useRef(1);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [activeDialog, setActiveDialog] = useState<DialogView>(null);

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [selectedPipelineDetails, setSelectedPipelineDetails] = useState<Pipeline | null>(null);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [focusedJob, setFocusedJob] = useState<Job | null>(null);
  const [webhookDoneMap, setWebhookDoneMap] = useState<Record<string, boolean>>({});

  const [newPipelineName, setNewPipelineName] = useState("");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepOrder, setStepOrder] = useState(1);
  const [stepType, setStepType] = useState<StepType>("filter");

  const [filterField, setFilterField] = useState("price");
  const [filterOperator, setFilterOperator] = useState<">" | "<" | ">=" | "<=" | "==" | "!=">(">");
  const [filterValue, setFilterValue] = useState("20");

  const [renameRows, setRenameRows] = useState<RenameRow[]>([]);
  const [addRows, setAddRows] = useState<AddRow[]>([]);
  const [removeText, setRemoveText] = useState("");

  const [enrichUrl, setEnrichUrl] = useState("https://ipinfo.io/{{ip}}/json");
  const [enrichTimeoutMs, setEnrichTimeoutMs] = useState(5000);

  const [subscriberUrl, setSubscriberUrl] = useState("");
  const [subscriberSecret, setSubscriberSecret] = useState("");
  const [webhookPayloadRows, setWebhookPayloadRows] = useState<AddRow[]>([
    { id: uid(), key: "product", value: "pizza" },
    { id: uid(), key: "price", value: "75" },
    { id: uid(), key: "ip", value: "8.8.8.8" },
  ]);
  const [webhookSignature, setWebhookSignature] = useState("");
  const [webhookRateLimitSecondsLeft, setWebhookRateLimitSecondsLeft] = useState(0);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, title: "", message: "", confirmLabel: "Confirm" });

  const payloadEntries = toEntries(focusedJob?.payload);
  const resultEntries = toEntries(focusedJob?.result);
  const subscriberLookup = new Map(subscribers.map((item) => [item.id, item.url]));

  const webhookDone = Boolean(selectedPipelineId && webhookDoneMap[selectedPipelineId]);
  const guidedStep = !selectedPipelineId ? 1 : steps.length === 0 ? 2 : subscribers.length === 0 ? 3 : !webhookDone ? 4 : 5;

  const toast = (type: "success" | "error", message: string) => {
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  };

  const toastError = (error: unknown, fallback: string) => toast("error", getApiErrorMessage(error, fallback));

  const getNextStepOrder = () => {
    if (steps.length === 0) return 1;
    return Math.max(...steps.map((step) => step.stepOrder)) + 1;
  };

  const resetStepForm = (stepOrderValue = 1) => {
    setEditingStepId(null);
    setStepOrder(stepOrderValue);
    setStepType("filter");
    setFilterField("price");
    setFilterOperator(">");
    setFilterValue("20");
    setRenameRows([]);
    setAddRows([]);
    setRemoveText("");
    setEnrichUrl("https://ipinfo.io/{{ip}}/json");
    setEnrichTimeoutMs(5000);
  };

  const buildStepConfig = (): unknown => {
    if (stepType === "filter") {
      return { field: filterField.trim(), operator: filterOperator, value: parsePrimitive(filterValue) };
    }
    if (stepType === "transform") {
      const rename = Object.fromEntries(renameRows.filter((r) => r.from.trim() && r.to.trim()).map((r) => [r.from.trim(), r.to.trim()]));
      const add = Object.fromEntries(addRows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), parsePrimitive(r.value)]));
      const remove = removeText.split(",").map((x) => x.trim()).filter(Boolean);
      const config: Record<string, unknown> = {};
      if (Object.keys(rename).length > 0) config.rename = rename;
      if (Object.keys(add).length > 0) config.add = add;
      if (remove.length > 0) config.remove = remove;
      return config;
    }
    return { url: enrichUrl.trim(), method: "GET", timeoutMs: enrichTimeoutMs };
  };

  const fillStepForm = (step: PipelineStep) => {
    setEditingStepId(step.id);
    setStepOrder(step.stepOrder);
    setStepType(step.stepType);
    const config = (step.stepConfig ?? {}) as Record<string, unknown>;
    if (step.stepType === "filter") {
      setFilterField(String(config.field ?? ""));
      setFilterOperator(String(config.operator ?? ">") as ">" | "<" | ">=" | "<=" | "==" | "!=");
      setFilterValue(config.value === undefined || config.value === null ? "" : String(config.value));
      return;
    }
    if (step.stepType === "transform") {
      const rename = (config.rename ?? {}) as Record<string, unknown>;
      const add = (config.add ?? {}) as Record<string, unknown>;
      const remove = (config.remove ?? []) as unknown[];
      setRenameRows(Object.entries(rename).map(([from, to]) => ({ id: uid(), from, to: String(to) })));
      setAddRows(Object.entries(add).map(([key, value]) => ({ id: uid(), key, value: String(value) })));
      setRemoveText(remove.map((item) => String(item)).join(", "));
      return;
    }
    setEnrichUrl(String(config.url ?? ""));
    setEnrichTimeoutMs(Number(config.timeoutMs ?? 5000) || 5000);
  };

  const withConfirm = (title: string, message: string, confirmLabel: string, onConfirm: () => Promise<void> | void, danger = false) => {
    setConfirmState({ open: true, title, message, confirmLabel, onConfirm, danger });
  };

  const runConfirm = async () => {
    if (!confirmState.onConfirm) return;
    try {
      setWorking(true);
      await confirmState.onConfirm();
    } finally {
      setWorking(false);
      setConfirmState({ open: false, title: "", message: "", confirmLabel: "Confirm" });
    }
  };
  const loadPipelineData = async (pipelineId: string) => {
    try {
      const [pipeline, pipelineSteps, pipelineSubscribers, pipelineJobs] = await Promise.all([
        getPipelineByIdRequest(pipelineId),
        getPipelineStepsRequest(pipelineId),
        getSubscribersRequest(pipelineId),
        getPipelineJobsRequest(pipelineId),
      ]);
      setSelectedPipelineDetails(pipeline);
      setSteps(pipelineSteps);
      setSubscribers(pipelineSubscribers);
      setJobs(pipelineJobs);
    } catch (error) {
      toastError(error, "Failed to load pipeline details.");
    }
  };

  const refreshJobsOnly = async () => {
    try {
      const list = selectedPipelineId ? await getPipelineJobsRequest(selectedPipelineId) : await getJobsRequest();
      setJobs(list);
    } catch (error) {
      toastError(error, "Failed to refresh jobs list.");
    }
  };

  const loadDashboard = async () => {
    try {
      const [me, pipelineList, allJobs] = await Promise.all([meRequest(), getPipelinesRequest(), getJobsRequest()]);
      setUser(me.data.user as User);
      setPipelines(pipelineList);
      setJobs(allJobs);
      if (pipelineList.length > 0) setSelectedPipelineId(pipelineList[0].id);
    } catch (error) {
      toastError(error, "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (webhookRateLimitSecondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setWebhookRateLimitSecondsLeft((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [webhookRateLimitSecondsLeft]);
  useEffect(() => {
    if (!selectedPipelineId) {
      setSelectedPipelineDetails(null);
      setSteps([]);
      setSubscribers([]);
      return;
    }
    loadPipelineData(selectedPipelineId);
  }, [selectedPipelineId]);

  const handleLogout = () => {
    removeToken();
    navigate("/login");
  };

  const handleCreatePipeline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPipelineName.trim()) return toast("error", "Pipeline name is required.");

    try {
      setWorking(true);
      const pipeline = await createPipelineRequest({ name: newPipelineName.trim() });
      setPipelines((prev) => [pipeline, ...prev]);
      setSelectedPipelineId(pipeline.id);
      setNewPipelineName("");
      setActiveDialog(null);
      toast("success", "Pipeline created successfully.");
    } catch (error) {
      toastError(error, "Failed to create pipeline.");
    } finally {
      setWorking(false);
    }
  };

  const handleDeletePipeline = (pipelineId: string) => {
    withConfirm("Delete Pipeline", "This action will remove the pipeline and all related records.", "Delete Pipeline", async () => {
      await deletePipelineRequest(pipelineId);
      const remaining = pipelines.filter((pipeline) => pipeline.id !== pipelineId);
      const nextSelected = selectedPipelineId === pipelineId ? remaining[0]?.id ?? "" : selectedPipelineId;
      setPipelines(remaining);
      setSelectedPipelineId(nextSelected);
      if (nextSelected) {
        setJobs(await getPipelineJobsRequest(nextSelected));
      } else {
        setJobs(await getJobsRequest());
      }
      toast("success", "Pipeline deleted successfully.");
    }, true);
  };

  const openCreateStepDialog = () => {
    resetStepForm(getNextStepOrder());
    setActiveDialog("step");
  };

  const handleSaveStep = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPipelineId) return toast("error", "Select a pipeline first.");

    const payload = { stepOrder, stepType, stepConfig: buildStepConfig() };

    try {
      setWorking(true);
      if (editingStepId) {
        await updatePipelineStepRequest(editingStepId, payload);
        toast("success", "Step updated successfully.");
      } else {
        await createPipelineStepRequest(selectedPipelineId, payload);
        toast("success", "Step added successfully.");
      }
      await loadPipelineData(selectedPipelineId);
      resetStepForm();
      setActiveDialog(null);
    } catch (error) {
      toastError(error, "Failed to save step.");
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteStep = (stepId: string) => {
    if (!selectedPipelineId) return;
    withConfirm("Delete Step", "Are you sure you want to delete this step?", "Delete Step", async () => {
      await deletePipelineStepRequest(stepId);
      await loadPipelineData(selectedPipelineId);
      toast("success", "Step deleted successfully.");
    }, true);
  };

  const handleCreateSubscriber = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPipelineId) return toast("error", "Select a pipeline first.");
    if (steps.length === 0) return toast("error", "Add at least one step before adding subscribers.");
    if (!subscriberUrl.trim()) return toast("error", "Subscriber URL is required.");

    try {
      setWorking(true);
      await createSubscriberRequest(selectedPipelineId, { url: subscriberUrl.trim(), secret: subscriberSecret.trim() || undefined });
      await loadPipelineData(selectedPipelineId);
      setSubscriberUrl("");
      setSubscriberSecret("");
      setActiveDialog(null);
      toast("success", "Subscriber added successfully.");
    } catch (error) {
      toastError(error, "Failed to add subscriber.");
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteSubscriber = (subscriberId: string) => {
    if (!selectedPipelineId) return;
    withConfirm("Delete Subscriber", "Are you sure you want to delete this subscriber?", "Delete Subscriber", async () => {
      await deleteSubscriberRequest(subscriberId);
      await loadPipelineData(selectedPipelineId);
      toast("success", "Subscriber deleted successfully.");
    }, true);
  };

  const buildWebhookPayloadText = () => {
    const payload = Object.fromEntries(webhookPayloadRows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), parsePrimitive(row.value)]));
    return JSON.stringify(payload);
  };

  const addWebhookPayloadRow = () => {
    setWebhookPayloadRows((previous) => [...previous, { id: uid(), key: "", value: "" }]);
  };

  const updateWebhookPayloadRow = (id: string, patch: Partial<AddRow>) => {
    setWebhookPayloadRows((previous) => previous.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeWebhookPayloadRow = (id: string) => {
    setWebhookPayloadRows((previous) => previous.filter((row) => row.id !== id));
  };

  const handleGenerateSignature = async () => {
    if (!selectedPipelineDetails?.webhookSecret) return toast("error", "No pipeline selected.");

    try {
      const payloadText = buildWebhookPayloadText();
      const signature = await generateHmacSha256Hex(selectedPipelineDetails.webhookSecret, payloadText);
      setWebhookSignature(signature);
      toast("success", "Signature generated from pipeline secret.");
    } catch (error) {
      toastError(error, "Failed to generate signature.");
    }
  };

  const handleSendWebhook = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPipelineDetails?.webhookPath) return toast("error", "No pipeline selected.");
    if (steps.length === 0) return toast("error", "Add at least one step first.");
    if (subscribers.length === 0) return toast("error", "Add at least one subscriber first.");
    if (!webhookSignature.trim()) return toast("error", "X-Signature is required.");
    if (webhookRateLimitSecondsLeft > 0) return toast("error", `Webhook is rate limited. Try again in ${webhookRateLimitSecondsLeft}s.`);

    const payloadText = buildWebhookPayloadText();
    if (payloadText === "{}") return toast("error", "Add at least one payload field.");

    try {
      setWorking(true);
      const result = await ingestWebhookRequest(selectedPipelineDetails.webhookPath, payloadText, webhookSignature.trim());
      toast("success", `Webhook accepted. Job ID: ${result.job.id}`);
      if (selectedPipelineId) {
        setWebhookDoneMap((prev) => ({ ...prev, [selectedPipelineId]: true }));
      }
      await refreshJobsOnly();
      setActiveDialog(null);
    } catch (error) {
      const retryAfter = getRetryAfterSeconds(error);
      if (retryAfter) {
        setWebhookRateLimitSecondsLeft(retryAfter);
      }
      toast("error", getApiErrorMessage(error, buildRateLimitMessage("Too many webhook attempts.", retryAfter)));
    } finally {
      setWorking(false);
    }
  };

  const handleOpenJob = async (jobId: string) => {
    try {
      setWorking(true);
      const job = await getJobByIdRequest(jobId);
      setFocusedJob(job);
      setActiveDialog("job");
    } catch (error) {
      toastError(error, "Failed to load job details.");
    } finally {
      setWorking(false);
    }
  };

  const openGuidedAction = () => {
    if (guidedStep === 1) {
      setActiveDialog("pipeline");
      return;
    }
    if (guidedStep === 2) {
      openCreateStepDialog();
      return;
    }
    if (guidedStep === 3) {
      setActiveDialog("subscriber");
      return;
    }
    if (guidedStep === 4) {
      setActiveDialog("webhook");
      return;
    }
    toast("success", "Setup complete. Your pipeline is ready.");
  };

  if (loading) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-loading-card">
          <h2>Loading your dashboard...</h2>
          <p>Fetching account, pipelines, and jobs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Webhook Pipeline Platform</p>
            <h1>Welcome back, {user?.username}</h1>
            <p className="dashboard-subtitle">Guided setup flow: Pipeline, then Steps, then Subscribers, then Test Webhook.</p>
          </div>
          <div className="dashboard-actions-row">
            <button className="dashboard-btn" onClick={openGuidedAction}>Continue Setup</button>
            <button className="dashboard-btn dashboard-btn-ghost" onClick={() => setActiveDialog("pipeline")}>New Pipeline</button>
            <button className="dashboard-btn dashboard-btn-ghost" onClick={openCreateStepDialog} disabled={!selectedPipelineId}>Add Step</button>
            <button className="dashboard-btn dashboard-btn-ghost" onClick={() => setActiveDialog("subscriber")} disabled={!selectedPipelineId || steps.length === 0}>Add Subscriber</button>
            <button className="dashboard-btn dashboard-btn-ghost" onClick={() => setActiveDialog("webhook")} disabled={!selectedPipelineId || steps.length === 0 || subscribers.length === 0}>Test Webhook</button>
            <button className="dashboard-btn dashboard-btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <section className="dashboard-card">
          <div className="dashboard-inline-head">
            <h2>Setup Progress</h2>
            <span className="setup-status">Current step: {guidedStep > 4 ? "Completed" : guidedStep}</span>
          </div>
          <div className="setup-track">
            <div className={`setup-step ${guidedStep > 1 ? "is-done" : guidedStep === 1 ? "is-active" : ""}`}><span>1</span><p>Create Pipeline</p></div>
            <div className={`setup-step ${guidedStep > 2 ? "is-done" : guidedStep === 2 ? "is-active" : ""}`}><span>2</span><p>Add Steps</p></div>
            <div className={`setup-step ${guidedStep > 3 ? "is-done" : guidedStep === 3 ? "is-active" : ""}`}><span>3</span><p>Add Subscribers</p></div>
            <div className={`setup-step ${guidedStep > 4 ? "is-done" : guidedStep === 4 ? "is-active" : ""}`}><span>4</span><p>Send Test Webhook</p></div>
          </div>
        </section>

        <section className="dashboard-grid dashboard-grid-stats">
          <article className="dashboard-card dashboard-stat-card"><p className="dashboard-stat-label">Pipelines</p><h3>{pipelines.length}</h3><span>Owned by your account</span></article>
          <article className="dashboard-card dashboard-stat-card"><p className="dashboard-stat-label">Steps</p><h3>{steps.length}</h3><span>In selected pipeline</span></article>
          <article className="dashboard-card dashboard-stat-card"><p className="dashboard-stat-label">Jobs</p><h3>{jobs.length}</h3><span>Recent execution history</span></article>
        </section>

        <section className="dashboard-grid dashboard-grid-main">
          <article className="dashboard-card">
            <h2>My Pipelines</h2>
            <div className="dashboard-list">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className={`dashboard-list-item ${selectedPipelineId === pipeline.id ? "is-active" : ""}`}>
                  <button className="dashboard-list-main" onClick={() => setSelectedPipelineId(pipeline.id)}>
                    <strong>{pipeline.name}</strong>
                    <span>{pipeline.id}</span>
                  </button>
                  <button className="dashboard-danger-link" onClick={() => handleDeletePipeline(pipeline.id)}>Delete</button>
                </div>
              ))}
              {pipelines.length === 0 ? <p className="dashboard-empty">No pipelines yet.</p> : null}
            </div>
          </article>

          <article className="dashboard-card">
            <h2>Pipeline Snapshot</h2>
            {selectedPipelineDetails ? (
              <div className="dashboard-kv">
                <div><span>Name</span><strong>{selectedPipelineDetails.name}</strong></div>
                <div><span>Webhook Path</span><strong>{selectedPipelineDetails.webhookPath}</strong></div>
                <div><span>Webhook Secret</span><strong className="dashboard-mono">{selectedPipelineDetails.webhookSecret}</strong></div>
              </div>
            ) : <p className="dashboard-empty">Select a pipeline to see details.</p>}
          </article>
        </section>

        <section className="dashboard-grid dashboard-grid-main">
          <article className="dashboard-card">
            <div className="dashboard-inline-head">
              <h2>Pipeline Steps</h2>
              <button className="dashboard-btn dashboard-btn-ghost" onClick={openCreateStepDialog} disabled={!selectedPipelineId}>Add Step</button>
            </div>
            <div className="dashboard-list">
              {steps.map((step) => (
                <div key={step.id} className="dashboard-list-item">
                  <div className="dashboard-list-main-text">
                    <strong>#{step.stepOrder} - {step.stepType}</strong>
                    <span>{buildStepSummary(step)}</span>
                  </div>
                  <div className="dashboard-actions-row">
                    <button className="dashboard-btn dashboard-btn-ghost" onClick={() => { fillStepForm(step); setActiveDialog("step"); }}>Edit</button>
                    <button className="dashboard-danger-link" onClick={() => handleDeleteStep(step.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {steps.length === 0 ? <p className="dashboard-empty">No steps yet.</p> : null}
            </div>
          </article>

          <article className="dashboard-card">
            <div className="dashboard-inline-head">
              <h2>Subscribers</h2>
              <button className="dashboard-btn dashboard-btn-ghost" onClick={() => setActiveDialog("subscriber")} disabled={!selectedPipelineId || steps.length === 0}>Add Subscriber</button>
            </div>
            <div className="dashboard-list">
              {subscribers.map((subscriber) => (
                <div key={subscriber.id} className="dashboard-list-item">
                  <div className="dashboard-list-main-text">
                    <strong>{subscriber.url}</strong>
                    <span>{subscriber.id}</span>
                  </div>
                  <button className="dashboard-danger-link" onClick={() => handleDeleteSubscriber(subscriber.id)}>Delete</button>
                </div>
              ))}
              {subscribers.length === 0 ? <p className="dashboard-empty">No subscribers yet.</p> : null}
            </div>
          </article>
        </section>

        <section className="dashboard-card">
          <div className="dashboard-inline-head">
            <h2>Job History</h2>
            <button className="dashboard-btn dashboard-btn-ghost" onClick={refreshJobsOnly}>Refresh</button>
          </div>
          <div className="dashboard-list">
            {jobs.map((job) => (
              <div key={job.id} className="dashboard-list-item">
                <div className="dashboard-list-main-text">
                  <strong>{job.status}</strong>
                  <span>{job.id}</span>
                  <span>{formatDate(job.createdAt)}</span>
                </div>
                <button className="dashboard-btn dashboard-btn-ghost" onClick={() => handleOpenJob(job.id)}>Details</button>
              </div>
            ))}
            {jobs.length === 0 ? <p className="dashboard-empty">No jobs found for this scope.</p> : null}
          </div>
        </section>
      </div>

      <div className="toast-stack">
        {toasts.map((toastItem) => (
          <div key={toastItem.id} className={`toast-item toast-${toastItem.type}`}>
            {toastItem.message}
          </div>
        ))}
      </div>

      {confirmState.open ? (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>{confirmState.title}</h3>
            <p>{confirmState.message}</p>
            <div className="confirm-actions">
              <button className="dashboard-btn dashboard-btn-ghost" onClick={() => setConfirmState({ open: false, title: "", message: "", confirmLabel: "Confirm" })}>Cancel</button>
              <button className={`dashboard-btn ${confirmState.danger ? "dashboard-btn-danger" : ""}`} onClick={runConfirm} disabled={working}>{confirmState.confirmLabel}</button>
            </div>
          </div>
        </div>
      ) : null}

      {activeDialog === "pipeline" ? (
        <div className="dialog-overlay">
          <div className="dialog-modal">
            <div className="dialog-head"><h3>Create Pipeline</h3><button className="dialog-close" onClick={() => setActiveDialog(null)}>x</button></div>
            <form className="dashboard-form" onSubmit={handleCreatePipeline}>
              <label>Pipeline Name<input className="dashboard-input" value={newPipelineName} onChange={(event) => setNewPipelineName(event.target.value)} placeholder="Order processing pipeline" /></label>
              <div className="dashboard-actions-row">
                <button className="dashboard-btn" type="submit" disabled={working}>Create</button>
                <button className="dashboard-btn dashboard-btn-ghost" type="button" onClick={() => setActiveDialog(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeDialog === "step" ? (
        <div className="dialog-overlay">
          <div className="dialog-modal dialog-modal-wide">
            <div className="dialog-head"><h3>{editingStepId ? "Edit Step" : "Add Step"}</h3><button className="dialog-close" onClick={() => { setActiveDialog(null); resetStepForm(); }}>x</button></div>
            <form className="dashboard-form" onSubmit={handleSaveStep}>
              <div className="step-blocks-grid">
                <label>Step Order<input className="dashboard-input" type="number" min={1} value={stepOrder} onChange={(event) => setStepOrder(Number(event.target.value) || 1)} /></label>
                <label>Step Type<select className="dashboard-input" value={stepType} onChange={(event) => setStepType(event.target.value as StepType)}><option value="filter">filter</option><option value="transform">transform</option><option value="enrich_http">enrich_http</option></select></label>
              </div>

              {stepType === "filter" ? <div className="step-blocks-grid"><label>Field<input className="dashboard-input" value={filterField} onChange={(event) => setFilterField(event.target.value)} /></label><label>Operator<select className="dashboard-input" value={filterOperator} onChange={(event) => setFilterOperator(event.target.value as ">" | "<" | ">=" | "<=" | "==" | "!=")}><option value=">">&gt;</option><option value="<">&lt;</option><option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">==</option><option value="!=">!=</option></select></label><label>Value<input className="dashboard-input" value={filterValue} onChange={(event) => setFilterValue(event.target.value)} /></label></div> : null}

              {stepType === "transform" ? <div className="step-blocks-stack"><div className="step-block-card"><div className="step-block-head"><h4>Rename Fields</h4><button type="button" className="dashboard-btn dashboard-btn-ghost" onClick={() => setRenameRows((previous) => [...previous, { id: uid(), from: "", to: "" }])}>Add Row</button></div>{renameRows.map((row) => <div key={row.id} className="step-row-item"><input className="dashboard-input" value={row.from} onChange={(event) => setRenameRows((previous) => previous.map((item) => (item.id === row.id ? { ...item, from: event.target.value } : item)))} placeholder="from" /><input className="dashboard-input" value={row.to} onChange={(event) => setRenameRows((previous) => previous.map((item) => (item.id === row.id ? { ...item, to: event.target.value } : item)))} placeholder="to" /><button type="button" className="dashboard-danger-link" onClick={() => setRenameRows((previous) => previous.filter((item) => item.id !== row.id))}>Remove</button></div>)}{renameRows.length === 0 ? <p className="dashboard-empty">No rename rules yet.</p> : null}</div><div className="step-block-card"><div className="step-block-head"><h4>Add Fields</h4><button type="button" className="dashboard-btn dashboard-btn-ghost" onClick={() => setAddRows((previous) => [...previous, { id: uid(), key: "", value: "" }])}>Add Row</button></div>{addRows.map((row) => <div key={row.id} className="step-row-item"><input className="dashboard-input" value={row.key} onChange={(event) => setAddRows((previous) => previous.map((item) => (item.id === row.id ? { ...item, key: event.target.value } : item)))} placeholder="field" /><input className="dashboard-input" value={row.value} onChange={(event) => setAddRows((previous) => previous.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item)))} placeholder="value" /><button type="button" className="dashboard-danger-link" onClick={() => setAddRows((previous) => previous.filter((item) => item.id !== row.id))}>Remove</button></div>)}{addRows.length === 0 ? <p className="dashboard-empty">No add-field rules yet.</p> : null}</div><div className="step-block-card"><h4>Remove Fields</h4><input className="dashboard-input" value={removeText} onChange={(event) => setRemoveText(event.target.value)} placeholder="internalNote, debugInfo" /></div></div> : null}

              {stepType === "enrich_http" ? <div className="step-blocks-grid"><label>URL<input className="dashboard-input" value={enrichUrl} onChange={(event) => setEnrichUrl(event.target.value)} /></label><label>Method<input className="dashboard-input" value="GET" disabled /></label><label>Timeout (ms)<input className="dashboard-input" type="number" min={1000} value={enrichTimeoutMs} onChange={(event) => setEnrichTimeoutMs(Number(event.target.value) || 5000)} /></label></div> : null}

              <div className="dashboard-actions-row"><button className="dashboard-btn" type="submit" disabled={working || !selectedPipelineId}>{editingStepId ? "Update Step" : "Add Step"}</button><button className="dashboard-btn dashboard-btn-ghost" type="button" onClick={() => { setActiveDialog(null); resetStepForm(); }}>Cancel</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {activeDialog === "subscriber" ? (
        <div className="dialog-overlay">
          <div className="dialog-modal">
            <div className="dialog-head"><h3>Add Subscriber</h3><button className="dialog-close" onClick={() => setActiveDialog(null)}>x</button></div>
            <form className="dashboard-form" onSubmit={handleCreateSubscriber}>
              <label>URL<input className="dashboard-input" value={subscriberUrl} onChange={(event) => setSubscriberUrl(event.target.value)} placeholder="https://example.com/webhook-receiver" /></label>
              <label>Secret (Optional)<input className="dashboard-input" value={subscriberSecret} onChange={(event) => setSubscriberSecret(event.target.value)} placeholder="subscriber_secret_123" /></label>
              <div className="dashboard-actions-row"><button className="dashboard-btn" type="submit" disabled={working || !selectedPipelineId || steps.length === 0}>Add Subscriber</button><button className="dashboard-btn dashboard-btn-ghost" type="button" onClick={() => setActiveDialog(null)}>Cancel</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {activeDialog === "webhook" ? (
        <div className="dialog-overlay">
          <div className="dialog-modal dialog-modal-wide">
            <div className="dialog-head"><h3>Send Test Webhook</h3><button className="dialog-close" onClick={() => setActiveDialog(null)}>x</button></div>
            <form className="dashboard-form" onSubmit={handleSendWebhook}>
              <div className="step-block-card"><div className="step-block-head"><h4>Payload Fields</h4><button type="button" className="dashboard-btn dashboard-btn-ghost" onClick={addWebhookPayloadRow}>Add Field</button></div><div className="step-row-grid step-row-grid-add">{webhookPayloadRows.map((row) => <div key={row.id} className="step-row-item"><input className="dashboard-input" value={row.key} onChange={(event) => updateWebhookPayloadRow(row.id, { key: event.target.value })} placeholder="field" /><input className="dashboard-input" value={row.value} onChange={(event) => updateWebhookPayloadRow(row.id, { value: event.target.value })} placeholder="value" /><button type="button" className="dashboard-danger-link" onClick={() => removeWebhookPayloadRow(row.id)}>Remove</button></div>)}</div></div>
              <label>X-Signature<input className="dashboard-input dashboard-mono" value={webhookSignature} onChange={(event) => setWebhookSignature(event.target.value)} placeholder="hex signature" /></label>
              <div className="dashboard-actions-row"><button className="dashboard-btn dashboard-btn-ghost" type="button" onClick={handleGenerateSignature} disabled={!selectedPipelineDetails}>Generate from Secret</button><button className="dashboard-btn" type="submit" disabled={working || webhookRateLimitSecondsLeft > 0 || !selectedPipelineDetails || steps.length === 0 || subscribers.length === 0}>{webhookRateLimitSecondsLeft > 0 ? `Rate limited (${webhookRateLimitSecondsLeft}s)` : "Send Webhook"}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {activeDialog === "job" && focusedJob ? (
        <div className="dialog-overlay">
          <div className="dialog-modal dialog-modal-wide">
            <div className="dialog-head"><h3>Job Details</h3><button className="dialog-close" onClick={() => setActiveDialog(null)}>x</button></div>

            <div className="job-summary-grid">
              <div className="job-summary-item"><span>Status</span><strong>{focusedJob.status}</strong></div>
              <div className="job-summary-item"><span>Pipeline</span><strong>{focusedJob.pipeline?.name ?? focusedJob.pipelineId}</strong></div>
              <div className="job-summary-item"><span>Created</span><strong>{formatDate(focusedJob.createdAt)}</strong></div>
              <div className="job-summary-item"><span>Processed</span><strong>{formatDate(focusedJob.processedAt)}</strong></div>
            </div>

            <div className="job-info-note">
              <p><strong>Job ID:</strong> <span className="dashboard-mono">{focusedJob.id}</span></p>
              <p><strong>Error:</strong> {focusedJob.error ?? "No errors"}</p>
              <p><strong>Stop reason:</strong> {focusedJob.stopReason ?? "Completed normally"}</p>
            </div>

            <div className="friendly-section">
              <h4>Incoming Payload</h4>
              {payloadEntries.length > 0 ? (
                <div className="friendly-grid">
                  {payloadEntries.map(([key, value]) => (
                    <div key={key} className="friendly-item">
                      <span>{humanizeKey(key)}</span>
                      <strong>{formatSimpleValue(value)}</strong>
                    </div>
                  ))}
                </div>
              ) : <p className="dashboard-empty">No payload details.</p>}
            </div>

            <div className="friendly-section">
              <h4>Processing Result</h4>
              {resultEntries.length > 0 ? (
                <div className="friendly-grid">
                  {resultEntries.map(([key, value]) => (
                    <div key={key} className="friendly-item">
                      <span>{humanizeKey(key)}</span>
                      <strong>{formatSimpleValue(value)}</strong>
                    </div>
                  ))}
                </div>
              ) : <p className="dashboard-empty">No result details yet.</p>}
            </div>

            <div className="friendly-section">
              <h4>Delivery Attempts</h4>
              {focusedJob.deliveryAttempts && focusedJob.deliveryAttempts.length > 0 ? (
                <div className="delivery-table-wrap">
                  <table className="delivery-table">
                    <thead>
                      <tr>
                        <th>Attempt</th>
                        <th>Subscriber</th>
                        <th>Status</th>
                        <th>Response</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {focusedJob.deliveryAttempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td>{attempt.attempt}</td>
                          <td>{subscriberLookup.get(attempt.subscriberId) ?? attempt.subscriberId}</td>
                          <td>{attempt.status}</td>
                          <td>{attempt.responseCode ?? "-"}</td>
                          <td>{formatDate(attempt.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="dashboard-empty">No delivery attempts recorded.</p>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}








