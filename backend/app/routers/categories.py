from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
 
from app.database import get_db
from app import models
 
router = APIRouter(prefix="/categories", tags=["categories"])
 

@router.get("")
def list_categories(db: Session = Depends(get_db)):
    """Lista svih kategorija"""

    categories = db.query(models.Category).all()

    return[
        {"id": cat.id, "name": cat.name, "slug": cat.slug}
        for cat in categories
    ]