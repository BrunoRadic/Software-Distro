from sqlalchemy import Column, Integer, String, Text, BigInteger, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user")  # user, developer, admin
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    
    # Relationships
    uploaded_software = relationship("Software", back_populates="developer")
    downloads = relationship("Download", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    
    # Relationships
    software = relationship("Software", back_populates="category")


class Software(Base):
    __tablename__ = "software"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    version = Column(String(20))
    developer_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    file_path = Column(String(255))
    file_size = Column(BigInteger)
    os_compatibility = Column(String(50))  # Windows,Mac,Linux
    external_link = Column(String(255))
    screenshot_url = Column(String(255))
    license = Column(String(50))
    price_type = Column(String(20))
    price = Column(Float)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    download_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    
    # Relationships
    developer = relationship("User", back_populates="uploaded_software")
    category = relationship("Category", back_populates="software")
    downloads = relationship("Download", back_populates="software")
    favorites = relationship("Favorite", back_populates="software")


class Download(Base):
    __tablename__ = "downloads"
    
    id = Column(Integer, primary_key=True, index=True)
    software_id = Column(Integer, ForeignKey("software.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    downloaded_at = Column(DateTime, default=datetime.now(timezone.utc))
    
    # Relationships
    software = relationship("Software", back_populates="downloads")
    user = relationship("User", back_populates="downloads")


class Favorite(Base):
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    software_id = Column(Integer, ForeignKey("software.id"))
    added_at = Column(DateTime, default=datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", back_populates="favorites")
    software = relationship("Software", back_populates="favorites")