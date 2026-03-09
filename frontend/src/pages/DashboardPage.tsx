
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
import { ingestWebhookRequest } from "../api/webhooks.api";
import { getApiErrorMessage } from "../utils/api-error";
import { removeToken } from "../utils/token";
import "../assets/css/dashboard.css";

type User = { id: string; username: string; email: string };
type Mode = "browse" | "wizard";
type Toast = { id: number; type: "success" | "error"; message: string };
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

const wizardLabels = ["Create Pipeline", "Configure Steps", "Add Subscribers", "Send Test Webhook"];
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const prettyJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

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
  const [mode, setMode] = useState<Mode>("browse");
  const [wizardStep, setWizardStep] = useState(1);

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [selectedPipelineDetails, setSelectedPipelineDetails] = useState<Pipeline | null>(null);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

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
    { id: uid(), key: "first_name", value: "Mahmoud" },
    { id: uid(), key: "last_name", value: "Darawsheh" },
  ]);
  const [webhookSignature, setWebhookSignature] = useState("");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, title: "", message: "", confirmLabel: "Confirm" });
  const canMoveNext = (() => {
    if (!selectedPipelineId) return false;
    if (wizardStep === 2) return steps.length > 0;
    if (wizardStep === 3) return subscribers.length > 0;
    return wizardStep < 4;
  })();
  const toast = (type: "success" | "error", message: string) => {
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  };
  const toastError = (error: unknown, fallback: string) => toast("error", getApiErrorMessage(error, fallback));

  const resetStepForm = () => {
    setEditingStepId(null);
    setStepOrder(1);
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
    const c = (step.stepConfig ?? {}) as any;
    if (step.stepType === "filter") {
      setFilterField(c.field ?? "");
      setFilterOperator(c.operator ?? ">");
      setFilterValue(c.value === undefined || c.value === null ? "" : String(c.value));
    } else if (step.stepType === "transform") {
      setRenameRows(Object.entries(c.rename ?? {}).map(([from, to]) => ({ id: uid(), from, to: String(to) })));
      setAddRows(Object.entries(c.add ?? {}).map(([key, value]) => ({ id: uid(), key, value: String(value) })));
      setRemoveText((c.remove ?? []).join(", "));
    } else {
      setEnrichUrl(c.url ?? "");
      setEnrichTimeoutMs(Number(c.timeoutMs) || 5000);
    }
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

  const loadDashboard = async () => {
    try {
      const [me, list] = await Promise.all([meRequest(), getPipelinesRequest()]);
      setUser(me.data.user as User);
      setPipelines(list);
      if (list.length > 0) setSelectedPipelineId((c) => c || list[0].id);
    } catch (e) {
      toastError(e, "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const loadPipelineData = async (pipelineId: string) => {
    try {
      const [p, s, subs] = await Promise.all([
        getPipelineByIdRequest(pipelineId),
        getPipelineStepsRequest(pipelineId),
        getSubscribersRequest(pipelineId),
      ]);
      setSelectedPipelineDetails(p);
      setSteps(s);
      setSubscribers(subs);
    } catch (e) {
      toastError(e, "Failed to load pipeline details.");
    }
  };

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => {
    if (!selectedPipelineId) {
      setSelectedPipelineDetails(null); setSteps([]); setSubscribers([]); return;
    }
    loadPipelineData(selectedPipelineId);
  }, [selectedPipelineId]);

  const handleLogout = () => { removeToken(); navigate("/login"); };

  const handleCreatePipeline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPipelineName.trim()) return toast("error", "Pipeline name is required.");
    try {
      setWorking(true);
      const pipeline = await createPipelineRequest({ name: newPipelineName.trim() });
      setPipelines((prev) => [pipeline, ...prev]);
      setSelectedPipelineId(pipeline.id);
      setNewPipelineName("");
      toast("success", "Pipeline created successfully.");
      if (mode === "wizard") setWizardStep(2);
    } catch (e) {
      toastError(e, "Failed to create pipeline.");
    } finally { setWorking(false); }
  };

  const handleDeletePipeline = (pipelineId: string) => withConfirm(
    "Delete Pipeline",
    "This action will remove this pipeline and all related data.",
    "Delete Pipeline",
    async () => {
      await deletePipelineRequest(pipelineId);
      const next = pipelines.filter((p) => p.id !== pipelineId);
      setPipelines(next);
      if (selectedPipelineId === pipelineId) setSelectedPipelineId(next[0]?.id ?? "");
      toast("success", "Pipeline deleted successfully.");
    },
    true
  );

  const handleSaveStep = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPipelineId) return toast("error", "Please select a pipeline first.");
    const payload = { stepOrder, stepType, stepConfig: buildStepConfig() };

    const doSave = async () => {
      if (editingStepId) {
        await updatePipelineStepRequest(editingStepId, payload);
        toast("success", "Step updated successfully.");
      } else {
        await createPipelineStepRequest(selectedPipelineId, payload);
        toast("success", "Step added successfully.");
      }
      await loadPipelineData(selectedPipelineId);
      resetStepForm();
    };

    if (editingStepId) {
      withConfirm("Update Step", "Are you sure you want to update this step?", "Update Step", doSave);
      return;
    }

    try { setWorking(true); await doSave(); }
    catch (e) { toastError(e, "Failed to save step."); }
    finally { setWorking(false); }
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
    if (!selectedPipelineId) return toast("error", "Please select a pipeline first.");
    if (!subscriberUrl.trim()) return toast("error", "Subscriber URL is required.");
    try {
      setWorking(true);
      await createSubscriberRequest(selectedPipelineId, { url: subscriberUrl.trim(), secret: subscriberSecret.trim() || undefined });
      await loadPipelineData(selectedPipelineId);
      setSubscriberUrl("");
      setSubscriberSecret("");
      toast("success", "Subscriber added successfully.");
    } catch (e) { toastError(e, "Failed to add subscriber."); }
    finally { setWorking(false); }
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
    const payload = Object.fromEntries(
      webhookPayloadRows
        .filter((row) => row.key.trim())
        .map((row) => [row.key.trim(), parsePrimitive(row.value)])
    );
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
      const sig = await generateHmacSha256Hex(selectedPipelineDetails.webhookSecret, payloadText);
      setWebhookSignature(sig);
      toast("success", "Signature generated from pipeline secret.");
    } catch (e) { toastError(e, "Failed to generate signature."); }
  };

  const handleSendWebhook = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPipelineDetails?.webhookPath) return toast("error", "No pipeline selected.");
    if (!webhookSignature.trim()) return toast("error", "X-Signature is required.");
    const payloadText = buildWebhookPayloadText();
    if (payloadText === "{}") return toast("error", "Add at least one payload field.");

    try {
      setWorking(true);
      const result = await ingestWebhookRequest(selectedPipelineDetails.webhookPath, payloadText, webhookSignature.trim());
      toast("success", `Webhook accepted. Job ID: ${result.job.id}`);
      if (mode === "wizard") { setMode("browse"); setWizardStep(1); }
    } catch (e) { toastError(e, "Failed to send webhook."); }
    finally { setWorking(false); }
  };

  if (loading) return (
    <div className="dashboard-shell"><div className="dashboard-loading-card"><h2>Loading your dashboard...</h2><p>Fetching account and workspace details.</p></div></div>
  );

  return (
    <div className="dashboard-shell">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Webhook Pipeline Platform</p>
            <h1>Welcome back, {user?.username}</h1>
            <p className="dashboard-subtitle">Build your pipeline with blocks, not raw JSON.</p>
          </div>
          <div className="dashboard-actions-row">
            <button className="dashboard-btn" onClick={() => { setMode("wizard"); setWizardStep(1); setSelectedPipelineId(""); resetStepForm(); }}>Create Pipeline (Wizard)</button>
            <button className="dashboard-btn dashboard-btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <section className="dashboard-grid dashboard-grid-main">
          <article className="dashboard-card">
            <h2>My Pipelines</h2>
            <div className="dashboard-list">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className={`dashboard-list-item ${selectedPipelineId === pipeline.id ? "is-active" : ""}`}>
                  <button className="dashboard-list-main" onClick={() => { setSelectedPipelineId(pipeline.id); setMode("browse"); setWizardStep(1); }}>
                    <strong>{pipeline.name}</strong><span>{pipeline.id}</span>
                  </button>
                  <button className="dashboard-danger-link" onClick={() => handleDeletePipeline(pipeline.id)}>Delete</button>
                </div>
              ))}
              {pipelines.length === 0 ? <p className="dashboard-empty">No pipelines yet.</p> : null}
            </div>
          </article>

          <article className="dashboard-card">
            <h2>{mode === "wizard" && wizardStep === 1 ? "Step 1: Create Pipeline" : "Pipeline Details"}</h2>
            {mode === "wizard" && wizardStep === 1 ? (
              <form className="dashboard-form" onSubmit={handleCreatePipeline}>
                <label>Pipeline Name
                  <input className="dashboard-input" value={newPipelineName} onChange={(e) => setNewPipelineName(e.target.value)} placeholder="Order processing pipeline" />
                </label>
                <button className="dashboard-btn" type="submit" disabled={working}>Create and Continue</button>
              </form>
            ) : selectedPipelineDetails ? (
              <div className="dashboard-kv">
                <div><span>Name</span><strong>{selectedPipelineDetails.name}</strong></div>
                <div><span>Webhook Path</span><strong>{selectedPipelineDetails.webhookPath}</strong></div>
                <div><span>Webhook Secret</span><strong className="dashboard-mono">{selectedPipelineDetails.webhookSecret}</strong></div>
              </div>
            ) : <p className="dashboard-empty">Select a pipeline to view details.</p>}
          </article>
        </section>

        {mode === "wizard" ? (
          <section className="dashboard-card">
            <h2>Pipeline Setup Wizard</h2>
            <div className="wizard-steps">
              {wizardLabels.map((label, idx) => {
                const n = idx + 1;
                const klass = n === wizardStep ? "is-active" : n < wizardStep ? "is-done" : "";
                return <div key={label} className={`wizard-step ${klass}`}><span>{n}</span><p>{label}</p></div>;
              })}
            </div>
            <div className="dashboard-actions-row">
              <button className="dashboard-btn dashboard-btn-ghost" onClick={() => setWizardStep((c) => Math.max(1, c - 1))} disabled={wizardStep === 1}>Back</button>
              <button className="dashboard-btn" onClick={() => setWizardStep((c) => Math.min(4, c + 1))} disabled={wizardStep === 4 || !canMoveNext}>Next</button>
              <button className="dashboard-btn dashboard-btn-ghost" onClick={() => { setMode("browse"); setWizardStep(1); }}>Exit Wizard</button>
            </div>
          </section>
        ) : null}

        {(mode === "browse" || wizardStep === 2) ? (
          <section className="dashboard-grid dashboard-grid-main">
            <article className="dashboard-card">
              <h2>{editingStepId ? "Update Step" : "Add Step"}</h2>
              <form className="dashboard-form" onSubmit={handleSaveStep}>
                <div className="step-blocks-grid">
                  <label>Step Order<input className="dashboard-input" type="number" min={1} value={stepOrder} onChange={(e) => setStepOrder(Number(e.target.value) || 1)} /></label>
                  <label>Step Type<select className="dashboard-input" value={stepType} onChange={(e) => setStepType(e.target.value as StepType)}><option value="filter">filter</option><option value="transform">transform</option><option value="enrich_http">enrich_http</option></select></label>
                </div>

                {stepType === "filter" ? <div className="step-blocks-grid"><label>Field<input className="dashboard-input" value={filterField} onChange={(e) => setFilterField(e.target.value)} /></label><label>Operator<select className="dashboard-input" value={filterOperator} onChange={(e) => setFilterOperator(e.target.value as any)}><option value=">">&gt;</option><option value="<">&lt;</option><option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">==</option><option value="!=">!=</option></select></label><label>Value<input className="dashboard-input" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} /></label></div> : null}

                {stepType === "transform" ? <div className="step-blocks-stack">
                  <div className="step-block-card"><div className="step-block-head"><h4>Rename Fields</h4><button type="button" className="dashboard-btn dashboard-btn-ghost" onClick={() => setRenameRows((p) => [...p, { id: uid(), from: "", to: "" }])}>Add Row</button></div>{renameRows.map((r) => <div key={r.id} className="step-row-item"><input className="dashboard-input" value={r.from} onChange={(e) => setRenameRows((p) => p.map((x) => x.id === r.id ? { ...x, from: e.target.value } : x))} placeholder="from" /><input className="dashboard-input" value={r.to} onChange={(e) => setRenameRows((p) => p.map((x) => x.id === r.id ? { ...x, to: e.target.value } : x))} placeholder="to" /><button type="button" className="dashboard-danger-link" onClick={() => setRenameRows((p) => p.filter((x) => x.id !== r.id))}>Remove</button></div>)}{renameRows.length===0?<p className="dashboard-empty">No rename rules yet.</p>:null}</div>
                  <div className="step-block-card"><div className="step-block-head"><h4>Add Fields</h4><button type="button" className="dashboard-btn dashboard-btn-ghost" onClick={() => setAddRows((p) => [...p, { id: uid(), key: "", value: "" }])}>Add Row</button></div>{addRows.map((r) => <div key={r.id} className="step-row-item"><input className="dashboard-input" value={r.key} onChange={(e) => setAddRows((p) => p.map((x) => x.id === r.id ? { ...x, key: e.target.value } : x))} placeholder="field" /><input className="dashboard-input" value={r.value} onChange={(e) => setAddRows((p) => p.map((x) => x.id === r.id ? { ...x, value: e.target.value } : x))} placeholder="value" /><button type="button" className="dashboard-danger-link" onClick={() => setAddRows((p) => p.filter((x) => x.id !== r.id))}>Remove</button></div>)}{addRows.length===0?<p className="dashboard-empty">No add-field rules yet.</p>:null}</div>
                  <div className="step-block-card"><h4>Remove Fields</h4><p className="dashboard-empty">Comma-separated fields.</p><input className="dashboard-input" value={removeText} onChange={(e) => setRemoveText(e.target.value)} placeholder="internalNote, debugInfo" /></div>
                </div> : null}

                {stepType === "enrich_http" ? <div className="step-blocks-grid"><label>URL<input className="dashboard-input" value={enrichUrl} onChange={(e) => setEnrichUrl(e.target.value)} /></label><label>Method<input className="dashboard-input" value="GET" disabled /></label><label>Timeout (ms)<input className="dashboard-input" type="number" min={1000} value={enrichTimeoutMs} onChange={(e) => setEnrichTimeoutMs(Number(e.target.value) || 5000)} /></label></div> : null}

                <div className="dashboard-actions-row"><button className="dashboard-btn" type="submit" disabled={working || !selectedPipelineId}>{editingStepId ? "Update Step" : "Add Step"}</button>{editingStepId ? <button className="dashboard-btn dashboard-btn-ghost" type="button" onClick={resetStepForm}>Cancel Edit</button> : null}</div>
              </form>
            </article>

            <article className="dashboard-card"><h2>Current Steps</h2><div className="dashboard-list">{steps.map((s) => <div key={s.id} className="dashboard-list-item dashboard-list-item-column"><div className="dashboard-step-head"><strong>#{s.stepOrder} - {s.stepType}</strong><div className="dashboard-actions-row"><button className="dashboard-btn dashboard-btn-ghost" onClick={() => fillStepForm(s)}>Edit</button><button className="dashboard-danger-link" onClick={() => handleDeleteStep(s.id)}>Delete</button></div></div><pre className="dashboard-pre">{prettyJson(s.stepConfig)}</pre></div>)}{steps.length===0?<p className="dashboard-empty">No steps yet.</p>:null}</div></article>
          </section>
        ) : null}

        {(mode === "browse" || wizardStep === 3) ? <section className="dashboard-grid dashboard-grid-main"><article className="dashboard-card"><h2>Add Subscriber</h2><form className="dashboard-form" onSubmit={handleCreateSubscriber}><label>URL<input className="dashboard-input" value={subscriberUrl} onChange={(e) => setSubscriberUrl(e.target.value)} placeholder="https://example.com/webhook-receiver" /></label><label>Secret (Optional)<input className="dashboard-input" value={subscriberSecret} onChange={(e) => setSubscriberSecret(e.target.value)} placeholder="subscriber_secret_123" /></label><button className="dashboard-btn" type="submit" disabled={working || !selectedPipelineId}>Add Subscriber</button></form></article><article className="dashboard-card"><h2>Current Subscribers</h2><div className="dashboard-list">{subscribers.map((s) => <div key={s.id} className="dashboard-list-item"><div className="dashboard-list-main-text"><strong>{s.url}</strong><span>{s.id}</span></div><button className="dashboard-danger-link" onClick={() => handleDeleteSubscriber(s.id)}>Delete</button></div>)}{subscribers.length===0?<p className="dashboard-empty">No subscribers yet.</p>:null}</div></article></section> : null}

        {(mode === "browse" || wizardStep === 4) ? (
          <section className="dashboard-card">
            <h2>Test Webhook</h2>
            <form className="dashboard-form" onSubmit={handleSendWebhook}>
              <div className="step-block-card">
                <div className="step-block-head">
                  <h4>Payload Fields</h4>
                  <button type="button" className="dashboard-btn dashboard-btn-ghost" onClick={addWebhookPayloadRow}>
                    Add Field
                  </button>
                </div>
                <div className="step-row-grid step-row-grid-add">
                  {webhookPayloadRows.map((row) => (
                    <div key={row.id} className="step-row-item">
                      <input className="dashboard-input" value={row.key} onChange={(e) => updateWebhookPayloadRow(row.id, { key: e.target.value })} placeholder="field" />
                      <input className="dashboard-input" value={row.value} onChange={(e) => updateWebhookPayloadRow(row.id, { value: e.target.value })} placeholder="value" />
                      <button type="button" className="dashboard-danger-link" onClick={() => removeWebhookPayloadRow(row.id)}>Remove</button>
                    </div>
                  ))}
                  {webhookPayloadRows.length === 0 ? <p className="dashboard-empty">No payload fields yet.</p> : null}
                </div>
              </div>
              <label>
                X-Signature
                <input className="dashboard-input dashboard-mono" value={webhookSignature} onChange={(e) => setWebhookSignature(e.target.value)} placeholder="hex signature" />
              </label>
              <div className="dashboard-actions-row">
                <button className="dashboard-btn dashboard-btn-ghost" type="button" onClick={handleGenerateSignature} disabled={!selectedPipelineDetails}>Generate from Secret</button>
                <button className="dashboard-btn" type="submit" disabled={working || !selectedPipelineDetails}>Send Webhook</button>
              </div>
            </form>
          </section>
        ) : null}
      </div>

      <div className="toast-stack">{toasts.map((t) => <div key={t.id} className={`toast-item toast-${t.type}`}>{t.message}</div>)}</div>
      {confirmState.open ? <div className="confirm-overlay"><div className="confirm-modal"><h3>{confirmState.title}</h3><p>{confirmState.message}</p><div className="confirm-actions"><button className="dashboard-btn dashboard-btn-ghost" onClick={() => setConfirmState({ open: false, title: "", message: "", confirmLabel: "Confirm" })}>Cancel</button><button className={`dashboard-btn ${confirmState.danger ? "dashboard-btn-danger" : ""}`} onClick={runConfirm} disabled={working}>{confirmState.confirmLabel}</button></div></div></div> : null}
    </div>
  );
}











