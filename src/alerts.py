# 백엔드 알림 라우터의 참고 사본입니다. React/Vite 실행에는 연결되지 않으며 실제 API는 백엔드 app/api/routers/alerts.py에서 제공합니다.
# 알림 관련 API
from contextlib import contextmanager
from typing import Literal

from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel, PositiveInt

from app.core.database import get_connection

router = APIRouter(prefix="/api/alerts", tags=["알림"])

FIELDS = "id, prediction_id, level, message, created_at, detail_confirmed_at"


class AlertCreate(BaseModel):
    prediction_id: PositiveInt
    source: Literal["prediction", "label"] = "prediction"


@contextmanager
def alert_cursor():
    connection = get_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        try:
            yield cursor
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()
    finally:
        connection.close()


@router.post("")
def create_alert(payload: AlertCreate):
    """예측에 연결된 경고·위험 알림을 생성합니다."""
    with alert_cursor() as cursor:
        cursor.execute(
            """
            SELECT p.status, p.predicted_wear_um, l.original_wear_um
            FROM predictions AS p
            LEFT JOIN wear_labels AS l ON l.measurement_id = p.measurement_id
            WHERE p.id = %s
            """,
            (payload.prediction_id,),
        )
        prediction = cursor.fetchone()
        if prediction is None:
            raise HTTPException(404, "예측 결과가 없습니다.")
        wear = prediction["predicted_wear_um"]
        level = prediction["status"]
        if payload.source == "label":
            wear = prediction["original_wear_um"]
            if wear is None or wear < 50:
                raise HTTPException(422, "경고·위험 라벨만 알림으로 저장할 수 있습니다.")
            level = "danger" if wear >= 90 else "warning"
        if level not in ("warning", "danger"):
            raise HTTPException(422, "경고·위험 예측만 알림으로 저장할 수 있습니다.")
        title = "경고 · 마모 상태 확인" if level == "warning" else "위험 · 공구 교체 필요"
        message = f"{title} ({wear:.2f} μm)"
        cursor.execute(
            """
            INSERT INTO alerts (prediction_id, level, message)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE id = alerts.id
            """,
            (payload.prediction_id, level, message),
        )
        cursor.execute(
            f"SELECT {FIELDS} FROM alerts WHERE prediction_id = %s FOR UPDATE",
            (payload.prediction_id,),
        )
        return cursor.fetchone()


@router.get("")
def list_alerts(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """최신 알림부터 확인 시각과 함께 조회합니다."""
    with alert_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {FIELDS} FROM alerts
            ORDER BY created_at DESC, id DESC LIMIT %s OFFSET %s
            """,
            (limit, offset),
        )
        return {"items": cursor.fetchall()}


@router.patch("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int = Path(gt=0)):
    """최초 확인 시각을 기록하고 반복 호출 시 기존 시각을 유지합니다."""
    with alert_cursor() as cursor:
        cursor.execute(
            """
            UPDATE alerts
            SET detail_confirmed_at = COALESCE(detail_confirmed_at, CURRENT_TIMESTAMP(6))
            WHERE id = %s
            """,
            (alert_id,),
        )
        cursor.execute(
            f"SELECT {FIELDS} FROM alerts WHERE id = %s",
            (alert_id,),
        )
        alert = cursor.fetchone()
        if alert is None:
            raise HTTPException(404, "알림이 없습니다.")
        return alert
