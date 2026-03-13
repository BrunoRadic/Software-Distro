from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class SoftwareResponse(BaseModel):
    id: int
    title: str
    description: str
    version: str
    developer_id: int
    category_id: int
    file_size: int
    os_compatibility: str
    external_link: Optional[str]
    status: str
    download_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True