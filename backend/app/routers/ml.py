"""Machine learning endpoints for fraud detection."""
from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.schemas import FraudScoreRequest, FraudScoreResponse, RiskLevel
from app.services.fraud_detection import score_fraud

router = APIRouter(prefix="/api/v1/ml", tags=["ML"])


@router.post("/fraud-score", response_model=FraudScoreResponse)
async def fraud_score(
    body: FraudScoreRequest,
    _user: dict = Depends(get_current_user),
):
    result = score_fraud(
        plot_size=body.plot_size,
        asking_price=body.asking_price,
        district=body.district,
        land_type=body.land_type,
        verification_count=body.verification_count,
        days_since_last_transfer=body.days_since_last_transfer,
    )
    return FraudScoreResponse(
        fraud_score=result.fraud_score,
        risk_level=RiskLevel(result.risk_level),
        anomaly_flags=result.anomaly_flags,
    )
