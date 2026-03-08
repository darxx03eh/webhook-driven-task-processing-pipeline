import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { meRequest } from "../api/auth.api";
import { removeToken } from "../utils/token";
import "../assets/css/dashboard.css";

type User = {
    id: string;
    username: string;
    email: string;
};

export default function DashboardPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    async function loadCurrentUser() {
        try {
            const response = await meRequest();
            setUser(response.data.user);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to fetch user");
        } finally {
            setLoading(false);
        }
    }

    function handleLogout() {
        removeToken();
        navigate("/login");
    }

    useEffect(() => {
        loadCurrentUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    if (error) {
        return (
            <div className="dashboard-shell">
                <div className="dashboard-error-card">
                    <h2>We could not load your dashboard</h2>
                    <p>{error}</p>
                    <button className="dashboard-btn" onClick={handleLogout}>
                        Go to login
                    </button>
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
                            Manage your pipelines, monitor jobs, and keep deliveries reliable.
                        </p>
                    </div>
                    <button className="dashboard-btn dashboard-btn-ghost" onClick={handleLogout}>
                        Logout
                    </button>
                </header>

                <section className="dashboard-grid dashboard-grid-stats">
                    <article className="dashboard-card dashboard-stat-card">
                        <p className="dashboard-stat-label">Pipelines</p>
                        <h3>0</h3>
                        <span>Start by creating your first pipeline.</span>
                    </article>

                    <article className="dashboard-card dashboard-stat-card">
                        <p className="dashboard-stat-label">Jobs (24h)</p>
                        <h3>0</h3>
                        <span>No jobs processed yet.</span>
                    </article>

                    <article className="dashboard-card dashboard-stat-card">
                        <p className="dashboard-stat-label">Delivery Success</p>
                        <h3>0%</h3>
                        <span>Will update once deliveries start.</span>
                    </article>
                </section>

                <section className="dashboard-grid dashboard-grid-main">
                    <article className="dashboard-card">
                        <h2>Account</h2>
                        <div className="dashboard-account-row">
                            <span>Username</span>
                            <strong>{user?.username}</strong>
                        </div>
                        <div className="dashboard-account-row">
                            <span>Email</span>
                            <strong>{user?.email}</strong>
                        </div>
                    </article>

                    <article className="dashboard-card">
                        <h2>Quick Start</h2>
                        <ol className="dashboard-steps">
                            <li>Create a pipeline and set webhook secret.</li>
                            <li>Add steps: filter, transform, and enrichment.</li>
                            <li>Attach subscribers and test with webhook payloads.</li>
                        </ol>
                    </article>
                </section>
            </div>
        </div>
    );
}
