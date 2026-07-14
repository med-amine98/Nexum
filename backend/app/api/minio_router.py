from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import logging

from app.services.minio_service import MinIOService
from app.services.spark_service import SparkService

router = APIRouter()

minio = MinIOService()
spark = SparkService()

@router.post("/create_buckets", summary="Create all configured MinIO buckets")
async def create_buckets():
    """Create all buckets defined in MinIOService.REQUIRED_BUCKETS.
    Returns a dict with creation status per bucket.
    """
    results = {}
    for bucket in MinIOService.REQUIRED_BUCKETS:
        try:
            minio.create_bucket(bucket)
            results[bucket] = "created"
        except Exception as e:
            results[bucket] = f"error: {str(e)}"
    return {"status": "completed", "details": results}


@router.post("/upload_raw", summary="Upload raw CSV file to the raw-data bucket")
async def upload_raw(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    content = await file.read()
    import pandas as pd, io
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {e}")
    # Temporarily switch bucket to raw-data
    original_bucket = minio.bucket
    minio.bucket = 'raw-data'
    path = f"raw-data/{file.filename}"
    try:
        minio.upload_dataframe(df, path)
        logging.info(f"✅ Uploaded raw file to {path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        minio.bucket = original_bucket
    return {"status": "uploaded", "path": path}

@router.get("/list_files", summary="List files in a bucket")
async def list_files_endpoint(bucket: str = None, prefix: str = ""):
    """List objects in the specified bucket (defaults to primary bucket)."""
    return {"files": minio.list_files(prefix=prefix, bucket=bucket)}

@router.delete("/delete", summary="Delete an object from a bucket")
async def delete_object(bucket: str = None, path: str = ""):
    """Delete a specific object from MinIO.
    Returns success status and the bucket/path used.
    """
    target_bucket = bucket or minio.bucket
    try:
        minio.client.remove_object(Bucket=target_bucket, Key=path)
        return {"status": "deleted", "bucket": target_bucket, "path": path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/process_raw", summary="Read raw CSV from MinIO, run Spark analysis, store results in processed-data bucket")
async def process_raw(filename: str):
    raw_path = f"raw-data/{filename}"
    # Temporarily switch bucket to raw-data for download
    original_bucket = minio.bucket
    minio.bucket = 'raw-data'
    df = minio.download_dataframe(raw_path)
    minio.bucket = original_bucket
    if df is None:
        raise HTTPException(status_code=404, detail="Raw file not found")
    # Run Spark analysis (example: sales analysis)
    try:
        result = spark.analyze_sales(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spark processing error: {e}")
    # Store processed result as parquet in processed-data bucket
    processed_path = f"processed-data/{filename.replace('.csv', '.parquet')}"
    # Temporarily switch bucket to processed-data for upload
    original_bucket = minio.bucket
    minio.bucket = 'processed-data'
    try:
        import pandas as pd
        minio.upload_dataframe(pd.DataFrame(result['top_products']), processed_path)
        logging.info(f"✅ Processed data stored at {processed_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        minio.bucket = original_bucket
    return {"status": "processed", "output_path": processed_path, "summary": result}

@router.post("/create_bucket", summary="Create a bucket by name")
async def create_bucket_endpoint(bucket_name: str):
    """Create a single bucket if it does not exist."""
    try:
        minio.create_bucket(bucket_name)
        return {"status": "created", "bucket": bucket_name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# List all MinIO buckets
@router.get("/list_buckets", summary="List all MinIO buckets")
async def list_buckets_endpoint():
    """Return a list of bucket names."""
    try:
        buckets = minio.client.list_buckets()
        return {"buckets": [b.name for b in buckets]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/required_buckets", summary="List required bucket names expected by the app")
async def required_buckets():
    """Return the list of bucket names the application expects to exist."""
    return {"required_buckets": MinIOService.REQUIRED_BUCKETS}
