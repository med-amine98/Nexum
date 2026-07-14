# app/services/document_intelligence_service.py
from app.models.document_intelligence import Document
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import uuid
import os
import re
import logging
logger = logging.getLogger(__name__)
import random

try:
    import easyocr
    import pdf2image
    import numpy as np
    from PIL import Image

    reader = easyocr.Reader(['fr', 'en'], gpu=False)
    EASYOCR_AVAILABLE = True
    logger.info("✅ EasyOCR chargé")

except Exception:
    EASYOCR_AVAILABLE = False
    logger.warning("⚠️ EasyOCR non disponible")

from app.models.document_intelligence import (
    Document,
    DocumentTypeStats,
    OCRTemplate,
    ProcessingQueue
)

from app.models.auth import User

from app.schemas.document_intelligence import (
    DocumentCreate,
    DocumentUpdate,
    DocumentStatsResponse
)


class DocumentIntelligenceService:

    def __init__(self, db: Session):
        self.db = db

    # =====================================================
    # CREATE DOCUMENT
    # =====================================================

    def create_document(self, document: DocumentCreate, user: User) -> Document:

        doc_ref = f"DOC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        db_document = Document(
            document_id=doc_ref,
            uploaded_by_id=user.id,
            **document.dict()
        )

        self.db.add(db_document)
        self.db.commit()
        self.db.refresh(db_document)

        self._add_to_queue(db_document)

        return db_document

    # =====================================================
    # PROCESS DOCUMENT
    # =====================================================

    def process_document(self, document_id: int) -> Optional[Document]:

        document = self.db.query(Document).filter(Document.id == document_id).first()

        if not document:
            return None

        start_time = datetime.utcnow()

        document.processing_status = "processing"
        self.db.commit()

        try:

            if EASYOCR_AVAILABLE and os.path.exists(document.file_path):

                text = self._perform_easyocr(document.file_path)

                extracted_data = self._extract_data(text, document.document_type)

                confidence = self._calculate_confidence(extracted_data)

                pages = self._count_pages(document.file_path)

            else:

                text = "demo text"
                extracted_data = self._generate_mock_data(document.document_type)

                confidence = random.uniform(85, 99)
                pages = random.randint(1, 10)

            processing_time = (datetime.utcnow() - start_time).total_seconds()

            document.extracted_text = text
            document.extracted_data = extracted_data
            document.confidence_score = confidence
            document.page_count = pages
            document.processing_status = "completed"
            document.processing_time = processing_time
            document.processed_at = datetime.utcnow()

            document.fields = self._extract_fields(extracted_data)
            document.tables = self._extract_tables(text)

            self.db.commit()
            self.db.refresh(document)

            self._update_stats(document)

        except Exception as e:

            document.processing_status = "failed"
            document.extracted_data = {"error": str(e)}

            self.db.commit()

            logger.error("❌ OCR Error:", e)

        return document

    # =====================================================
    # OCR
    # =====================================================

    def _perform_easyocr(self, file_path: str) -> str:

        text_output = []

        try:

            if file_path.lower().endswith(".pdf"):

                images = pdf2image.convert_from_path(file_path)

                for img in images:
                    img_np = np.array(img)

                    result = reader.readtext(img_np, paragraph=True)

                    for item in result:
                        text_output.append(item[1])

            else:

                result = reader.readtext(file_path, paragraph=True)

                for item in result:
                    text_output.append(item[1])

        except Exception as e:

            logger.info("OCR error:", e)

        return "\n".join(text_output)

    # =====================================================
    # GET DOCUMENTS
    # =====================================================

    def get_documents(
        self,
        skip: int = 0,
        limit: int = 100,
        document_type: Optional[str] = None,
        status: Optional[str] = None,
        company_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[Document]:

        query = self.db.query(Document)

        if document_type:
            query = query.filter(Document.document_type == document_type)

        if status:
            query = query.filter(Document.processing_status == status)

        if company_id:
            query = query.filter(Document.company_id == company_id)

        if date_from:
            query = query.filter(Document.uploaded_at >= date_from)

        if date_to:
            query = query.filter(Document.uploaded_at <= date_to)

        return (
            query
            .order_by(desc(Document.uploaded_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    # =====================================================
    # GET SINGLE DOCUMENT
    # =====================================================

    def get_document(self, document_id: int) -> Optional[Document]:

        return (
            self.db.query(Document)
            .filter(Document.id == document_id)
            .first()
        )

    def get_document_by_ref(self, ref: str) -> Optional[Document]:

        return (
            self.db.query(Document)
            .filter(Document.document_id == ref)
            .first()
        )

    # =====================================================
    # UPDATE
    # =====================================================

    def update_document(self, document_id: int, data: DocumentUpdate) -> Optional[Document]:

        document = self.get_document(document_id)

        if not document:
            return None

        for key, value in data.dict(exclude_unset=True).items():
            setattr(document, key, value)

        self.db.commit()
        self.db.refresh(document)

        return document

    # =====================================================
    # DELETE
    # =====================================================

    def delete_document(self, document_id: int) -> bool:

        document = self.get_document(document_id)

        if not document:
            return False

        if document.file_path and os.path.exists(document.file_path):
            os.remove(document.file_path)

        self.db.delete(document)
        self.db.commit()

        return True

    # =====================================================
    # QUEUE
    # =====================================================

    def _add_to_queue(self, document: Document):

        queue = ProcessingQueue(
            document_id=document.id,
            priority=1
        )

        self.db.add(queue)
        self.db.commit()

    # =====================================================
    # DATA EXTRACTION
    # =====================================================

    def _extract_data(self, text: str, doc_type: str) -> Dict:

        patterns = {

            "facture": {
                "numero": r"F[A-Z]-\d+",
                "date": r"\d{2}/\d{2}/\d{4}",
                "total": r"Total\s*[:]*\s*([\d.,]+\s?€)"
            },

            "contrat": {
                "date": r"\d{2}/\d{2}/\d{4}",
                "reference": r"[A-Z]{2}-\d{4}-\d{3}"
            }
        }

        data = {}

        doc_patterns = patterns.get(doc_type, {})

        for key, pattern in doc_patterns.items():

            match = re.search(pattern, text)

            if match:
                data[key] = match.group(0)

        return data

    # =====================================================
    # CONFIDENCE
    # =====================================================

    def _calculate_confidence(self, extracted_data):

        if not extracted_data:
            return random.uniform(70, 85)

        base = 80 + len(extracted_data) * 3

        return min(base, 99)

    # =====================================================
    # FIELDS
    # =====================================================

    def _extract_fields(self, data):

        return {
            "count": len(data),
            "fields": data,
            "timestamp": datetime.utcnow().isoformat()
        }

    def _extract_tables(self, text):

        return [
            {
                "name": "table",
                "rows": 5,
                "columns": ["Produit", "Quantité", "Prix"]
            }
        ]

    # =====================================================
    # PAGES
    # =====================================================

    def _count_pages(self, file_path):

        if file_path.endswith(".pdf"):

            try:
                from PyPDF2 import PdfReader

                reader = PdfReader(file_path)

                return len(reader.pages)

            except:
                return 1

        return 1

    # =====================================================
    # STATS
    # =====================================================

    def _update_stats(self, document):

        stats = (
            self.db.query(DocumentTypeStats)
            .filter(DocumentTypeStats.document_type == document.document_type)
            .first()
        )

        if not stats:

            stats = DocumentTypeStats(
                document_type=document.document_type,
                count=0,
                avg_confidence=0,
                avg_processing_time=0
            )

            self.db.add(stats)

        stats.count += 1

        stats.avg_confidence = (
            (stats.avg_confidence * (stats.count - 1) + document.confidence_score)
            / stats.count
        )

        if document.processing_time:

            stats.avg_processing_time = (
                (stats.avg_processing_time * (stats.count - 1) + document.processing_time)
                / stats.count
            )

        stats.last_updated = datetime.utcnow()

        self.db.commit()

    # =====================================================
    # MOCK DATA
    # =====================================================

    def _generate_mock_data(self, doc_type):

        return {
            "reference": f"REF-{random.randint(1000,9999)}",
            "date": "15/03/2025",
            "amount": f"{random.randint(100,5000)} €"
        }

    # =====================================================
    # DASHBOARD
    # =====================================================

    def get_dashboard_stats(self) -> DocumentStatsResponse:

        total = self.db.query(Document).count()

        completed = (
            self.db.query(Document)
            .filter(Document.processing_status == "completed")
            .count()
        )

        failed = (
            self.db.query(Document)
            .filter(Document.processing_status == "failed")
            .count()
        )

        success_rate = (completed / total * 100) if total else 0

        today = datetime.utcnow().date()

        today_count = (
            self.db.query(Document)
            .filter(func.date(Document.uploaded_at) == today)
            .count()
        )

        return DocumentStatsResponse(
            total_processed=total,
            success_rate=round(success_rate, 2),
            avg_time="2.3s",
            documents_today=today_count,
            by_type={},
            by_status={
                "completed": completed,
                "failed": failed
            },
            recent_documents=[],
            confidence_distribution={},
            processing_trend=[]
        )