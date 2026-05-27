"""
Storage service for MinIO/S3
"""
from minio import Minio
from minio.error import S3Error
import boto3
from botocore.exceptions import ClientError
from typing import BinaryIO, Optional
from datetime import timedelta
from app.core.config import settings
import structlog
from io import BytesIO

logger = structlog.get_logger()


class StorageService:
    """Storage service for handling audio files"""
    
    def __init__(self):
        if settings.USE_S3:
            self._init_s3()
        else:
            self._init_minio()
    
    def _init_minio(self):
        """Initialize MinIO client"""
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
            region=settings.MINIO_REGION,
        )
        self.storage_type = "minio"
        self._ensure_buckets()
    
    def _init_s3(self):
        """Initialize S3 client"""
        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        self.storage_type = "s3"
        self.bucket_name = settings.S3_BUCKET_NAME
        self._ensure_buckets()
    
    def _ensure_buckets(self):
        """Ensure required buckets exist"""
        buckets = [
            settings.BUCKET_RAW_AUDIO,
            settings.BUCKET_PROCESSED_AUDIO,
            settings.BUCKET_MODELS,
            settings.BUCKET_TEMP,
        ]
        
        for bucket in buckets:
            try:
                if self.storage_type == "minio":
                    if not self.client.bucket_exists(bucket):
                        self.client.make_bucket(bucket)
                else:  # S3
                    self.client.head_bucket(Bucket=bucket)
            except (S3Error, ClientError) as e:
                if self.storage_type == "s3":
                    self.client.create_bucket(Bucket=bucket)
                logger.warning("bucket check failed", bucket=bucket, error=str(e))

    def is_available(self) -> bool:
        """Return True if storage backend is reachable."""
        try:
            if self.storage_type == "minio":
                # Light touch; doesn't download anything.
                self.client.list_buckets()
                return True
            # S3
            self.client.list_buckets()
            return True
        except Exception:
            return False


class UnavailableStorageService(StorageService):
    """Fallback used in test/dev when storage backend is unavailable at import time."""

    def __init__(self):
        self.client = None
        self.storage_type = "unavailable"
        self.bucket_name = None

    def _ensure_buckets(self):
        return

    def upload_file(self, *args, **kwargs):  # type: ignore[override]
        raise RuntimeError("Storage backend unavailable")

    def download_file(self, *args, **kwargs):  # type: ignore[override]
        raise RuntimeError("Storage backend unavailable")

    def delete_file(self, *args, **kwargs):  # type: ignore[override]
        raise RuntimeError("Storage backend unavailable")

    def get_presigned_url(self, *args, **kwargs):  # type: ignore[override]
        raise RuntimeError("Storage backend unavailable")
    
    def upload_file(
        self,
        bucket: str,
        object_name: str,
        file_data: BinaryIO,
        content_type: str = "application/octet-stream",
        length: Optional[int] = None,
    ) -> str:
        """Upload a file to storage"""
        try:
            if self.storage_type == "minio":
                self.client.put_object(
                    bucket,
                    object_name,
                    file_data,
                    length=length or -1,
                    content_type=content_type,
                )
                return f"{bucket}/{object_name}"
            else:  # S3
                extra_args = {"ContentType": content_type}
                self.client.upload_fileobj(
                    file_data,
                    bucket,
                    object_name,
                    ExtraArgs=extra_args,
                )
                return f"{bucket}/{object_name}"
        except (S3Error, ClientError) as e:
            logger.error("Failed to upload file", error=str(e), bucket=bucket, object_name=object_name)
            raise
    
    def download_file(self, bucket: str, object_name: str) -> bytes:
        """Download a file from storage"""
        try:
            if self.storage_type == "minio":
                response = self.client.get_object(bucket, object_name)
                return response.read()
            else:  # S3
                response = self.client.get_object(Bucket=bucket, Key=object_name)
                return response["Body"].read()
        except (S3Error, ClientError) as e:
            logger.error("Failed to download file", error=str(e), bucket=bucket, object_name=object_name)
            raise
    
    def delete_file(self, bucket: str, object_name: str):
        """Delete a file from storage"""
        try:
            if self.storage_type == "minio":
                self.client.remove_object(bucket, object_name)
            else:  # S3
                self.client.delete_object(Bucket=bucket, Key=object_name)
        except (S3Error, ClientError) as e:
            logger.error("Failed to delete file", error=str(e), bucket=bucket, object_name=object_name)
            raise
    
    def get_presigned_url(
        self,
        bucket: str,
        object_name: str,
        expiry_seconds: int = 3600,
    ) -> str:
        """Get a presigned URL for temporary access"""
        try:
            if self.storage_type == "minio":
                return self.client.presigned_get_object(
                    bucket,
                    object_name,
                    expires=timedelta(seconds=expiry_seconds),
                )
            else:  # S3
                return self.client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": object_name},
                    ExpiresIn=expiry_seconds,
                )
        except (S3Error, ClientError) as e:
            logger.error("Failed to generate presigned URL", error=str(e))
            raise
    
    def upload_chunk(
        self,
        bucket: str,
        object_name: str,
        chunk_data: bytes,
        chunk_index: int,
        total_chunks: int,
        total_size: int,
    ):
        """Upload a chunk of a file (for resumable uploads)"""
        # This is a simplified version - full implementation would use multipart upload
        # For now, we'll store chunks temporarily and assemble them
        temp_name = f"{object_name}.chunk.{chunk_index}"
        try:
            self.upload_file(
                settings.BUCKET_TEMP,
                temp_name,
                chunk_data,
                length=len(chunk_data),
            )
        except Exception as e:
            logger.error("Failed to upload chunk", error=str(e), chunk_index=chunk_index)
            raise


# Global storage service instance
try:
    _tmp = StorageService()
    storage_service = _tmp if _tmp.is_available() else UnavailableStorageService()
except Exception as exc:
    logger.warning("Storage backend unavailable at import time", error=str(exc))
    storage_service = UnavailableStorageService()

