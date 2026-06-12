import os
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from pydantic import BaseModel
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, storage
from app.schemas import SoftwareResponse
from app.dependencies import get_current_user, require_developer
from app.validators import validate_file, validate_os_compatibility

router = APIRouter(prefix="/software", tags=["software"])

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


async def _upload_image(file: UploadFile, prefix: str) -> str:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only JPG and PNG images are allowed")
    await file.seek(0)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="File is empty or could not be read")
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 5 MB")
    temp_path = f"/tmp/{uuid.uuid4()}{ext}"
    with open(temp_path, "wb") as f:
        f.write(data)
    object_name = f"{prefix}/{uuid.uuid4()}{ext}"
    if not storage.upload_file_to_storage(temp_path, object_name):
        os.remove(temp_path)
        raise HTTPException(status_code=500, detail="Image upload failed")
    os.remove(temp_path)
    return object_name


async def _process_upload(file: UploadFile) -> tuple[str, int, str]:
    """Save file to temp, validate, upload to MinIO. Returns (object_name, file_size, original_filename)."""
    file_size = 0
    temp_path = f"/tmp/{uuid.uuid4()}_{file.filename}"

    with open(temp_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            buffer.write(chunk)

    validate_file(file.filename, file_size)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_ext = os.path.splitext(file.filename)[1]
    object_name = f"software/{timestamp}_{uuid.uuid4()}{file_ext}"

    if not storage.upload_file_to_storage(temp_path, object_name):
        os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"File upload failed for {file.filename}")

    os.remove(temp_path)
    return object_name, file_size, file.filename


@router.post("/upload", status_code=status.HTTP_201_CREATED)
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
    file_windows: Optional[UploadFile] = File(None),
    file_mac: Optional[UploadFile] = File(None),
    file_linux: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(require_developer),
    db: Session = Depends(get_db)
):
    """Upload softvera s per-platform fajlovima, developer/admin"""

    platform_files = {}
    if file_windows and file_windows.filename:
        platform_files["Windows"] = file_windows
    if file_mac and file_mac.filename:
        platform_files["Mac"] = file_mac
    if file_linux and file_linux.filename:
        platform_files["Linux"] = file_linux

    if not platform_files:
        raise HTTPException(status_code=400, detail="At least one platform file is required")

    validate_os_compatibility(os_compatibility)

    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    saved_files = []
    for platform, file in platform_files.items():
        object_name, file_size, orig_filename = await _process_upload(file)
        saved_files.append((platform, object_name, file_size, orig_filename))

    new_software = models.Software(
        title=title,
        description=description,
        version=version,
        developer_id=current_user.id,
        category_id=category_id,
        os_compatibility=os_compatibility,
        license=license,
        price_type=price_type,
        price=price if price_type == 'paid' else None,
        external_link=external_link,
        status="pending"
    )
    db.add(new_software)
    db.flush()

    for platform, object_name, file_size, orig_filename in saved_files:
        db.add(models.SoftwareFile(
            software_id=new_software.id,
            platform=platform,
            file_path=object_name,
            file_size=file_size,
            original_filename=orig_filename
        ))

    db.commit()
    db.refresh(new_software)

    return {
        "message": "Software uploaded successfully",
        "software_id": new_software.id,
        "platforms": [p for p, *_ in saved_files],
        "status": new_software.status
    }


@router.get("/public")
def list_software_public(
    category_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Javna lista, samo approved latest verzije"""
    query = db.query(models.Software).filter(
        models.Software.status == "approved",
        models.Software.is_latest_version == True
    )

    if category_id:
        query = query.filter(models.Software.category_id == category_id)

    software_list = query.order_by(models.Software.created_at.desc()).all()

    result = []
    for sw in software_list:
        developer = db.query(models.User).filter(models.User.id == sw.developer_id).first()
        category = db.query(models.Category).filter(models.Category.id == sw.category_id).first()

        logo_url = sw.logo_url
        if not logo_url and sw.parent_software_id is not None:
            root = db.query(models.Software).filter(models.Software.id == sw.parent_software_id).first()
            if root:
                logo_url = root.logo_url

        result.append({
            "id": sw.id,
            "title": sw.title,
            "description": sw.description,
            "version": sw.version,
            "developer_id": sw.developer_id,
            "category_id": sw.category_id,
            "os_compatibility": sw.os_compatibility,
            "license": sw.license,
            "price_type": sw.price_type,
            "price": sw.price,
            "external_link": sw.external_link,
            "status": sw.status,
            "download_count": sw.download_count,
            "created_at": sw.created_at,
            "logo_url": storage.generate_download_url(logo_url, 86400) if logo_url else None,
            "screenshot_url": storage.generate_download_url(sw.screenshot_url, 86400) if sw.screenshot_url else None,
            "developer": {"id": developer.id, "username": developer.username} if developer else None,
            "category": {"id": category.id, "name": category.name} if category else None,
        })
    return result


@router.get("", response_model=List[SoftwareResponse])
def list_software_authenticated(
    category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logirani, approved + svoje pending, admin vidi sve"""

    if current_user.role == "admin":
        query = db.query(models.Software)
        if status_filter:
            query = query.filter(models.Software.status == status_filter)
    else:
        query = db.query(models.Software).filter(
            (models.Software.status == "approved") |
            (models.Software.developer_id == current_user.id)
        )

    if category_id:
        query = query.filter(models.Software.category_id == category_id)

    software_list = query.order_by(models.Software.created_at.desc()).all()

    result = []
    for sw in software_list:
        developer = db.query(models.User).filter(models.User.id == sw.developer_id).first()
        category = db.query(models.Category).filter(models.Category.id == sw.category_id).first()

        sw_dict = {
            "id": sw.id,
            "title": sw.title,
            "description": sw.description,
            "version": sw.version,
            "developer_id": sw.developer_id,
            "category_id": sw.category_id,
            "os_compatibility": sw.os_compatibility,
            "license": sw.license,
            "price_type": sw.price_type,
            "price": sw.price,
            "external_link": sw.external_link,
            "status": sw.status,
            "download_count": sw.download_count,
            "created_at": sw.created_at,
            "logo_url": storage.generate_download_url(sw.logo_url, 86400) if sw.logo_url else None,
            "screenshot_url": storage.generate_download_url(sw.screenshot_url, 86400) if sw.screenshot_url else None,
            "developer": {
                "id": developer.id,
                "username": developer.username
            } if developer else None,
            "category": {
                "id": category.id,
                "name": category.name
            } if category else None
        }
        result.append(sw_dict)

    return result


@router.get("/my-uploads")
def get_my_uploads(
    current_user: models.User = Depends(require_developer),
    db: Session = Depends(get_db)
):
    """All software uploaded by the current developer, all statuses, with download_count and avg rating."""
    software_list = db.query(models.Software).filter(
        models.Software.developer_id == current_user.id
    ).order_by(models.Software.created_at.desc()).all()

    result = []
    for sw in software_list:
        ratings = db.query(models.Rating).filter(models.Rating.software_id == sw.id).all()
        avg_rating = round(sum(r.score for r in ratings) / len(ratings), 2) if ratings else None

        logo_url = sw.logo_url
        if not logo_url and sw.parent_software_id is not None:
            root = db.query(models.Software).filter(models.Software.id == sw.parent_software_id).first()
            if root:
                logo_url = root.logo_url

        result.append({
            "id": sw.id,
            "title": sw.title,
            "description": sw.description,
            "version": sw.version,
            "status": sw.status,
            "download_count": sw.download_count,
            "average_rating": avg_rating,
            "rating_count": len(ratings),
            "os_compatibility": sw.os_compatibility,
            "license": sw.license,
            "price_type": sw.price_type,
            "price": sw.price,
            "external_link": sw.external_link,
            "created_at": sw.created_at,
            "is_latest_version": sw.is_latest_version,
            "parent_software_id": sw.parent_software_id,
            "category_id": sw.category_id,
            "logo_url": logo_url,
        })

    return result


@router.get("/{software_id}/files")
def get_software_files(
    software_id: int,
    db: Session = Depends(get_db)
):
    """Dohvati sve fajlove (per-platform) za datu verziju softvera"""
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")

    files = db.query(models.SoftwareFile).filter(
        models.SoftwareFile.software_id == software_id
    ).all()

    return [
        {
            "id": f.id,
            "platform": f.platform,
            "file_size": f.file_size,
            "original_filename": f.original_filename,
            "uploaded_at": f.uploaded_at
        }
        for f in files
    ]


@router.get("/{software_id}/download")
async def download_software(
    software_id: int,
    platform: Optional[str] = None,
    version_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download softvera; presigned URL. Opcionalno platform=Windows|Mac|Linux"""

    if version_id:
        software = db.query(models.Software).filter(models.Software.id == version_id).first()
    else:
        software = db.query(models.Software).filter(models.Software.id == software_id).first()

        if software and not software.is_latest_version:
            parent_id = software.parent_software_id if software.parent_software_id else software.id
            software = db.query(models.Software).filter(
                models.Software.parent_software_id == parent_id,
                models.Software.is_latest_version == True
            ).first()

    if not software:
        raise HTTPException(status_code=404, detail="Software not found")

    if software.status != "approved" and software.developer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Software not approved")

    sw_files = db.query(models.SoftwareFile).filter(
        models.SoftwareFile.software_id == software.id
    ).all()

    if not sw_files:
        raise HTTPException(status_code=404, detail="No downloadable file found")

    if platform:
        sw_file = next((f for f in sw_files if f.platform == platform), None)
        if not sw_file:
            raise HTTPException(
                status_code=404,
                detail=f"No file available for {platform}. Available: {[f.platform for f in sw_files]}"
            )
    else:
        sw_file = sw_files[0]

    file_path = sw_file.file_path
    original_filename = sw_file.original_filename or os.path.basename(sw_file.file_path)

    download_url = storage.generate_download_url(file_path)
    if not download_url:
        raise HTTPException(status_code=500, detail="Download URL generation failed")

    download_record = models.Download(
        software_id=software_id,
        user_id=current_user.id,
        software_file_id=sw_file.id,
    )
    db.add(download_record)
    software.download_count += 1
    db.commit()

    return {
        "download_url": download_url,
        "filename": original_filename,
        "version": software.version,
        "platform": platform,
        "expires_in": "1 hour"
    }


@router.get("/{software_id}")
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

    logo_url = software.logo_url
    if not logo_url and software.parent_software_id is not None:
        root = db.query(models.Software).filter(models.Software.id == software.parent_software_id).first()
        if root:
            logo_url = root.logo_url

    return {
        "id": software.id,
        "title": software.title,
        "description": software.description,
        "version": software.version,
        "os_compatibility": software.os_compatibility,
        "license": software.license,
        "price_type": software.price_type,
        "price": software.price,
        "download_count": software.download_count,
        "status": software.status,
        "created_at": software.created_at,
        "external_link": software.external_link,
        "logo_url": storage.generate_download_url(logo_url, 86400) if logo_url else None,
        "screenshot_url": storage.generate_download_url(software.screenshot_url, 86400) if software.screenshot_url else None,
        "developer": {
            "id": developer.id,
            "username": developer.username
        } if developer else None,
        "category": {
            "id": category.id,
            "name": category.name
        } if category else None
    }


@router.delete("/{software_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_software(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete software and its files. Owner or admin only."""
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")

    if software.developer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this software")

    sw_files = db.query(models.SoftwareFile).filter(
        models.SoftwareFile.software_id == software_id
    ).all()
    for f in sw_files:
        storage.delete_file_from_storage(f.file_path)

    db.query(models.Rating).filter(models.Rating.software_id == software_id).delete()
    db.query(models.Favorite).filter(models.Favorite.software_id == software_id).delete()
    db.query(models.Download).filter(models.Download.software_id == software_id).delete()

    db.query(models.Software).filter(
        models.Software.parent_software_id == software_id
    ).update({"parent_software_id": None})

    db.delete(software)
    db.commit()


class SoftwareUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    license: Optional[str] = None


@router.patch("/{software_id}")
def update_software(
    software_id: int,
    body: SoftwareUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update software metadata. Owner only."""
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    if software.developer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this software")

    if body.title is not None:
        software.title = body.title
    if body.description is not None:
        software.description = body.description
    if body.price is not None:
        software.price = body.price
    if body.category_id is not None:
        category = db.query(models.Category).filter(models.Category.id == body.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        software.category_id = body.category_id
    if body.license is not None:
        software.license = body.license

    db.commit()
    db.refresh(software)
    return {
        "id": software.id,
        "title": software.title,
        "description": software.description,
        "version": software.version,
        "license": software.license,
        "price": software.price,
        "price_type": software.price_type,
        "category_id": software.category_id,
        "status": software.status,
    }


@router.post("/{software_id}/logo")
async def upload_logo(
    software_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload or replace logo. Owner or admin only. Logo is stored on the root row."""
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    if software.developer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    if software.parent_software_id is not None:
        root = db.query(models.Software).filter(models.Software.id == software.parent_software_id).first()
        if root:
            software = root

    if software.logo_url:
        storage.delete_file_from_storage(software.logo_url)

    object_name = await _upload_image(file, "logos")
    software.logo_url = object_name
    db.commit()

    return {"logo_url": storage.generate_download_url(object_name, 86400)}


@router.post("/{software_id}/upload-version", status_code=status.HTTP_201_CREATED)
async def upload_new_version(
    software_id: int,
    version: str = Form(...),
    description: str = Form(...),
    file_windows: Optional[UploadFile] = File(None),
    file_mac: Optional[UploadFile] = File(None),
    file_linux: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(require_developer),
    db: Session = Depends(get_db)
):
    """Upload nove verzije postojeceg softvera s per-platform fajlovima"""

    original = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Software not found")

    if original.developer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only upload versions of your own software")

    platform_files = {}
    if file_windows and file_windows.filename:
        platform_files["Windows"] = file_windows
    if file_mac and file_mac.filename:
        platform_files["Mac"] = file_mac
    if file_linux and file_linux.filename:
        platform_files["Linux"] = file_linux

    if not platform_files:
        raise HTTPException(status_code=400, detail="At least one platform file is required")

    saved_files = []
    for platform, file in platform_files.items():
        object_name, file_size, orig_filename = await _process_upload(file)
        saved_files.append((platform, object_name, file_size, orig_filename))

    parent_id = original.parent_software_id if original.parent_software_id else original.id

    new_version = models.Software(
        title=original.title,
        description=description,
        version=version,
        developer_id=original.developer_id,
        category_id=original.category_id,
        os_compatibility=original.os_compatibility,
        license=original.license,
        price_type=original.price_type,
        price=original.price,
        external_link=original.external_link,
        parent_software_id=parent_id,
        is_latest_version=False,
        status="pending"
    )
    db.add(new_version)
    db.flush()

    for platform, object_name, file_size, orig_filename in saved_files:
        db.add(models.SoftwareFile(
            software_id=new_version.id,
            platform=platform,
            file_path=object_name,
            file_size=file_size,
            original_filename=orig_filename
        ))

    db.commit()
    db.refresh(new_version)

    return {
        "message": "New version uploaded successfully. Waiting for admin approval.",
        "version_id": new_version.id,
        "version": new_version.version,
        "platforms": [p for p, *_ in saved_files],
        "parent_id": parent_id
    }


@router.get("/{software_id}/versions")
def get_software_versions(
    software_id: int,
    db: Session = Depends(get_db)
):
    """Dohvati sve verzije softvera"""
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")

    parent_id = software.parent_software_id if software.parent_software_id else software.id

    all_versions = db.query(models.Software).filter(
        (models.Software.id == parent_id) |
        (models.Software.parent_software_id == parent_id)
    ).order_by(models.Software.created_at.desc()).all()

    approved_versions = [v for v in all_versions if v.status == "approved"]

    result = []
    for v in approved_versions:
        sw_files = db.query(models.SoftwareFile).filter(
            models.SoftwareFile.software_id == v.id
        ).all()

        total_size = sum(f.file_size for f in sw_files if f.file_size)
        platforms = [f.platform for f in sw_files]

        result.append({
            "id": v.id,
            "version": v.version,
            "created_at": v.created_at,
            "file_size": total_size,
            "download_count": v.download_count,
            "is_latest": v.is_latest_version,
            "description": v.description,
            "platforms": platforms
        })

    return result


@router.get("/{software_id}/stats")
def get_software_stats(
    software_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download counts grouped by date for a specific software. Owner or admin only."""
    software = db.query(models.Software).filter(models.Software.id == software_id).first()
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")

    if software.developer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view stats for this software")

    date_col = cast(models.Download.downloaded_at, Date)
    rows = (
        db.query(date_col.label("date"), func.count().label("count"))
        .filter(models.Download.software_id == software_id)
        .group_by(date_col)
        .order_by(date_col)
        .all()
    )

    return [{"date": str(row.date), "count": row.count} for row in rows]
