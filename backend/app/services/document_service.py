import os
import shutil
from typing import Dict, Any
from datetime import datetime
from app.config import settings

class DocumentService:
    """Service de gestion des documents"""
    
    @staticmethod
    async def save_document(file, user_id: int, consultation_id: int = None) -> Dict[str, Any]:
        """Sauvegarde un document uploadé"""
        
        # Générer un nom de fichier unique
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"user_{user_id}_{timestamp}_{file.filename}"
        file_path = os.path.join(settings.upload_dir, safe_filename)
        
        # Sauvegarder le fichier
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extraire le texte (simplifié)
        extracted_text = f"Document: {file.filename}"
        
        return {
            "document_id": f"DOC-{timestamp}",
            "file_name": file.filename,
            "file_path": file_path,
            "file_size": os.path.getsize(file_path),
            "extracted_text": extracted_text,
            "uploaded_at": datetime.utcnow()
        }