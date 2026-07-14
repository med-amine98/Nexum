import boto3
import os
from io import BytesIO
import pandas as pd
import logging

class MinIOService:
    REQUIRED_BUCKETS = ['erp-data', 'raw-data', 'processed-data', 'analytics-data']

    def __init__(self):
        self.client = boto3.client('s3',
            endpoint_url=f"http://{os.getenv('MINIO_ENDPOINT', 'minio:9000')}",
            aws_access_key_id=os.getenv('MINIO_ACCESS_KEY', 'minioadmin'),
            aws_secret_access_key=os.getenv('MINIO_SECRET_KEY', 'minioadmin123'),
            use_ssl=False
        )
        self.bucket = self.REQUIRED_BUCKETS[0]  # primary bucket
        try:
            self._ensure_buckets()
        except Exception as e:
            logging.debug(f"Bucket initialization failed: {e}")

    def _ensure_buckets(self):
        for bucket in self.REQUIRED_BUCKETS:
            try:
                self.client.create_bucket(Bucket=bucket)
                logging.info(f"✅ Created bucket: {bucket}")
            except Exception:
                # Bucket may already exist
                logging.debug(f"Bucket {bucket} already exists or cannot be created")
    
    def _ensure_bucket(self, bucket_name: str):
        """Create a bucket if it does not exist, ignore if exists"""
        try:
            self.client.create_bucket(Bucket=bucket_name)
            logging.info(f"✅ Created bucket via helper: {bucket_name}")
        except Exception:
            logging.debug(f"Bucket {bucket_name} already exists (helper)")

    def create_bucket(self, bucket_name: str):
        """Public method to create a bucket if it does not exist."""
        self._ensure_bucket(bucket_name)

    
    def upload_dataframe(self, df, path, bucket: str | None = None):
        """Upload a pandas DataFrame to MinIO as parquet.
        Parameters
        ----------
        df: pandas.DataFrame
            Dataframe to upload.
        path: str
            Object key (including optional folder prefix).
        bucket: str | None, optional
            Target bucket; defaults to the service's primary bucket.
        """
        target_bucket = bucket or self.bucket
        buffer = BytesIO()
        df.to_parquet(buffer, index=False)
        buffer.seek(0)
        self.client.put_object(
            Bucket=target_bucket,
            Key=path,
            Body=buffer.getvalue()
        )
    
    def download_dataframe(self, path, bucket: str | None = None):
        """Download a parquet file from MinIO as pandas DataFrame.
        Parameters
        ----------
        path: str
            Object key to retrieve.
        bucket: str | None, optional
            Bucket to read from; defaults to the service's primary bucket.
        Returns
        -------
        pandas.DataFrame or None
            Dataframe if the object exists, otherwise None.
        """
        target_bucket = bucket or self.bucket
        try:
            response = self.client.get_object(Bucket=target_bucket, Key=path)
            return pd.read_parquet(BytesIO(response['Body'].read()))
        except Exception:
            return None
    
    def list_files(self, prefix: str = '', bucket: str | None = None):
        """List objects in a bucket (default primary bucket) with optional prefix"""
        bucket_name = bucket or self.bucket
        response = self.client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
        return [obj['Key'] for obj in response.get('Contents', [])]