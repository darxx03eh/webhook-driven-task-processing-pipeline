import { useEffect, useMemo, useState } from "react";
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
import { removeToken } from "../utils/token";
import { getApiErrorMessage } from "../utils/api-error";
import "../assets/css/dashboard.css";

type User = {
    id: string;
    username: string;
    email: string;
};

type Flash = {
    type: "success" | "error";
    message: string;
} | null;

const defaultWebhookPayload = JSON.stringify(
    {
        product: "pizza",
        price: 75,
        ip: "8.8.8.8",
        first_name: "Mahmoud",
        last_name: "Darawsheh",
    },
    null,
    2
);

const defaultStepConfigByType: Record<StepType, string> = {
    filter: JSON.stringify(
        {
            field: "price",
            operator: ">",
            value: 20,
        },
        null,
        2
    ),
    transform: JSON.stringify(
        {
            rename: {
                first_name: "firstName",
                last_name: "lastName",
            },
        },
        null,
        2
    ),
    enrich_http: JSON.stringify(
        {
            url: "https://ipinfo.io/{{ip}}/json",
            method: "GET",
            timeoutMs: 5000,
        },
        null,
        2
    ),
};

const toPrettyJson = (value: unknown): string => JSON.stringify(value ?? {}, null, 2);

async function generateHmacSha256Hex(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export default function DashboardPage() {
    const navigate = useNavigate();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
    const [selectedPipelineDetails, setSelectedPipelineDetails] = useState<Pipeline | null>(null);
    const [steps, setSteps] = useState<PipelineStep[]>([]);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

    const [newPipelineName, setNewPipelineName] = useState("");

    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [stepOrder, setStepOrder] = useState(1);
    const [stepType, setStepType] = useState<StepType>("filter");
    const [stepConfigText, setStepConfigText] = useState(defaultStepConfigByType.filter);

    const [subscriberUrl, setSubscriberUrl] = useState("");
    const [subscriberSecret, setSubscriberSecret] = useState("");

    const [webhookPayloadText, setWebhookPayloadText] = useState(defaultWebhookPayload);
    const [webhookSignature, setWebhookSignature] = useState("");

    const [flash, setFlash] = useState<Flash>(null);
    const [working, setWorking] = useState(false);

    const selectedPipeline = useMemo(
        () => pipelines.find((p) => p.id === selectedPipelineId) ?? null,
        [pipelines, selectedPipelineId]
    );

    function showSuccess(message: string) {
        setFlash({ type: "success", message });
    }

    function showError(error: unknown, fallback: string) {
        setFlash({ type: "error", message: getApiErrorMessage(error, fallback) });
    }

    function handleLogout() {
        removeToken();
        navigate("/login");
    }

    async function loadCurrentUserAndPipelines() {
        try {
            const [meResponse, pipelineList] = await Promise.all([meRequest(), getPipelinesRequest()]);
            setUser(meResponse.data.user as User);
            setPipelines(pipelineList);

            if (pipelineList.length > 0) {
                setSelectedPipelineId((current) => current || pipelineList[0].id);
            }
        } catch (error: unknown) {
            showError(error, "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }

    async function loadPipelineRelatedData(pipelineId: string) {
        try {
            const [pipeline, pipelineSteps, pipelineSubscribers] = await Promise.all([
                getPipelineByIdRequest(pipelineId),
                getPipelineStepsRequest(pipelineId),
                getSubscribersRequest(pipelineId),
            ]);
            setSelectedPipelineDetails(pipeline);
            setSteps(pipelineSteps);
            setSubscribers(pipelineSubscribers);
        } catch (error: unknown) {
            showError(error, "Failed to load selected pipeline details");
        }
    }

    useEffect(() => {
        loadCurrentUserAndPipelines();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!selectedPipelineId) {
            setSelectedPipelineDetails(null);
            setSteps([]);
            setSubscribers([]);
            return;
        }

        loadPipelineRelatedData(selectedPipelineId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPipelineId]);

    async function handleCreatePipeline(event: React.FormEvent) {
        event.preventDefault();
        if (!newPipelineName.trim()) {
            setFlash({ type: "error", message: "Pipeline name is required" });
            return;
        }

        setWorking(true);
        try {
            const pipeline = await createPipelineRequest({ name: newPipelineName.trim() });
            setPipelines((prev) => [pipeline, ...prev]);
            setSelectedPipelineId(pipeline.id);
            setNewPipelineName("");
            showSuccess("Pipeline created successfully");
        } catch (error: unknown) {
            showError(error, "Failed to create pipeline");
        } finally {
            setWorking(false);
        }
    }

    async function handleDeletePipeline(pipelineId: string) {
        setWorking(true);
        try {
            await deletePipelineRequest(pipelineId);
            const nextPipelines = pipelines.filter((p) => p.id !== pipelineId);
            setPipelines(nextPipelines);

            if (selectedPipelineId === pipelineId) {
                setSelectedPipelineId(nextPipelines[0]?.id ?? "");
            }

            showSuccess("Pipeline deleted successfully");
        } catch (error: unknown) {
            showError(error, "Failed to delete pipeline");
        } finally {
            setWorking(false);
        }
    }

    function resetStepForm(type: StepType = "filter") {
        setEditingStepId(null);
        setStepOrder(1);
        setStepType(type);
        setStepConfigText(defaultStepConfigByType[type]);
    }

    function handleStartEditStep(step: PipelineStep) {
        setEditingStepId(step.id);
        setStepOrder(step.stepOrder);
        setStepType(step.stepType);
        setStepConfigText(toPrettyJson(step.stepConfig));
    }

    async function handleSaveStep(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedPipelineId) {
            setFlash({ type: "error", message: "Select a pipeline first" });
            return;
        }

        let parsedConfig: unknown;
        try {
            parsedConfig = JSON.parse(stepConfigText);
        } catch {
            setFlash({ type: "error", message: "Step config must be valid JSON" });
            return;
        }

        setWorking(true);
        try {
            const payload = {
                stepOrder,
                stepType,
                stepConfig: parsedConfig,
            };

            if (editingStepId) {
                await updatePipelineStepRequest(editingStepId, payload);
                showSuccess("Step updated successfully");
            } else {
                await createPipelineStepRequest(selectedPipelineId, payload);
                showSuccess("Step created successfully");
            }

            await loadPipelineRelatedData(selectedPipelineId);
            resetStepForm(stepType);
        } catch (error: unknown) {
            showError(error, "Failed to save step");
        } finally {
            setWorking(false);
        }
    }

    async function handleDeleteStep(stepId: string) {
        if (!selectedPipelineId) return;
        setWorking(true);
        try {
            await deletePipelineStepRequest(stepId);
            await loadPipelineRelatedData(selectedPipelineId);
            showSuccess("Step deleted successfully");
        } catch (error: unknown) {
            showError(error, "Failed to delete step");
        } finally {
            setWorking(false);
        }
    }

    async function handleAddSubscriber(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedPipelineId) {
            setFlash({ type: "error", message: "Select a pipeline first" });
            return;
        }

        if (!subscriberUrl.trim()) {
            setFlash({ type: "error", message: "Subscriber URL is required" });
            return;
        }

        setWorking(true);
        try {
            await createSubscriberRequest(selectedPipelineId, {
                url: subscriberUrl.trim(),
                secret: subscriberSecret.trim() || undefined,
            });
            await loadPipelineRelatedData(selectedPipelineId);
            setSubscriberUrl("");
            setSubscriberSecret("");
            showSuccess("Subscriber added successfully");
        } catch (error: unknown) {
            showError(error, "Failed to add subscriber");
        } finally {
            setWorking(false);
        }
    }

    async function handleDeleteSubscriber(subscriberId: string) {
        if (!selectedPipelineId) return;
        setWorking(true);
        try {
            await deleteSubscriberRequest(subscriberId);
            await loadPipelineRelatedData(selectedPipelineId);
            showSuccess("Subscriber deleted successfully");
        } catch (error: unknown) {
            showError(error, "Failed to delete subscriber");
        } finally {
            setWorking(false);
        }
    }

    async function handleGenerateSignature() {
        if (!selectedPipelineDetails?.webhookSecret) {
            setFlash({ type: "error", message: "Select a pipeline with secret first" });
            return;
        }

        try {
            const signature = await generateHmacSha256Hex(
                selectedPipelineDetails.webhookSecret,
                webhookPayloadText
            );
            setWebhookSignature(signature);
            showSuccess("Signature generated from pipeline secret");
        } catch (error: unknown) {
            showError(error, "Failed to generate signature");
        }
    }

    async function handleSendWebhook(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedPipelineDetails?.webhookPath) {
            setFlash({ type: "error", message: "Select a pipeline first" });
            return;
        }

        if (!webhookSignature.trim()) {
            setFlash({ type: "error", message: "X-Signature is required" });
            return;
        }

        try {
            JSON.parse(webhookPayloadText);
        } catch {
            setFlash({ type: "error", message: "Webhook payload must be valid JSON" });
            return;
        }

        setWorking(true);
        try {
            const result = await ingestWebhookRequest(
                selectedPipelineDetails.webhookPath,
                webhookPayloadText,
                webhookSignature.trim()
            );
            showSuccess(`Webhook accepted. Job ID: ${result.job.id}`);
        } catch (error: unknown) {
            showError(error, "Failed to ingest webhook");
        } finally {
            setWorking(false);
        }
    }

    if (loading) {
        return (
            <div className="dashboard-shell">
                <div className="dashboard-loading-card">
                    <h2>Loading your dashboard...</h2>
                    <p>Fetching account and workspace details.</p>
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
                        <p className="dashboard-subtitle">
                            Build pipelines, configure steps, attach subscribers, and test webhooks.
                        </p>
                    </div>
                    <button className="dashboard-btn dashboard-btn-ghost" onClick={handleLogout}>
                        Logout
                    </button>
                </header>

                {flash ? (
                    <div className={`dashboard-flash dashboard-flash-${flash.type}`}>{flash.message}</div>
                ) : null}

                <section className="dashboard-grid dashboard-grid-stats">
                    <article className="dashboard-card dashboard-stat-card">
                        <p className="dashboard-stat-label">Pipelines</p>
                        <h3>{pipelines.length}</h3>
                        <span>Total pipelines under your account.</span>
                    </article>

                    <article className="dashboard-card dashboard-stat-card">
                        <p className="dashboard-stat-label">Steps</p>
                        <h3>{steps.length}</h3>
                        <span>Configured for the selected pipeline.</span>
                    </article>

                    <article className="dashboard-card dashboard-stat-card">
                        <p className="dashboard-stat-label">Subscribers</p>
                        <h3>{subscribers.length}</h3>
                        <span>Active destinations for deliveries.</span>
                    </article>
                </section>

                <section className="dashboard-grid dashboard-grid-main">
                    <article className="dashboard-card">
                        <h2>Pipelines</h2>

                        <form className="dashboard-inline-form" onSubmit={handleCreatePipeline}>
                            <input
                                className="dashboard-input"
                                value={newPipelineName}
                                onChange={(e) => setNewPipelineName(e.target.value)}
                                placeholder="Order processing pipeline"
                            />
                            <button className="dashboard-btn" type="submit" disabled={working}>
                                Create
                            </button>
                        </form>

                        <div className="dashboard-list">
                            {pipelines.map((pipeline) => (
                                <div
                                    key={pipeline.id}
                                    className={`dashboard-list-item ${
                                        selectedPipelineId === pipeline.id ? "is-active" : ""
                                    }`}
                                >
                                    <button
                                        className="dashboard-list-main"
                                        onClick={() => setSelectedPipelineId(pipeline.id)}
                                    >
                                        <strong>{pipeline.name}</strong>
                                        <span>{pipeline.id}</span>
                                    </button>
                                    <button
                                        className="dashboard-danger-link"
                                        onClick={() => handleDeletePipeline(pipeline.id)}
                                        disabled={working}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                            {pipelines.length === 0 ? <p className="dashboard-empty">No pipelines yet.</p> : null}
                        </div>
                    </article>

                    <article className="dashboard-card">
                        <h2>Selected Pipeline</h2>
                        {selectedPipeline ? (
                            <div className="dashboard-kv">
                                <div>
                                    <span>Name</span>
                                    <strong>{selectedPipeline.name}</strong>
                                </div>
                                <div>
                                    <span>Webhook Path</span>
                                    <strong>{selectedPipelineDetails?.webhookPath ?? "-"}</strong>
                                </div>
                                <div>
                                    <span>Webhook Secret</span>
                                    <strong className="dashboard-mono">
                                        {selectedPipelineDetails?.webhookSecret ?? "-"}
                                    </strong>
                                </div>
                            </div>
                        ) : (
                            <p className="dashboard-empty">Select a pipeline to continue.</p>
                        )}
                    </article>
                </section>

                <section className="dashboard-grid dashboard-grid-main">
                    <article className="dashboard-card">
                        <h2>{editingStepId ? "Update Step" : "Add Step"}</h2>
                        <form className="dashboard-form" onSubmit={handleSaveStep}>
                            <label>
                                Step order
                                <input
                                    className="dashboard-input"
                                    type="number"
                                    min={1}
                                    value={stepOrder}
                                    onChange={(e) => setStepOrder(Number(e.target.value) || 1)}
                                />
                            </label>
                            <label>
                                Step type
                                <select
                                    className="dashboard-input"
                                    value={stepType}
                                    onChange={(e) => {
                                        const nextType = e.target.value as StepType;
                                        setStepType(nextType);
                                        if (!editingStepId) {
                                            setStepConfigText(defaultStepConfigByType[nextType]);
                                        }
                                    }}
                                >
                                    <option value="filter">filter</option>
                                    <option value="transform">transform</option>
                                    <option value="enrich_http">enrich_http</option>
                                </select>
                            </label>
                            <label>
                                Step config (JSON)
                                <textarea
                                    className="dashboard-input dashboard-textarea"
                                    value={stepConfigText}
                                    onChange={(e) => setStepConfigText(e.target.value)}
                                />
                            </label>
                            <div className="dashboard-actions-row">
                                <button className="dashboard-btn" type="submit" disabled={working || !selectedPipelineId}>
                                    {editingStepId ? "Update Step" : "Add Step"}
                                </button>
                                {editingStepId ? (
                                    <button
                                        className="dashboard-btn dashboard-btn-ghost"
                                        type="button"
                                        onClick={() => resetStepForm(stepType)}
                                    >
                                        Cancel Edit
                                    </button>
                                ) : null}
                            </div>
                        </form>
                    </article>

                    <article className="dashboard-card">
                        <h2>Pipeline Steps</h2>
                        <div className="dashboard-list">
                            {steps.map((step) => (
                                <div key={step.id} className="dashboard-list-item dashboard-list-item-column">
                                    <div className="dashboard-step-head">
                                        <strong>
                                            #{step.stepOrder} - {step.stepType}
                                        </strong>
                                        <div className="dashboard-actions-row">
                                            <button
                                                className="dashboard-btn dashboard-btn-ghost"
                                                onClick={() => handleStartEditStep(step)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="dashboard-danger-link"
                                                onClick={() => handleDeleteStep(step.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <pre className="dashboard-pre">{toPrettyJson(step.stepConfig)}</pre>
                                </div>
                            ))}
                            {steps.length === 0 ? <p className="dashboard-empty">No steps for this pipeline.</p> : null}
                        </div>
                    </article>
                </section>

                <section className="dashboard-grid dashboard-grid-main">
                    <article className="dashboard-card">
                        <h2>Add Subscriber</h2>
                        <form className="dashboard-form" onSubmit={handleAddSubscriber}>
                            <label>
                                URL
                                <input
                                    className="dashboard-input"
                                    value={subscriberUrl}
                                    onChange={(e) => setSubscriberUrl(e.target.value)}
                                    placeholder="https://example.com/webhook-receiver"
                                />
                            </label>
                            <label>
                                Secret (optional)
                                <input
                                    className="dashboard-input"
                                    value={subscriberSecret}
                                    onChange={(e) => setSubscriberSecret(e.target.value)}
                                    placeholder="subscriber_secret_123"
                                />
                            </label>
                            <button className="dashboard-btn" type="submit" disabled={working || !selectedPipelineId}>
                                Add Subscriber
                            </button>
                        </form>
                    </article>

                    <article className="dashboard-card">
                        <h2>Subscribers</h2>
                        <div className="dashboard-list">
                            {subscribers.map((subscriber) => (
                                <div key={subscriber.id} className="dashboard-list-item">
                                    <div className="dashboard-list-main-text">
                                        <strong>{subscriber.url}</strong>
                                        <span>{subscriber.id}</span>
                                    </div>
                                    <button
                                        className="dashboard-danger-link"
                                        onClick={() => handleDeleteSubscriber(subscriber.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                            {subscribers.length === 0 ? (
                                <p className="dashboard-empty">No subscribers for this pipeline.</p>
                            ) : null}
                        </div>
                    </article>
                </section>

                <section className="dashboard-card">
                    <h2>Webhook Test</h2>
                    <form className="dashboard-form" onSubmit={handleSendWebhook}>
                        <label>
                            Payload JSON
                            <textarea
                                className="dashboard-input dashboard-textarea dashboard-textarea-large"
                                value={webhookPayloadText}
                                onChange={(e) => setWebhookPayloadText(e.target.value)}
                            />
                        </label>
                        <label>
                            X-Signature
                            <input
                                className="dashboard-input dashboard-mono"
                                value={webhookSignature}
                                onChange={(e) => setWebhookSignature(e.target.value)}
                                placeholder="hex signature"
                            />
                        </label>
                        <div className="dashboard-actions-row">
                            <button
                                type="button"
                                className="dashboard-btn dashboard-btn-ghost"
                                onClick={handleGenerateSignature}
                                disabled={!selectedPipelineDetails}
                            >
                                Generate from Secret
                            </button>
                            <button className="dashboard-btn" type="submit" disabled={working || !selectedPipelineDetails}>
                                Send Webhook
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}
