import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginRequest } from "../api/auth.api";
import { saveToken } from "../utils/token";
import "../assets/css/auth.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    }
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await loginRequest(formData);
            const token = response?.data?.token;
            if (token) {
                saveToken(token);
                navigate("/dashboard");
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="auth-layout">
            <section className="auth-brand">
                <div className="auth-badge">Webhook Pipeline Platform</div>
                <h1 className="auth-heading">
                    Monitor and control your <span>webhook workflows</span>
                </h1>
                <p className="auth-description">
                    Sign in to manage pipelines, inspect jobs, and track subscriber
                    deliveries from one place.
                </p>
                <div className="auth-feature-list">
                    <div className="auth-feature">
                        <div className="auth-feature-dot" />
                        <div>
                            <strong>Job visibility</strong>
                            <p>See what was received, processed, filtered, or delivered.</p>
                        </div>
                    </div>
                    <div className="auth-feature">
                        <div className="auth-feature-dot" />
                        <div>
                            <strong>Multi-step processing</strong>
                            <p>Run filter, transform, and HTTP enrichment in order.</p>
                        </div>
                    </div>
                    <div className="auth-feature">
                        <div className="auth-feature-dot" />
                        <div>
                            <strong>Secure access</strong>
                            <p>JWT-based authentication for protected dashboard routes.</p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="auth-panel">
                <div className="auth-card">
                    <div className="auth-card-top">
                        <h1 className="auth-title">Welcome back</h1>
                        <p className="auth-subtitle">
                            Login to continue to your dashboard.
                        </p>
                    </div>
                    <form className="auth-form" onSubmit={handleSubmit}>
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
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        <button className="auth-button" type="submit" disabled={loading}>
                            {loading ? "Signing in..." : "Login"}
                        </button>
                    </form>
                    {error && <p className="auth-error">{error}</p>}
                    <p className="auth-footer">
                        Don&apos;t have an account?{" "}
                        <Link className="auth-link" to="/register">
                            Register
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}