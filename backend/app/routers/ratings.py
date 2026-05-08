from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_user

router = APIRouter(prefix="/ratings", tags=["ratings"])


def _get_software_or_404(software_id: int, db: Session) -> models.Software:
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    return software


def _validate_score(score: int):
    if score < 1 or score > 5:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 5")


@router.get("/{software_id}")
def get_ratings(software_id: int, db: Session = Depends(get_db)):
    _get_software_or_404(software_id, db)

    ratings = (
        db.query(models.Rating)
        .filter(models.Rating.software_id == software_id)
        .order_by(models.Rating.created_at.desc())
        .all()
    )

    average = round(sum(r.score for r in ratings) / len(ratings), 1) if ratings else None

    return {
        "average_score": average,
        "total_ratings": len(ratings),
        "ratings": [
            {
                "id": r.id,
                "software_id": r.software_id,
                "score": r.score,
                "comment": r.comment,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
                "user": {"id": r.user.id, "username": r.user.username},
            }
            for r in ratings
        ],
    }


@router.post("/{software_id}", response_model=schemas.RatingResponse, status_code=status.HTTP_201_CREATED)
def create_rating(
    software_id: int,
    data: schemas.RatingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_software_or_404(software_id, db)
    _validate_score(data.score)

    existing = db.query(models.Rating).filter(
        models.Rating.user_id == current_user.id,
        models.Rating.software_id == software_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already rated this software")

    rating = models.Rating(
        user_id=current_user.id,
        software_id=software_id,
        score=data.score,
        comment=data.comment,
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


@router.patch("/{software_id}", response_model=schemas.RatingResponse)
def update_rating(
    software_id: int,
    data: schemas.RatingUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_software_or_404(software_id, db)

    rating = db.query(models.Rating).filter(
        models.Rating.user_id == current_user.id,
        models.Rating.software_id == software_id,
    ).first()
    if not rating:
        raise HTTPException(status_code=404, detail="You have not rated this software")

    if data.score is not None:
        _validate_score(data.score)
        rating.score = data.score
    if data.comment is not None:
        rating.comment = data.comment

    db.commit()
    db.refresh(rating)
    return rating


@router.delete("/{software_id}")
def delete_rating(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_software_or_404(software_id, db)

    rating = db.query(models.Rating).filter(
        models.Rating.user_id == current_user.id,
        models.Rating.software_id == software_id,
    ).first()
    if not rating:
        raise HTTPException(status_code=404, detail="You have not rated this software")

    db.delete(rating)
    db.commit()
    return {"message": "Rating deleted"}
