"""Pydantic schemas for API request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


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


class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    display_name: str
    polygon_geojson: Optional[dict[str, object]] = None


# --- Certificate ---
class CertificateResponse(BaseModel):
    id: str
    search_id: str
    user_id: str
    hash: str
    file_url: Optional[str] = None
    created_at: str


class CertificateVerifyResponse(BaseModel):
    valid: bool
    certificate: Optional[CertificateResponse] = None
    search: Optional[VerifyResponse] = None


# --- Auth ---
class AuthRegisterRequest(BaseModel):
    name: str = Field(min_length=1)
    email: str
    password: str = Field(min_length=6)
    role: str = Field(default="land_buyer")


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
