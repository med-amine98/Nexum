import os
import logging
from typing import List, Optional

from minio import Minio
from minio.error import S3Error
import pandas as pd
import io
from app.minio_client import get_minio_service

logger = logging.getLogger(__name__)

class MinIOService:
    """Service wrapper around MinIO client providing bucket management and data utilities.

    Attributes
    ----------
    client : Minio
        The underlying MinIO client instance.
    bucket : str
        Current working bucket; can be changed by callers (router temporarily switches).
    REQUIRED_BUCKETS : List[str]
        List of buckets that the application expects to exist.
    """

    # Define the buckets required by the application. Adjust as needed.
    REQUIRED_BUCKETS: List[str] = [
        "raw-data",
        "processed-data",
        "analytics",
        "fraud",
        "fraud-evidence",
    ]

    def __init__(self) -> None:
        # Configuration – read from environment (or use defaults)
        endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        secure = os.getenv("MINIO_SECURE", "0") == "1"  # 0 → HTTP, 1 → HTTPS

        self.client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )
        # Default bucket – the first required bucket
        self.bucket: str = self.REQUIRED_BUCKETS[0] if self.REQUIRED_BUCKETS else ""

    # ---------------------------------------------------------------------
    # Bucket management
    # ---------------------------------------------------------------------
    def ensure_bucket(self, bucket_name: str) -> None:
        """Create *bucket_name* if it does not already exist.
        Raises
        ------
        S3Error
            Propagates any MinIO error.
        """
        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"✅ MinIO bucket created: {bucket_name}")
            else:
                logger.debug(f"🔎 Bucket already present: {bucket_name}")
        except S3Error as exc:
            logger.error(f"❌ MinIO bucket creation failed for {bucket_name}: {exc}")
            raise

    def create_bucket(self, bucket_name: str) -> None:
        """Public method used by API endpoints – simply forwards to *ensure_bucket*.
        """
        self.ensure_bucket(bucket_name)

    # ---------------------------------------------------------------------
    # Object utilities
    # ---------------------------------------------------------------------
    def upload_dataframe(self, df: pd.DataFrame, object_name: str, bucket_name: Optional[str] = None) -> None:
        """Upload a pandas DataFrame as CSV to MinIO.
        Parameters
        ----------
        df : pd.DataFrame
            DataFrame to upload.
        object_name : str
            Destination object name (including any folder prefixes).
        bucket_name : Optional[str]
            Override bucket; if omitted the current ``self.bucket`` is used.
        """
        target_bucket = bucket_name or self.bucket
        csv_bytes = df.to_csv(index=False).encode("utf-8")
        try:
            self.client.put_object(
                bucket_name=target_bucket,
                object_name=object_name,
                data=io.BytesIO(csv_bytes),
                length=len(csv_bytes),
                content_type="text/csv",
            )
            logger.info(f"📤 Uploaded DataFrame to s3://{target_bucket}/{object_name}")
        except S3Error as exc:
            logger.error(f"❌ Upload failed for {object_name} in {target_bucket}: {exc}")
            raise

    def download_dataframe(self, object_name: str, bucket_name: Optional[str] = None) -> Optional[pd.DataFrame]:
        """Download a CSV object from MinIO and return it as a pandas DataFrame.
        Returns ``None`` if the object does not exist.
        """
        target_bucket = bucket_name or self.bucket
        try:
            response = self.client.get_object(target_bucket, object_name)
            data = response.read().decode("utf-8")
            df = pd.read_csv(io.StringIO(data))
            logger.info(f"📥 Downloaded DataFrame from s3://{target_bucket}/{object_name}")
            return df
        except S3Error as exc:
            # If the object is not found, MinIO raises a 404 error.
            logger.warning(f"⚠️ Could not download {object_name} from {target_bucket}: {exc}")
            return None

    def list_files(self, prefix: str = "", bucket_name: Optional[str] = None) -> List[str]:
        """List object keys in a bucket optionally filtered by *prefix*.
        """
        target_bucket = bucket_name or self.bucket
        try:
            objects = self.client.list_objects(target_bucket, prefix=prefix, recursive=True)
            return [obj.object_name for obj in objects]
        except S3Error as exc:
            logger.error(f"❌ Listing objects failed in {target_bucket}: {exc}")
            return []
def upload_document(self, bucket: str, content: bytes, filename: str, content_type: str = "application/octet-stream"):
    minio = get_minio_service()
    object_name = f"{self.name}/{filename}"
    return minio.upload_bytes(bucket, object_name, content, content_type)

def list_documents(self, bucket: str, prefix: str = ""):
    minio = get_minio_service()
    return minio.list_objects(bucket, prefix)