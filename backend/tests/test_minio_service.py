import pytest
from unittest.mock import MagicMock
import pandas as pd
from io import BytesIO
# Import the service using the same import path as the FastAPI app
from app.services.minio_service import MinIOService

def test_ensure_buckets_creates_missing(monkeypatch):
    service = MinIOService()
    mock_client = MagicMock()
    mock_client.create_bucket.return_value = None
    service.client = mock_client
    service._ensure_buckets()
    assert mock_client.create_bucket.call_count == len(service.REQUIRED_BUCKETS)

def test_upload_dataframe_uses_specified_bucket(monkeypatch):
    service = MinIOService()
    mock_client = MagicMock()
    service.client = mock_client
    df = pd.DataFrame({"col": [1, 2, 3]})
    service.upload_dataframe(df, "test/file.parquet", bucket="raw-data")
    mock_client.put_object.assert_called_once()
    args, kwargs = mock_client.put_object.call_args
    assert kwargs["Bucket"] == "raw-data"
    assert kwargs["Key"] == "test/file.parquet"

def test_download_dataframe_uses_specified_bucket(monkeypatch):
    service = MinIOService()
    mock_client = MagicMock()
    mock_body = MagicMock()
    # pandas will write parquet bytes; we simulate with a DataFrame written to bytes
    sample_df = pd.DataFrame({"col": [1, 2]})
    buffer = BytesIO()
    sample_df.to_parquet(buffer, index=False)
    mock_body.read.return_value = buffer.getvalue()
    mock_client.get_object.return_value = {"Body": mock_body}
    service.client = mock_client
    df = service.download_dataframe("test/file.parquet", bucket="processed-data")
    mock_client.get_object.assert_called_once_with(Bucket="processed-data", Key="test/file.parquet")
    assert isinstance(df, pd.DataFrame)
