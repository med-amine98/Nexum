from fastapi import APIRouter, HTTPException
import logging

from ..services.minio_service import MinIOService
from ..services.spark_service import SparkService
import pandas as pd
from io import BytesIO

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])

_minio = MinIOService()
_spark = SparkService()

@router.post("/run_sales_analysis")
async def run_sales_analysis(raw_bucket: str = "raw-data", raw_path: str = "sales.csv"):
    """Example pipeline:
    1️⃣ Download CSV from MinIO raw bucket.
    2️⃣ Convert to Pandas DataFrame.
    3️⃣ Run Spark sales analysis.
    4️⃣ Store results as Parquet in processed-data bucket.
    """
    try:
        # 1️⃣ Download raw file
        resp = _minio.client.get_object(Bucket=raw_bucket, Key=raw_path)
        csv_bytes = resp['Body'].read()
        df = pd.read_csv(BytesIO(csv_bytes))
        logging.info(f"✅ Loaded raw data from {raw_bucket}/{raw_path}")
    except Exception as e:
        logging.error(f"❌ MinIO download error: {e}")
        raise HTTPException(status_code=500, detail="Failed to download raw data")

    try:
        # 2️⃣ Spark analysis
        result = _spark.analyze_sales(df)
        logging.info("✅ Spark sales analysis completed")
    except Exception as e:
        logging.error(f"❌ Spark analysis error: {e}")
        raise HTTPException(status_code=500, detail="Spark analysis failed")

    try:
        # 3️⃣ Save top products as parquet to processed bucket
        top_df = pd.DataFrame(result['top_products'])
        buffer = BytesIO()
        top_df.to_parquet(buffer, index=False)
        buffer.seek(0)
        _minio.client.put_object(
            Bucket='processed-data',
            Key='sales_top_products.parquet',
            Body=buffer.getvalue()
        )
        logging.info("✅ Uploaded analysis result to processed-data bucket")
    except Exception as e:
        logging.error(f"❌ MinIO upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload results")

    return {"status": "pipeline completed", "output_bucket": "processed-data", "output_key": "sales_top_products.parquet"}
