import { useEffect, useState } from "react";
import { meRequest } from "../api/auth.api";
import { removeToken } from "../utils/token";
import { useNavigate } from "react-router-dom";
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
    }, []);
    if (loading) return <p>Loading...</p>;
    if (error) {
        return (
            <div>
                <p>{error}</p>
                <button onClick={handleLogout}>Go to login</button>
            </div>
        );
    }
    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome, {user?.username}</p>
            <p>{user?.email}</p>
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
}