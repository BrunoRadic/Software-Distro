from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=List[schemas.SoftwareResponse])
def get_favorites(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favorites = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id)
        .order_by(models.Favorite.added_at.desc())
        .all()
    )
    return [f.software for f in favorites]


@router.get("/{software_id}/status")
def get_favorite_status(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exists = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.software_id == software_id,
    ).first()
    return {"is_favorited": exists is not None}


@router.post("/{software_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")

    existing = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.software_id == software_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")

    db.add(models.Favorite(user_id=current_user.id, software_id=software_id))
    db.commit()
    return {"message": "Added to favorites"}


@router.delete("/{software_id}")
def remove_favorite(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favorite = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.software_id == software_id,
    ).first()
    if not favorite:
        raise HTTPException(status_code=404, detail="Not in favorites")

    db.delete(favorite)
    db.commit()
    return {"message": "Removed from favorites"}
