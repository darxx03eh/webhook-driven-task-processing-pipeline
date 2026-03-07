import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { isAuthenticated } from "../utils/token";
type Props = {
    children: ReactNode;
};
export default function ProtectedRoute({ children }: Props) {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    return children;
}