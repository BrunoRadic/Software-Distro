from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Header
from typing import Optional, List
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, get_db, SessionLocal
from app import models, schemas, auth, storage
from app.schemas import SoftwareResponse
import uuid, os, shutil
from datetime import datetime

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()
if db.query(models.Category).count() == 0:
    categories = [
        models.Category(name="Development Tools", slug="dev-tools"),
        models.Category(name="Games", slug="games"),
        models.Category(name="Utilities", slug="utilities"),
        models.Category(name="Productivity", slug="productivity"),
        models.Category(name="Graphics & Design", slug="graphics-design"),
    ]
    db.add_all(categories)
    db.commit()
    print("Categories seeded")
db.close()

app = FastAPI(title="Software Distribution API")
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ) -> models.User:
        """Dohvati trenutnog korisnika iz JWT tokena"""
        token = credentials.credentials
        payload = auth.decode_access_token(token)

        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        username = payload.get("sub")

        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        user = db.query(models.User).filter(
            models.User.username == username
        ).first()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        return user

# MARK:  AUTH ENDPOINTS
@app.post("/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
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

@app.post("/auth/login", response_model=schemas.Token)
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

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Dohvati podatke trenutno logiranog korisnika"""
    return current_user

# MARK: TEST ENDPOINTS
@app.get("/")
def root():
    return {"message": "Software Distribution API", "status": "running", "docs": "/docs"}

@app.get("/protected")
def protected_route(current_user: models.User = Depends(get_current_user)):
    """Test endpoint samo za logirane usere"""
    return{
        "message": f"Hello {current_user.username}",
        "role": current_user.role
    }

#MARK: REQUIREMENT ENDPOINTS
def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Zahtijeva admin rolu"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@app.get("/admin-only")
def admin_only_route(admin: models.User = Depends(require_admin)):
    """Test endpoint samo za admine"""
    return {
        "message": f"Welcome admin {admin.username}!",
        "access_level": "full"
    }

def require_developer(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Zahtijeva developer ili admin rolu"""
    if current_user.role not in ["developer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer or admin access required"
        )
    return current_user

# Dopustene ekstenzije
ALLOWED_EXTENSIONS = {'.exe', '.zip', '.dmg', '.AppImage', '.deb', '.rpm', '.tar.gz', '.tar'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB


def validate_file(filename: str, file_size: int):
    """Validacija file extension i size"""

    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {MAX_FILE_SIZE / (1024*1024)}MB"
        )

@app.post("/software/upload", status_code=status.HTTP_201_CREATED)
async def upload_software(
    title: str = Form(...),
    description: str = Form(...),
    version: str = Form(...),
    category_id: int = Form(...),
    os_compatibility: str = Form(...),
    license: str = Form(...),
    price_type: str = Form(...), 
    price: Optional[float] = Form(None),
    external_link: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_developer),
    db: Session = Depends(get_db)
):
    """Upload softvera, developer/admin"""
    
    file_size = 0
    temp_file = f"/tmp/{uuid.uuid4()}_{file.filename}"
    
    with open(temp_file, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            buffer.write(chunk)
    
    validate_file(file.filename, file_size)
    
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        os.remove(temp_file)
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Generate unique object name
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_ext = os.path.splitext(file.filename)[1]
    object_name = f"software/{timestamp}_{uuid.uuid4()}{file_ext}"
    
    # Upload MinIO
    if not storage.upload_file_to_storage(temp_file, object_name):
        os.remove(temp_file)
        raise HTTPException(status_code=500, detail="File upload failed")
    
    os.remove(temp_file)
    
    # DB
    new_software = models.Software(
        title=title,
        description=description,
        version=version,
        developer_id=current_user.id,
        category_id=category_id,
        file_path=object_name,  # MinIO object key
        file_size=file_size,
        os_compatibility=os_compatibility,
        license=license,
        price_type=price_type,
        price=price if price_type == 'paid' else None,
        external_link=external_link,
        status="pending"
    )
    
    db.add(new_software)
    db.commit()
    db.refresh(new_software)
    
    return {
        "message": "Software uploaded successfully",
        "software_id": new_software.id,
        "status": new_software.status
    }

@app.get("/software/{software_id}/download")
async def download_software(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download softvera; presigned URL"""
    
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    if software.status != "approved" and software.developer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Software not approved")
    
    download_url = storage.generate_download_url(software.file_path)
    
    if not download_url:
        raise HTTPException(status_code=500, detail="Download URL generation failed")
    
    download_record = models.Download(
        software_id=software_id,
        user_id=current_user.id
    )
    db.add(download_record)
    
    software.download_count += 1
    db.commit()
    
    return {
        "download_url": download_url,
        "filename": os.path.basename(software.file_path),
        "expires_in": "1 hour"
    }

@app.patch("/admin/software/{software_id}/approve")
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
    db.commit()
    
    return {"message": f"Software '{software.title}' approved"}


@app.patch("/admin/software/{software_id}/reject")
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


@app.delete("/admin/software/{software_id}")
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

@app.get("/software/public", response_model=List[SoftwareResponse])
def list_software_public(
    category_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Javna lista, samo approved"""
    query = db.query(models.Software).filter(models.Software.status == "approved")
    
    if category_id:
        query = query.filter(models.Software.category_id == category_id)
    
    return query.order_by(models.Software.created_at.desc()).all()


@app.get("/software", response_model=List[SoftwareResponse])
def list_software_authenticated(
    category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logirani, approved + svoje pending, admin vidi sve"""
    query = db.query(models.Software)
    
    if category_id:
        query = query.filter(models.Software.category_id == category_id)
    
    if current_user.role == "admin":
        if status_filter:
            query = query.filter(models.Software.status == status_filter)
    else:
        query = query.filter(
            (models.Software.status == "approved") |
            (models.Software.developer_id == current_user.id)
        )
    
    return query.order_by(models.Software.created_at.desc()).all()


@app.get("/software/{software_id}")
async def get_software(
    software_id: int,
    db: Session = Depends(get_db)
):
    """Get softvera po Id-u"""

    software = db.query(models.Software).filter(models.Software.id == software_id).first()

    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    developer = db.query(models.User).filter(models.User.id == software.developer_id).first()

    category = db.query(models.Category).filter(models.Category.id == software.category_id).first()



    return {
        "id": software.id,
        "title": software.title,
        "description": software.description,
        "version": software.version,
        "os_compatibility": software.os_compatibility,
        "license": software.license,
        "price_type": software.price_type,
        "price": software.price,
        "file_size": software.file_size,
        "download_count": software.download_count,
        "status": software.status,
        "created_at": software.created_at,
        "external_link": software.external_link,
        "developer": {
            "id": developer.id,
            "username": developer.username
        } if developer else None,
        "category": {
            "id": category.id,
            "name": category.name
        } if category else None
    }