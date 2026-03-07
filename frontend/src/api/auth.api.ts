import { apiClient } from "./client";

type RegisterPayload = {
    username: string;
    email: string;
    password: string;
};

type LoginPayload = {
    email: string;
    password: string;
};

export const registerRequest = async (payload: RegisterPayload) => {
    const response = await apiClient.post("/auth/register", payload);
    return response.data;
}

export const loginRequest = async (payload: LoginPayload) => {
    const response = await apiClient.post("/auth/login", payload);
    return response.data;
}

export const meRequest = async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
}