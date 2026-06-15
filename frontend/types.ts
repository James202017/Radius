export interface NearbyUser {
  user_id: string; // UUID
  name: string;
  avatar?: string;
  age?: number;
  bio?: string;
  interests: string[];
  mode: string;
  distance_bucket: string;
  is_online: boolean;
}

export interface Match {
  id: string; // UUID
  other_user: NearbyUser;
  created_at: string; // datetime
  last_message?: string;
}

export interface ZoneCluster {
  zone_name: string;
  user_count: number;
  radius_meters: number;
}

export type UserMode = "friends" | "dating" | "business" | "travel";

export type DistanceBucket = "50m" | "100m" | "500m" | "1km" | "—";

export interface Profile {
  user_id: string;
  age: number | null;
  bio: string | null;
  interests: string[];
  mode: UserMode;
  gender: string | null;
  show_gender: boolean;
  is_visible: boolean;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  profile: Profile | null;
  created_at: string;
}

export interface NearbyResponse {
  users: NearbyUser[];
  total: number;
  radius_meters: number;
}

export interface MapZonesResponse {
  zones: ZoneCluster[];
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatHistory {
  messages: Message[];
  match_id: string;
  total: number;
}

export interface InterestResponse {
  is_match: boolean;
  match_id: string | null;
  message: string;
}

export interface AuthResponse {
  access_token: string;
  user_id: string;
  is_new_user: boolean;
}

// WebSocket message types
export type WSMessageType = "message" | "typing" | "match" | "ping" | "pong" | "joined" | "error";

export interface WSEvent {
  type: WSMessageType;
  data?: Record<string, unknown>;
  match_id?: string;
  user_id?: string;
  text?: string;
}