from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import logging
from datetime import datetime

from app.database import get_db
from app.models.digital_twin import DigitalTwin
from app.services.digital_twin_service import digital_twin_service
from app.minio_client import upload_file as upload_to_minio
from app.core.dependencies import get_optional_user
from app.models.auth import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predictions/digital-twin", tags=["Digital Twin"])

@router.post("/upload")
async def upload_digital_twin_model(
    name: str = Form(...),
    file: UploadFile = File(...),
    company_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Uploads a 3D model, saves metadata, and runs initial predictive stats"""
    try:
        # Check extensions
        allowed_extensions = [".glb", ".gltf", ".obj", ".fbx", ".stl"]
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Extension {ext} non supportée pour les modèles 3D.")

        # Save local copy
        upload_dir = "uploads/digital_twins"
        os.makedirs(upload_dir, exist_ok=True)
        file_id = str(uuid.uuid4())[:8]
        filename = f"{file_id}_{file.filename}"
        file_path = f"{upload_dir}/{filename}"

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Upload to MinIO in background if available
        minio_url = None
        try:
            # Re-read for MinIO
            file.file.seek(0)
            minio_url = upload_to_minio("digital-twins", filename, content, len(content), file.content_type)
            logger.info(f"✅ Modèle 3D sauvegardé dans MinIO: {minio_url}")
        except Exception as e:
            logger.warning(f"⚠️ MinIO upload failed (using local path fallback): {e}")

        # Default sensor values for initial prediction
        initial_sensors = {
            "temperature": 65.0,
            "vibration": 1.8,
            "pressure": 40.0,
            "operating_hours": 0.0
        }
        
        # Calculate initial predictions using our ML models
        rul, fail_prob = digital_twin_service.predict(initial_sensors)

        # Create record
        twin = DigitalTwin(
            name=name,
            status="active",
            model_3d_path=minio_url or file_path,
            sensor_data=initial_sensors,
            remaining_useful_life=rul,
            failure_probability=fail_prob,
            company_id=company_id or 1
        )
        
        db.add(twin)
        db.commit()
        db.refresh(twin)

        return {
            "success": True,
            "id": twin.id,
            "name": twin.name,
            "status": twin.status,
            "remaining_useful_life": twin.remaining_useful_life,
            "failure_probability": twin.failure_probability
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error uploading digital twin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health", tags=["Digital Twin"])
def digital_twin_health():
    """
    Returns the loading status of the Digital Twin predictive-maintenance ML models.

    Response fields:
    - **models_loaded**: ``true`` when both the RUL regressor and failure classifier
      are in memory and ready to serve predictions.
    - **fallback_enabled**: ``true`` when the service is configured to use heuristic
      fallback instead of raising an error on missing models.
    - **status**: human-readable summary (``"ok"`` | ``"degraded"`` | ``"unavailable"``).
    """
    loaded = digital_twin_service.models_loaded
    fallback = digital_twin_service.fallback_enabled

    if loaded:
        status = "ok"
    elif fallback:
        status = "degraded"
    else:
        status = "unavailable"

    return {
        "models_loaded": loaded,
        "fallback_enabled": fallback,
        "status": status,
    }


@router.get("")
def get_all_digital_twins(db: Session = Depends(get_db)):
    """Retrieve all active digital twins with real-time predictions"""
    twins = db.query(DigitalTwin).all()
    return [t.to_dict() for t in twins]

@router.get("/{twin_id}")
def get_digital_twin(twin_id: int, db: Session = Depends(get_db)):
    """Get specific digital twin with latest prediction details"""
    twin = db.query(DigitalTwin).filter(DigitalTwin.id == twin_id).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin non trouvé")
    return twin.to_dict()

@router.post("/{twin_id}/sensor-update")
def update_twin_sensors(
    twin_id: int,
    sensor_update: dict,
    db: Session = Depends(get_db)
):
    """Updates real-time sensors of the twin and recalculates ML predictions"""
    twin = db.query(DigitalTwin).filter(DigitalTwin.id == twin_id).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin non trouvé")

    # Update sensor data dictionary
    current_sensors = dict(twin.sensor_data or {})
    for k, v in sensor_update.items():
        current_sensors[k] = float(v)
    
    twin.sensor_data = current_sensors

    # Run actual ML prediction loop
    rul, fail_prob = digital_twin_service.predict(current_sensors)
    twin.remaining_useful_life = rul;
    twin.failure_probability = fail_prob;

    # Set status dynamically based on ML results
    if fail_prob > 80:
        twin.status = "failed"
    elif fail_prob > 50:
        twin.status = "maintenance"
    else:
        twin.status = "active"

    db.commit()
    db.refresh(twin)

    return {
        "success": True,
        "id": twin.id,
        "status": twin.status,
        "sensor_data": twin.sensor_data,
        "remaining_useful_life": twin.remaining_useful_life,
        "failure_probability": twin.failure_probability
    }
