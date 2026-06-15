import axios, { AxiosInstance } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Inject auth token from storage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("radius_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("radius_token");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

// ─── API methods ──────────────────────────────────────────────────────────────

import type {
  AuthResponse,
  ChatHistory,
  InterestResponse,
  MapZonesResponse,
  Match,
  Message,
  NearbyResponse,
  Profile,
  User,
} from "@/types";

export const authApi = {
  telegramAuth: (initData: string) =>
    api.post<AuthResponse>("/auth/telegram", { init_data: initData }),
};

export const profileApi = {
  getMe: () => api.get<User>("/profile/me"),
  update: (data: Partial<Profile>) => api.put<User>("/profile/update", data),
  getById: (userId: string) => api.get<User>(`/profile/${userId}`),
};

export const geoApi = {
  updateLocation: (lat: number, lng: number, accuracy?: number) =>
    api.post("/location/update", { latitude: lat, longitude: lng, accuracy }),
  getNearby: (lat: number, lng: number, radius = 1000, mode?: string) =>
    api.get<NearbyResponse>("/location/nearby", {
      params: { latitude: lat, longitude: lng, radius, mode },
    }),
  getZones: (lat: number, lng: number) =>
    api.get<MapZonesResponse>("/location/zones", {
      params: { latitude: lat, longitude: lng },
    }),
};

export const interactionApi = {
  sendInterest: (toUserId: string) =>
    api.post<InterestResponse>("/interest", { to_user_id: toUserId }),
  getMatches: () => api.get<Match[]>("/matches"),
};

export const chatApi = {
  getHistory: (matchId: string, offset = 0, limit = 50) =>
    api.get<ChatHistory>(`/chat/${matchId}`, { params: { offset, limit } }),
  sendMessage: (matchId: string, text: string) =>
    api.post<Message>("/message", { match_id: matchId, text }),
};
