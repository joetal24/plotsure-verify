/**
 * API service layer — all calls to the FastAPI backend.
 * Automatically attaches Supabase JWT for authentication.
 */
import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface RegisterResponse {
  user_id: string;
  email: string;
  confirmed: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new Error("Session expired. Please log in again.");
    }
    return {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    };
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }

  return res.json();
}

async function publicApiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export async function registerLocalUser(
  data: RegisterRequest
): Promise<RegisterResponse> {
  return publicApiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Verification ---
export interface VerifyRequest {
  search_method: "title" | "parcel";
  volume?: string;
  folio?: string;
  county?: string;
  district?: string;
  block_number?: string;
  plot_number?: string;
  land_type: "Freehold" | "Leasehold" | "Mailo";
  plot_size: number;
  plot_size_unit: string;
  asking_price?: number;
}

export interface VerifyResponse {
  id: string;
  plot_reference: string;
  location: string;
  owner: string;
  title_status: string;
  encumbrances: string[];
  transfer_count: number;
  last_transfer_date: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  price_min: number;
  price_max: number;
  land_type: string;
  plot_size: number;
  plot_size_unit: string;
  created_at: string;
  is_cached?: boolean;
  is_stale?: boolean;
  fraud_score?: number;
  fraud_risk_level?: "LOW" | "MEDIUM" | "HIGH";
  anomaly_flags?: string[];
}

export interface FraudScoreRequest {
  plot_size: number;
  asking_price: number;
  district: string;
  land_type: string;
  verification_count: number;
  days_since_last_transfer: number;
}

export interface FraudScoreResponse {
  fraud_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  anomaly_flags: string[];
}

export async function verifyPlot(data: VerifyRequest): Promise<VerifyResponse> {
  return apiFetch<VerifyResponse>("/verify", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getFraudScore(
  data: FraudScoreRequest
): Promise<FraudScoreResponse> {
  return apiFetch<FraudScoreResponse>("/api/v1/ml/fraud-score", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface GeocodeResponse {
  lat: number;
  lng: number;
  display_name: string;
  polygon_geojson?: Record<string, unknown> | null;
}

export async function geocodeLocation(
  district: string,
  county?: string
): Promise<GeocodeResponse> {
  const params = new URLSearchParams({ district, ...(county ? { county } : {}) });
  return publicApiFetch<GeocodeResponse>(`/api/v1/gis/geocode?${params.toString()}`);
}

export async function getVerification(id: string): Promise<VerifyResponse> {
  return apiFetch<VerifyResponse>(`/verify/${id}`);
}

// --- History ---
export interface SearchHistoryItem {
  id: string;
  plot_reference: string;
  location: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  price_min: number;
  price_max: number;
  created_at: string;
}

export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  return apiFetch<SearchHistoryItem[]>("/history");
}

// --- Certificates ---
export interface CertificateResponse {
  id: string;
  search_id: string;
  user_id: string;
  hash: string;
  file_url: string | null;
  created_at: string;
}

export interface CertificateVerifyResponse {
  valid: boolean;
  certificate?: CertificateResponse;
  search?: VerifyResponse;
}

export async function createCertificate(
  searchId: string
): Promise<CertificateResponse> {
  return apiFetch<CertificateResponse>(`/certificates/${searchId}`, {
    method: "POST",
  });
}

export async function getCertificate(
  certId: string
): Promise<CertificateResponse> {
  return apiFetch<CertificateResponse>(`/certificates/${certId}`);
}

export async function verifyCertificateByHash(
  hash: string
): Promise<CertificateVerifyResponse> {
  // Public endpoint — no auth needed
  const res = await fetch(`${API_BASE}/certificates/verify/${hash}`);
  if (!res.ok) {
    throw new Error("Certificate verification failed");
  }
  return res.json();
}
