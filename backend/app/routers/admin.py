import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models
from app.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


@router.post("/categories")
def create_category(
    body: CategoryCreate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")
    slug = name.lower().replace(" ", "-")
    if db.query(models.Category).filter(models.Category.slug == slug).first():
        raise HTTPException(status_code=409, detail="Category already exists")
    category = models.Category(name=name, slug=slug)
    db.add(category)
    db.commit()
    db.refresh(category)
    return {"id": category.id, "name": category.name, "slug": category.slug}


@router.patch("/categories/{category_id}")
def update_category(
    category_id: int,
    body: CategoryUpdate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")
    category.name = name
    category.slug = name.lower().replace(" ", "-")
    db.commit()
    db.refresh(category)
    return {"id": category.id, "name": category.name, "slug": category.slug}


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return {"message": f"Category '{category.name}' deleted"}

@router.get("/users")
def list_users(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at,
        }
        for u in users
    ]


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