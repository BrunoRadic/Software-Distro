import boto3
from botocore.exceptions import NoCredentialsError
import os
from datetime import timedelta

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
BUCKET_NAME = "software-uploads"

s3_client = boto3.client(
    "s3",
    endpoint_url = MINIO_ENDPOINT,
    aws_access_key_id = MINIO_ACCESS_KEY,
    aws_secret_access_key = MINIO_SECRET_KEY,
    config=boto3.session.Config(signature_version='s3v4')
)

def upload_file_to_storage(file_path: str, object_name: str) -> bool:
    """Upload file to MinIO"""
    try:
        s3_client.upload_file(file_path, BUCKET_NAME, object_name)
        return True
    except Exception as e:
        print(f"Upload error: {e}")
        return False
    
def generate_download_url(object_name: str, expiration: int = 3600) -> str:
    """Generate presigned download URL (expires in 1 hour)"""
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': object_name},
            ExpiresIn=expiration
        )
        return url
    except Exception as e:
        print(f"URL generation error: {e}")
        return None


def delete_file_from_storage(object_name: str) -> bool:
    """Delete file from MinIO"""
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=object_name)
        return True
    except Exception as e:
        print(f"Delete error: {e}")
        return False