from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


def _resolve_family(software_id: int, db: Session) -> tuple[int, list[int]]:
    """Return (root_id, [root_id, ...all_child_ids]) for any software_id in the family."""
    sw = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not sw:
        return software_id, [software_id]
    root_id = sw.id if sw.parent_software_id is None else sw.parent_software_id
    child_ids = [
        c.id for c in db.query(models.Software)
        .filter(models.Software.parent_software_id == root_id)
        .all()
    ]
    return root_id, [root_id] + child_ids


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

    seen_root_ids: set[int] = set()
    result = []
    for f in favorites:
        sw = f.software
        root_id = sw.id if sw.parent_software_id is None else sw.parent_software_id
        if root_id in seen_root_ids:
            continue
        seen_root_ids.add(root_id)
        # Show the latest approved version so displayed info is current
        latest = db.query(models.Software).filter(
            or_(models.Software.id == root_id, models.Software.parent_software_id == root_id),
            models.Software.status == 'approved',
            models.Software.is_latest_version == True,
        ).first()
        result.append(latest if latest else sw)
    return result


@router.get("/{software_id}/status")
def get_favorite_status(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, family_ids = _resolve_family(software_id, db)
    exists = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.software_id.in_(family_ids),
    ).first()
    return {"is_favorited": exists is not None}


@router.post("/{software_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.query(models.Software).filter(models.Software.id == software_id).first():
        raise HTTPException(status_code=404, detail="Software not found")

    root_id, family_ids = _resolve_family(software_id, db)

    if db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.software_id.in_(family_ids),
    ).first():
        raise HTTPException(status_code=400, detail="Already in favorites")

    db.add(models.Favorite(user_id=current_user.id, software_id=root_id))
    db.commit()
    return {"message": "Added to favorites"}


@router.delete("/{software_id}")
def remove_favorite(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, family_ids = _resolve_family(software_id, db)
    to_delete = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.software_id.in_(family_ids),
    ).all()
    if not to_delete:
        raise HTTPException(status_code=404, detail="Not in favorites")
    for fav in to_delete:
        db.delete(fav)
    db.commit()
    return {"message": "Removed from favorites"}
