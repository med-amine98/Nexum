# app/minio_client.py
import os
import io
import json
import logging
import tempfile
from typing import List, Optional, BinaryIO

from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration – read from environment variables (with sensible defaults)
# ---------------------------------------------------------------------------
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
MINIO_SECURE = os.getenv("MINIO_SECURE", "0") == "1"

# ---------------------------------------------------------------------------
# Initialise a singleton MinIO client
# ---------------------------------------------------------------------------
client = Minio(
    endpoint=MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE,
)


def ensure_bucket(bucket_name: str) -> None:
    """Create the bucket if it does not already exist."""
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
            logger.info(f"✅ MinIO bucket created: {bucket_name}")
        else:
            logger.debug(f"🔎 Bucket already exists: {bucket_name}")
    except S3Error as exc:
        logger.error(f"❌ Failed to ensure bucket '{bucket_name}': {exc}")
        raise


def upload_file(bucket_name: str, object_name: str, file_path: str) -> None:
    """Upload a local file to a MinIO bucket."""
    ensure_bucket(bucket_name)
    try:
        client.fput_object(
            bucket_name,
            object_name,
            file_path,
            content_type="application/octet-stream",
        )
        logger.info(f"📤 Uploaded {file_path} → s3://{bucket_name}/{object_name}")
    except S3Error as exc:
        logger.error(f"❌ Upload failed: {exc}")
        raise


def upload_bytes(bucket_name: str, object_name: str, data: bytes, content_type: str = "application/octet-stream") -> Optional[str]:
    """Upload bytes data to a MinIO bucket"""
    ensure_bucket(bucket_name)
    try:
        client.put_object(
            bucket_name,
            object_name,
            io.BytesIO(data),
            len(data),
            content_type=content_type
        )
        url = f"http://{MINIO_ENDPOINT}/{bucket_name}/{object_name}"
        logger.info(f"📤 Uploaded bytes → s3://{bucket_name}/{object_name}")
        return url
    except S3Error as exc:
        logger.error(f"❌ Upload failed: {exc}")
        return None


def download_file(bucket_name: str, object_name: str, destination_path: str) -> None:
    """Download an object from MinIO to a local file."""
    try:
        client.fget_object(bucket_name, object_name, destination_path)
        logger.info(f"📥 Downloaded s3://{bucket_name}/{object_name} → {destination_path}")
    except S3Error as exc:
        logger.error(f"❌ Download failed: {exc}")
        raise


def download_file_as_bytes(bucket_name: str, object_name: str) -> Optional[bytes]:
    """Download an object from MinIO as bytes (in memory)"""
    try:
        response = client.get_object(bucket_name, object_name)
        data = response.read()
        response.close()
        response.release_conn()
        logger.info(f"📥 Downloaded bytes from s3://{bucket_name}/{object_name}")
        return data
    except S3Error as exc:
        logger.error(f"❌ Download bytes failed: {exc}")
        return None


def download_file_as_string(bucket_name: str, object_name: str, encoding: str = "utf-8") -> Optional[str]:
    """Download an object from MinIO as string"""
    data = download_file_as_bytes(bucket_name, object_name)
    if data:
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            logger.error(f"❌ Failed to decode {bucket_name}/{object_name} with encoding {encoding}")
            return None
    return None


def list_objects(bucket_name: str, prefix: str = "") -> List[str]:
    """Return a list of object names in the specified bucket."""
    try:
        return [obj.object_name for obj in client.list_objects(bucket_name, prefix=prefix, recursive=True)]
    except S3Error as exc:
        logger.error(f"❌ Listing objects failed: {exc}")
        raise


def delete_file(bucket_name: str, object_name: str) -> bool:
    """Delete an object from MinIO"""
    try:
        client.remove_object(bucket_name, object_name)
        logger.info(f"🗑️ Deleted s3://{bucket_name}/{object_name}")
        return True
    except S3Error as exc:
        logger.error(f"❌ Delete failed: {exc}")
        return False


# ===========================================================================
# CLASSE MinIOService pour compatibilité avec main.py
# ===========================================================================
class MinIOService:
    """Wrapper class for MinIO operations to maintain compatibility"""
    
    REQUIRED_BUCKETS = [
        "bank-data",
        "insurance-data",
        "enterprise-data",
        "raw-data",
        "processed-data",
        "fraud",
        "fraud-evidence",
        "assistant-documents",
        "assistant-knowledge",
        "erp-documents",
        "erp-analytics",
        "erp-backups"
    ]
    
    def __init__(self):
        self.client = client
        self.endpoint = MINIO_ENDPOINT
        self.access_key = MINIO_ACCESS_KEY
        self.secret_key = MINIO_SECRET_KEY
        self.secure = MINIO_SECURE
    
    def ensure_bucket(self, bucket_name: str) -> bool:
        """Ensure bucket exists, return True if successful"""
        try:
            ensure_bucket(bucket_name)
            return True
        except Exception:
            return False
    
    def upload_file(self, bucket_name: str, object_name: str, file_path: str) -> Optional[str]:
        """Upload file and return URL"""
        try:
            upload_file(bucket_name, object_name, file_path)
            protocol = "https" if MINIO_SECURE else "http"
            return f"{protocol}://{MINIO_ENDPOINT}/{bucket_name}/{object_name}"
        except Exception:
            return None
    
    def upload_bytes(self, bucket_name: str, object_name: str, data: bytes, content_type: str = "application/octet-stream") -> Optional[str]:
        """Upload bytes and return URL"""
        return upload_bytes(bucket_name, object_name, data, content_type)
    
    def download_file(self, bucket_name: str, object_name: str, destination_path: str) -> bool:
        """Download file, return True if successful"""
        try:
            download_file(bucket_name, object_name, destination_path)
            return True
        except Exception:
            return False
    
    def download_file_as_bytes(self, bucket_name: str, object_name: str) -> Optional[bytes]:
        """Download file as bytes (in memory)"""
        return download_file_as_bytes(bucket_name, object_name)
    
    def download_file_as_string(self, bucket_name: str, object_name: str, encoding: str = "utf-8") -> Optional[str]:
        """Download file as string"""
        return download_file_as_string(bucket_name, object_name, encoding)
    
    def list_files(self, bucket_name: str, prefix: str = "") -> List[str]:
        """List files in bucket"""
        return list_objects(bucket_name, prefix)
    
    def delete_file(self, bucket_name: str, object_name: str) -> bool:
        """Delete file, return True if successful"""
        return delete_file(bucket_name, object_name)
    
    def get_object_path(self, file_id: str, sector: str) -> str:
        """Générer le chemin d'un objet dans MinIO"""
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d")
        
        sector_folders = {
            "bank": "transactions",
            "insurance": "claims",
            "enterprise": "documents"
        }
        
        folder = sector_folders.get(sector, "documents")
        
        if sector == "insurance":
            return f"{folder}/{timestamp}/{file_id}/claim_data.json"
        else:
            return f"{folder}/{timestamp}/{file_id}.json"


# Singleton instance
_minio_service = None

def get_minio_service() -> MinIOService:
    """Get singleton MinIOService instance"""
    global _minio_service
    if _minio_service is None:
        _minio_service = MinIOService()
    return _minio_service