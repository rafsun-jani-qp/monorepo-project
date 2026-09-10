import { apiRequest } from "./client";
import type { User } from "../types/user";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

/** POST /auth/login - public. */
export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", { method: "POST", body: payload });
}

export interface RegisterPayload {
  name: string;
  email: string;
  userName: string;
  location: string;
  password: string;
}

/** POST /api/users - public. */
export function register(payload: RegisterPayload): Promise<User> {
  return apiRequest<User>("/api/users", { method: "POST", body: payload });
}
