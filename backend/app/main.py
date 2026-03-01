from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, get_db, SessionLocal
from app import models, schemas, auth

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

# @app.get("/admin-only")
# def admin_only_route(admin: models.User = Depends(require_admin)):
#     """Test endpoint samo za admine"""
#     return{
#         "message": f"Welcome admin {admin.username}",
#         "access_level": "full"
#     }

