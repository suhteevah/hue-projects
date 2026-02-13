import { api } from './client';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: AuthUser;
}

export function login(username: string, password: string) {
  return api.post<LoginResponse>('/auth/login', { username, password });
}

export function register(username: string, password: string) {
  return api.post<LoginResponse>('/auth/register', { username, password });
}

export function getAuthMe() {
  return api.get<AuthStatusResponse>('/auth/me');
}
