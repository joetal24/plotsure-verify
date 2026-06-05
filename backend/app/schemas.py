"""Pydantic schemas for API request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime
from uuid import UUID


# --- Enums ---
class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class LandType(str, Enum):
    FREEHOLD = "Freehold"
    LEASEHOLD = "Leasehold"
    MAILO = "Mailo"


class SearchMethod(str, Enum):
    TITLE = "title"
    PARCEL = "parcel"


class FraudStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    VERIFIED = "verified"
    FLAGGED = "flagged"
    FAILED = "failed"


# --- Verification ---
class VerifyRequest(BaseModel):
    search_method: SearchMethod
    volume: Optional[str] = None
    folio: Optional[str] = None
    county: Optional[str] = None
    district: Optional[str] = None
    block_number: Optional[str] = None
    plot_number: Optional[str] = None
    land_type: LandType
    plot_size: float = Field(gt=0)
    plot_size_unit: str = "Decimals"
    asking_price: Optional[float] = None
    owner_name: Optional[str] = None
    national_id: Optional[str] = None


class PreliminaryVerifyResponse(BaseModel):
    verification_id: str
    plot_id: str
    status: str = "preliminary_verified"
    message: str = "Basic checks passed. Deep fraud analysis in progress."
    processing_time_ms: float


class VerifyResponse(BaseModel):
    id: str
    plot_reference: str
    location: str
    owner: str
    title_status: str
    encumbrances: list[str]
    transfer_count: int
    last_transfer_date: str
    risk_level: RiskLevel
    price_min: float
    price_max: float
    land_type: str
    plot_size: float
    plot_size_unit: str
    created_at: str
    is_cached: bool = False
    is_stale: bool = False
    fraud_score: float = 0.0
    fraud_risk_level: RiskLevel = RiskLevel.LOW
    anomaly_flags: list[str] = Field(default_factory=list)
    ml_anomaly_score: float = 0.0
    fraud_status: FraudStatus = FraudStatus.PENDING


class VerificationStatusResponse(BaseModel):
    verification_id: str
    status: str  # processing, verified, flagged, failed
    fraud_details: Optional[dict] = None
    created_at: str
    updated_at: Optional[str] = None


class FraudScoreRequest(BaseModel):
    plot_size: float
    asking_price: float
    district: str
    land_type: str
    verification_count: int
    days_since_last_transfer: int


class FraudScoreResponse(BaseModel):
    fraud_score: float
    risk_level: RiskLevel
    anomaly_flags: list[str]
    ml_anomaly_score: float = 0.0


class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    display_name: str
    polygon_geojson: Optional[dict[str, object]] = None


# --- Auth ---
class AuthRegisterRequest(BaseModel):
    name: str = Field(min_length=1)
    email: str
    password: str = Field(min_length=6)
    role: str = Field(default="land_buyer")
    roles: Optional[list[str]] = None


class AuthRegisterResponse(BaseModel):
    user_id: str
    email: str
    confirmed: bool = True


# --- History ---
class SearchHistoryItem(BaseModel):
    id: str
    plot_reference: str
    location: str
    risk_level: RiskLevel
    price_min: float
    price_max: float
    created_at: str


# --- Listings ---
class ListingStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SOLD = "SOLD"


class ContactPreference(str, Enum):
    EMAIL = "email"
    PHONE = "phone"
    BOTH = "both"


class ListingCreate(BaseModel):
    search_id: Optional[str] = None
    county: str
    village: str
    specific_area: str
    price_min: float
    price_max: float
    description: Optional[str] = None
    contact_preference: ContactPreference = ContactPreference.BOTH
    contact_phone: Optional[str] = None
    listing_status: ListingStatus = ListingStatus.PENDING
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None
    parish: Optional[str] = None
    area_acres: Optional[float] = None


class ListingUpdate(BaseModel):
    search_id: Optional[str] = None
    county: Optional[str] = None
    village: Optional[str] = None
    specific_area: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    description: Optional[str] = None
    contact_preference: Optional[ContactPreference] = None
    contact_phone: Optional[str] = None
    listing_status: Optional[ListingStatus] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None
    parish: Optional[str] = None
    area_acres: Optional[float] = None


class ListingStatusUpdate(BaseModel):
    listing_status: ListingStatus


class ListingResponse(BaseModel):
    id: str
    user_id: str
    search_id: Optional[str] = None
    listing_status: ListingStatus
    county: Optional[str] = None
    village: Optional[str] = None
    specific_area: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    description: Optional[str] = None
    contact_preference: str
    contact_phone: Optional[str] = None
    views_count: int
    created_at: str
    updated_at: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None
    parish: Optional[str] = None
    area_acres: Optional[float] = None
    plot_reference: Optional[str] = None
    location: Optional[str] = None
    owner: Optional[str] = None
    title_status: Optional[str] = None
    land_type: Optional[str] = None
    plot_size: Optional[float] = None
    plot_size_unit: Optional[str] = None
    risk_level: Optional[str] = None
    fraud_score: Optional[float] = None


class ListingsResponse(BaseModel):
    listings: list[ListingResponse]
    total: int
    page: int


# --- Admin ---
class AdminRetryResponse(BaseModel):
    verification_id: str
    status: str
    message: str
