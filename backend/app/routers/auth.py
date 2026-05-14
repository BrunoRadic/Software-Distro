from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
 
from app.database import get_db
from app import models, schemas, auth
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Registracija novog korisnika"""
    existing_user = db.query(models.User).filter(
        models.User.username == user_data.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    existing_email = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    if user_data.role not in ["user", "developer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role."
        )
    
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        password_hash=auth.hash_password(user_data.password),
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login postojećeg korisnika"""
    user=db.query(models.User).filter(
        models.User.username == credentials.username
    ).first()

    if not user or not auth.verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )
    
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}
    )

    return{
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Dohvati podatke trenutno logiranog korisnika"""
    return current_user


@router.get("/me/downloads")
def get_my_downloads(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    downloads = (
        db.query(models.Download)
        .filter(models.Download.user_id == current_user.id)
        .order_by(models.Download.downloaded_at.desc())
        .all()
    )

    result = []
    for d in downloads:
        sf = d.software_file
        versioned_sw = sf.software if sf else d.software
        if not versioned_sw:
            continue
        platform = sf.platform if sf else None
        category = versioned_sw.category
        result.append({
            "id": d.id,
            "downloaded_at": d.downloaded_at,
            "platform": platform,
            "software": {
                "id": versioned_sw.id,
                "title": versioned_sw.title,
                "version": versioned_sw.version,
                "category": category.name if category else None,
            },
        })

    return result