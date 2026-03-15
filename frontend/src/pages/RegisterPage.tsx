import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../api/auth.api";
import { buildRateLimitMessage, getApiErrorMessage, getRetryAfterSeconds } from "../utils/api-error";
import { saveToken } from "../utils/token";
import "../assets/css/auth.css";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);

    useEffect(() => {
        if (rateLimitSecondsLeft <= 0) return;
        const timer = window.setInterval(() => {
            setRateLimitSecondsLeft((previous) => (previous > 0 ? previous - 1 : 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [rateLimitSecondsLeft]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (rateLimitSecondsLeft > 0) return;
        setError("");
        setLoading(true);
        try {
            const response = await registerRequest(formData);
            const token = response?.data?.token;
            if (token) {
                saveToken(token);
                navigate("/dashboard");
            }
        } catch (err: unknown) {
            const retryAfter = getRetryAfterSeconds(err);
            if (retryAfter) {
                setRateLimitSecondsLeft(retryAfter);
            }
            const fallback = buildRateLimitMessage("Too many registration attempts.", retryAfter);
            setError(getApiErrorMessage(err, fallback || "Registration failed"));
        } finally {
            setLoading(false);
        }
    }

    const submitDisabled = loading || rateLimitSecondsLeft > 0;

    return (
        <div className="auth-layout">
            <section className="auth-brand">
                <div className="auth-badge">Webhook Pipeline Platform</div>
                <h1 className="auth-heading">
                    Build and manage your <span>automation pipelines</span>
                </h1>
                <p className="auth-description">
                    Receive webhooks, process them through configurable steps, and deliver
                    results to subscribers with clean tracking and retry logic.
                </p>
                <div className="auth-feature-list">
                    <div className="auth-feature">
                        <div className="auth-feature-dot" />
                        <div>
                            <strong>Structured pipelines</strong>
                            <p>Define processing steps like filter, transform, and enrich.</p>
                        </div>
                    </div>
                    <div className="auth-feature">
                        <div className="auth-feature-dot" />
                        <div>
                            <strong>Reliable delivery</strong>
                            <p>Track jobs and delivery attempts with retry support.</p>
                        </div>
                    </div>
                    <div className="auth-feature">
                        <div className="auth-feature-dot" />
                        <div>
                            <strong>Developer-friendly dashboard</strong>
                            <p>Manage endpoints, subscribers, and execution history.</p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="auth-panel">
                <div className="auth-card">
                    <div className="auth-card-top">
                        <h1 className="auth-title">Create account</h1>
                        <p className="auth-subtitle">
                            Register to start building your webhook pipelines.
                        </p>
                    </div>
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label className="auth-label" htmlFor="username">
                                Username
                            </label>
                            <input
                                id="username"
                                className="auth-input"
                                name="username"
                                placeholder="Enter your username"
                                value={formData.username}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="auth-field">
                            <label className="auth-label" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                className="auth-input"
                                name="email"
                                type="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="auth-field">
                            <label className="auth-label" htmlFor="password">
                                Password
                            </label>
                            <input
                                id="password"
                                className="auth-input"
                                name="password"
                                type="password"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        <button className="auth-button" type="submit" disabled={submitDisabled}>
                            {loading ? "Creating account..." : rateLimitSecondsLeft > 0 ? `Try again in ${rateLimitSecondsLeft}s` : "Register"}
                        </button>
                    </form>
                    {error && <p className="auth-error">{error}</p>}
                    <p className="auth-footer">
                        Already have an account?{" "}
                        <Link className="auth-link" to="/login">
                            Login
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}
