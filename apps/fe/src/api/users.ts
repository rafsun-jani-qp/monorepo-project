import { apiRequest } from "./client";
import type { User } from "../types/user";

export interface UsersQuery {
  userName?: string;
  loginCount?: number;
}

/** GET /api/users - requires auth. Both params are optional search/filter. */
export function getUsers(token: string, query: UsersQuery = {}): Promise<User[]> {
  const params = new URLSearchParams();
  if (query.userName) params.set("userName", query.userName);
  if (query.loginCount !== undefined && !Number.isNaN(query.loginCount)) {
    params.set("loginCount", String(query.loginCount));
  }

  const qs = params.toString();
  return apiRequest<User[]>(`/api/users${qs ? `?${qs}` : ""}`, { token });
}
