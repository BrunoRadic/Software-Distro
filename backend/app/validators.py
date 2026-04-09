import os
from fastapi import HTTPException, status

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
    
VALID_OS = {"Windows", "Mac", "Linux"}

def validate_os_compatibility(os_string: str):
    """Validacija OS compatibility stringa"""
    if not os_string or not os_string.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OS compatibility is required"
        )
    
    os_list = [os.strip() for os in os_string.split(',')]
    
    invalid_os = [os for os in os_list if os not in VALID_OS]
    if invalid_os:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OS: {', '.join(invalid_os)}. Allowed: Windows, Mac, Linux"
        )
    
    if len(os_list) != len(set(os_list)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate OS entries found"
        )
    
    return True