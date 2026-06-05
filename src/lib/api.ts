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
  roles?: string[];
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    signal: controller.signal,
    headers: { ...headers, ...options.headers },
  });
  clearTimeout(timeout);

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
  console.log("[API] registerLocalUser payload:", data);
  try {
    const result = await publicApiFetch<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    console.log("[API] registerLocalUser response:", result);
    return result;
  } catch (err) {
    console.error("[API] registerLocalUser error:", err);
    throw err;
  }
}

export interface LoginViaBackendRequest {
  email: string;
  password: string;
}

export interface LoginViaBackendResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
}

export async function loginViaBackend(
  data: LoginViaBackendRequest
): Promise<LoginViaBackendResponse> {
  console.log("[API] loginViaBackend payload:", { email: data.email });
  try {
    const result = await publicApiFetch<LoginViaBackendResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    console.log("[API] loginViaBackend response: tokens received");
    return result;
  } catch (err) {
    console.error("[API] loginViaBackend error:", err);
    throw err;
  }
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
  ml_anomaly_score?: number;
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
  ml_anomaly_score: number;
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

// --- Land Listings ---
export interface ListingResponse {
  id: string;
  user_id: string;
  search_id?: string;
  listing_status: "PENDING" | "ACTIVE" | "SOLD";
  county?: string;
  village?: string;
  specific_area?: string;
  price_min?: number;
  price_max?: number;
  description?: string;
  contact_preference: string;
  contact_phone?: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  parish?: string;
  area_acres?: number;
  plot_reference?: string;
  location?: string;
  owner?: string;
  title_status?: string;
  land_type?: string;
  plot_size?: number;
  plot_size_unit?: string;
  risk_level?: string;
  fraud_score?: number;
}

export interface ListingsResponse {
  listings: ListingResponse[];
  total: number;
  page: number;
}

export interface ListingCreateRequest {
  search_id?: string;
  county: string;
  village: string;
  specific_area: string;
  price_min: number;
  price_max: number;
  description?: string;
  contact_preference: "email" | "phone" | "both";
  contact_phone?: string;
  listing_status?: "PENDING" | "ACTIVE";
  latitude?: number;
  longitude?: number;
  district?: string;
  parish?: string;
  area_acres?: number;
}

export interface ListingUpdateRequest {
  search_id?: string;
  county?: string;
  village?: string;
  specific_area?: string;
  price_min?: number;
  price_max?: number;
  description?: string;
  contact_preference?: "email" | "phone" | "both";
  contact_phone?: string;
  listing_status?: "PENDING" | "ACTIVE";
  latitude?: number;
  longitude?: number;
  district?: string;
  parish?: string;
  area_acres?: number;
}

export async function getListings(page = 1): Promise<ListingsResponse> {
  return publicApiFetch<ListingsResponse>(`/listings?page=${page}`);
}

export async function getMyListings(page = 1, status?: string): Promise<ListingsResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.append("status", status);
  return apiFetch<ListingsResponse>(`/listings/my?${params.toString()}`);
}

export async function getListing(id: string): Promise<ListingResponse> {
  return publicApiFetch<ListingResponse>(`/listings/${id}`);
}

export async function createListing(data: ListingCreateRequest): Promise<ListingResponse> {
  return apiFetch<ListingResponse>("/listings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateListing(id: string, data: ListingUpdateRequest): Promise<ListingResponse> {
  return apiFetch<ListingResponse>(`/listings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updateListingStatus(
  id: string,
  status: "PENDING" | "ACTIVE" | "SOLD"
): Promise<ListingResponse> {
  return apiFetch<ListingResponse>(`/listings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ listing_status: status }),
  });
}

// --- Seller Contact ---
export interface SellerContact {
  name: string;
  email: string;
  contact_phone: string;
  contact_preference: string;
}

export async function getListingSeller(id: string): Promise<SellerContact> {
  return apiFetch<SellerContact>(`/listings/${id}/seller`);
}

// --- Inquiries ---
export interface InquiryResponse {
  id: string;
  listing_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  message?: string;
  created_at: string;
}

export interface InquiriesResponse {
  inquiries: InquiryResponse[];
  total: number;
}

export interface InquiryCreateRequest {
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  message?: string;
}

export async function createInquiry(
  listingId: string,
  data: InquiryCreateRequest
): Promise<InquiryResponse> {
  return publicApiFetch<InquiryResponse>(`/listings/${listingId}/inquiries`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getListingInquiries(
  listingId: string
): Promise<InquiriesResponse> {
  return apiFetch<InquiriesResponse>(`/listings/${listingId}/inquiries`);
}

export async function getMyInquiries(): Promise<InquiriesResponse> {
  return apiFetch<InquiriesResponse>("/inquiries/my");
}

// --- Graph / Neo4j ---

export interface OwnershipRecord {
  person: string;
  from_date: string;
  to_date: string | null;
}

export interface OwnershipResponse {
  plot_ref: string;
  ownership: OwnershipRecord[];
  total: number;
}

export interface PersonPlot {
  ref: string;
  district: string;
  from_date: string;
  to_date: string | null;
}

export interface PersonPlotsResponse {
  person: string;
  plots: PersonPlot[];
  total: number;
}

export interface GraphElement {
  data: {
    id: string;
    label: string;
    type: "person" | "plot";
  };
}

export interface GraphEdgeElement {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
  };
}

export function transformOwnershipToGraph(
  response: OwnershipResponse
): { nodes: GraphElement[]; edges: GraphEdgeElement[] } {
  const nodes: GraphElement[] = [];
  const edges: GraphEdgeElement[] = [];
  const seen = new Set<string>();

  // Plot node
  const plotId = `plot:${response.plot_ref}`;
  nodes.push({
    data: { id: plotId, label: response.plot_ref, type: "plot" },
  });
  seen.add(plotId);

  // Person nodes + edges
  for (const record of response.ownership) {
    const personId = `person:${record.person}`;
    if (!seen.has(personId)) {
      nodes.push({
        data: { id: personId, label: record.person, type: "person" },
      });
      seen.add(personId);
    }
    const dateLabel = record.to_date
      ? `${record.from_date} → ${record.to_date}`
      : `since ${record.from_date}`;
    edges.push({
      data: {
        id: `edge:${personId}-${plotId}-${record.from_date}`,
        source: personId,
        target: plotId,
        label: dateLabel,
      },
    });
  }

  return { nodes, edges };
}

export function transformPersonToGraph(
  response: PersonPlotsResponse
): { nodes: GraphElement[]; edges: GraphEdgeElement[] } {
  const nodes: GraphElement[] = [];
  const edges: GraphEdgeElement[] = [];
  const seenNodes = new Set<string>();

  const personId = `person:${response.person}`;
  nodes.push({
    data: { id: personId, label: response.person, type: "person" },
  });
  seenNodes.add(personId);

  const seenPlots = new Set<string>();
  for (const plot of response.plots) {
    const plotId = `plot:${plot.ref}`;
    if (!seenPlots.has(plotId)) {
      nodes.push({
        data: { id: plotId, label: plot.ref, type: "plot" },
      });
      seenPlots.add(plotId);
    }
    const dateLabel = plot.to_date
      ? `${plot.from_date} → ${plot.to_date}`
      : `since ${plot.from_date}`;
    edges.push({
      data: {
        id: `edge:${personId}-${plotId}-${plot.from_date}`,
        source: personId,
        target: plotId,
        label: dateLabel,
      },
    });
  }

  return { nodes, edges };
}

export interface MarketInsightsResponse {
  total_searches: number;
  top_districts: { district: string; search_count: number }[];
  risk_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    total_verified: number;
  };
  monthly_volume: { month: string; count: number }[];
  top_plot_units: { unit: string; count: number }[];
}

export async function fetchMarketInsights(): Promise<MarketInsightsResponse> {
  return apiFetch<MarketInsightsResponse>("/analytics/market-insights");
}

export async function fetchOwnershipChain(
  plotRef: string
): Promise<{ nodes: GraphElement[]; edges: GraphEdgeElement[] }> {
  const data = await apiFetch<OwnershipResponse>(
    `/api/v1/graph/ownership/${encodeURIComponent(plotRef)}`
  );
  return transformOwnershipToGraph(data);
}

export async function fetchPersonPlots(
  name: string
): Promise<{ nodes: GraphElement[]; edges: GraphEdgeElement[] }> {
  const data = await apiFetch<PersonPlotsResponse>(
    `/api/v1/graph/person/${encodeURIComponent(name)}`
  );
  return transformPersonToGraph(data);
}
