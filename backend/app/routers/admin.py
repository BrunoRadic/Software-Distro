import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
 
from app.database import get_db
from app import models
from app.dependencies import require_admin
 
router = APIRouter(prefix="/admin", tags=["admin"])

@router.patch("/software/{software_id}/approve")
def approve_software(
    software_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin odobrava software"""
    
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    software.status = "approved"

    parent_id = software.parent_software_id if software.parent_software_id else software.id
    db.query(models.Software).filter(
        (models.Software.id == parent_id) |
        (models.Software.parent_software_id == parent_id)
    ).update({"is_latest_version": False})
    software.is_latest_version = True

    db.commit()

    return {"message": f"Software '{software.title}' approved"}


@router.patch("/software/{software_id}/reject")
def reject_software(
    software_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin odbija software"""
    
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    software.status = "rejected"
    db.commit()
    
    return {"message": f"Software '{software.title}' rejected"}


@router.delete("/software/{software_id}")
def delete_software(
    software_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin briše software"""
    
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    # Obriši file sa diska
    if os.path.exists(software.file_path):
        os.remove(software.file_path)
    
    # Obriši iz baze
    db.delete(software)
    db.commit()
    
    return {"message": f"Software '{software.title}' deleted"}