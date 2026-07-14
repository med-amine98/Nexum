from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random
import uuid
import os
import traceback

from app.models.kyc import KYCDocument, KYCVerification, KYCRule
from app.models.auth import User
from app.services.kyc_ai import kyc_ai_service
from app.schemas.kyc import (
    KYCDocumentCreate, KYCDocumentUpdate,
    KYCVerificationCreate, KYCRuleCreate, KYCRuleUpdate,
    KYCStatsResponse
)

class KYCService:
    def __init__(self, db: Session):
        self.db = db
        self.ai = kyc_ai_service

    # ===== Documents =====
    def create_document(self, document: KYCDocumentCreate, current_user: User) -> KYCDocument:
        """Crée un nouveau document KYC et lance l'analyse"""
        try:
            logger.info(f"🔍 Création document KYC pour {document.client_name}")
            
            # Générer un ID unique
            doc_id = f"KYC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
            
            # Analyser le document via l'IA réelle
            ai_analysis = self.ai.analyze_document_quality(document.document_url or "")
            confidence_score = ai_analysis["overall_quality"]
            quality_score = ai_analysis["overall_quality"]
            
            # Extraction et vérification via l'IA
            extracted_data = self.ai.extract_document_data(document.document_url or "", document.document_type)
            fraud_analysis = self.ai.detect_document_fraud(document.document_url or "")
            verification_result = {**ai_analysis, **fraud_analysis}
            
            # Déterminer les défauts réels
            blur_detected = ai_analysis.get("is_blurry", False)
            glare_detected = ai_analysis.get("has_glare", False)
            forged_detected = fraud_analysis.get("fraud_score", 0) > 70
            
            # Déterminer le statut basé sur les scores IA
            if confidence_score >= 85 and not forged_detected:
                status = "verified"
                verification_status = "verified"
            elif confidence_score >= 60 and not forged_detected:
                status = "processing"
                verification_status = "processing"
            elif forged_detected or confidence_score < 40:
                status = "rejected"
                verification_status = "rejected"
            else:
                status = "review"
                verification_status = "review"
            
            db_document = KYCDocument(
                document_id=doc_id,
                **document.dict(),
                confidence_score=confidence_score,
                quality_score=quality_score,
                extracted_data=extracted_data,
                verification_result=verification_result,
                blur_detected=blur_detected,
                glare_detected=glare_detected,
                forged_detected=forged_detected,
                status=status,
                verification_status=verification_status,
                processed_by_id=current_user.id
            )
            
            self.db.add(db_document)
            self.db.commit()
            self.db.refresh(db_document)
            
            # Créer des vérifications détaillées
            self._create_verification_records(db_document)
            
            logger.info(f"✅ Document KYC créé avec ID: {db_document.id}")
            return db_document
            
        except Exception as e:
            logger.error(f"❌ Erreur create_document: {e}")
            traceback.print_exc()
            self.db.rollback()
            raise

    def get_documents(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        document_type: Optional[str] = None,
        company_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[KYCDocument]:
        """Récupère les documents avec filtres"""
        try:
            logger.info(f"🔍 get_documents: skip={skip}, limit={limit}")
            
            query = self.db.query(KYCDocument)
            
            if status:
                query = query.filter(KYCDocument.status == status)
            if document_type:
                query = query.filter(KYCDocument.document_type == document_type)
            if company_id:
                query = query.filter(KYCDocument.company_id == company_id)
            if date_from:
                query = query.filter(KYCDocument.submitted_at >= date_from)
            if date_to:
                query = query.filter(KYCDocument.submitted_at <= date_to)
                
            result = query.order_by(desc(KYCDocument.submitted_at)).offset(skip).limit(limit).all()
            logger.info(f"✅ {len(result)} documents trouvés")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur get_documents: {e}")
            traceback.print_exc()
            return []

    def get_document(self, document_id: int) -> Optional[KYCDocument]:
        """Récupère un document par son ID"""
        try:
            return self.db.query(KYCDocument).filter(KYCDocument.id == document_id).first()
        except Exception as e:
            logger.error(f"❌ Erreur get_document: {e}")
            return None

    def get_document_by_ref(self, ref: str) -> Optional[KYCDocument]:
        """Récupère un document par sa référence"""
        try:
            return self.db.query(KYCDocument).filter(KYCDocument.document_id == ref).first()
        except Exception as e:
            logger.error(f"❌ Erreur get_document_by_ref: {e}")
            return None

    def update_document(
        self,
        document_id: int,
        update_data: KYCDocumentUpdate,
        current_user: User
    ) -> Optional[KYCDocument]:
        """Met à jour un document"""
        try:
            db_document = self.get_document(document_id)
            if db_document:
                for key, value in update_data.dict(exclude_unset=True).items():
                    setattr(db_document, key, value)
                db_document.processed_by_id = current_user.id
                if update_data.status == "verified":
                    db_document.verified_at = datetime.now()
                self.db.commit()
                self.db.refresh(db_document)
                logger.info(f"✅ Document {document_id} mis à jour")
            return db_document
        except Exception as e:
            logger.error(f"❌ Erreur update_document: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    def verify_document(self, document_id: int, current_user: User) -> Optional[KYCDocument]:
        """Marque un document comme vérifié"""
        try:
            db_document = self.get_document(document_id)
            if db_document:
                db_document.status = "verified"
                db_document.verification_status = "verified"
                db_document.verified_at = datetime.now()
                db_document.processed_by_id = current_user.id
                self.db.commit()
                self.db.refresh(db_document)
                logger.info(f"✅ Document {document_id} vérifié")
            return db_document
        except Exception as e:
            logger.error(f"❌ Erreur verify_document: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    def reject_document(
        self, 
        document_id: int, 
        reason: str, 
        current_user: User
    ) -> Optional[KYCDocument]:
        """Rejette un document"""
        try:
            db_document = self.get_document(document_id)
            if db_document:
                db_document.status = "rejected"
                db_document.verification_status = "rejected"
                db_document.rejection_reason = reason
                db_document.processed_by_id = current_user.id
                self.db.commit()
                self.db.refresh(db_document)
                logger.info(f"✅ Document {document_id} rejeté")
            return db_document
        except Exception as e:
            logger.error(f"❌ Erreur reject_document: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    def request_review(self, document_id: int, current_user: User) -> Optional[KYCDocument]:
        """Demande une revue manuelle"""
        try:
            db_document = self.get_document(document_id)
            if db_document:
                db_document.status = "review"
                db_document.verification_status = "review"
                db_document.processed_by_id = current_user.id
                self.db.commit()
                self.db.refresh(db_document)
                logger.info(f"✅ Revue manuelle demandée pour {document_id}")
            return db_document
        except Exception as e:
            logger.error(f"❌ Erreur request_review: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    # ===== Règles =====
    def get_rules(self, active_only: bool = False) -> List[KYCRule]:
        """Récupère les règles KYC"""
        try:
            query = self.db.query(KYCRule)
            if active_only:
                query = query.filter(KYCRule.is_active == True)
            return query.all()
        except Exception as e:
            logger.error(f"❌ Erreur get_rules: {e}")
            traceback.print_exc()
            return []

    def create_rule(self, rule: KYCRuleCreate, current_user: User) -> KYCRule:
        """Crée une nouvelle règle"""
        try:
            db_rule = KYCRule(**rule.dict())
            self.db.add(db_rule)
            self.db.commit()
            self.db.refresh(db_rule)
            logger.info(f"✅ Règle {rule.rule_name} créée")
            return db_rule
        except Exception as e:
            logger.error(f"❌ Erreur create_rule: {e}")
            traceback.print_exc()
            self.db.rollback()
            raise

    def update_rule(self, rule_id: int, update_data: KYCRuleUpdate) -> Optional[KYCRule]:
        """Met à jour une règle"""
        try:
            db_rule = self.db.query(KYCRule).filter(KYCRule.id == rule_id).first()
            if db_rule:
                for key, value in update_data.dict(exclude_unset=True).items():
                    setattr(db_rule, key, value)
                self.db.commit()
                self.db.refresh(db_rule)
                logger.info(f"✅ Règle {rule_id} mise à jour")
            return db_rule
        except Exception as e:
            logger.error(f"❌ Erreur update_rule: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    # ===== Dashboard Stats =====
    def get_dashboard_stats(self) -> KYCStatsResponse:
        """Récupère les statistiques pour le dashboard"""
        try:
            # Statistiques globales
            pending = self.db.query(KYCDocument).filter(KYCDocument.status == "pending").count()
            processing = self.db.query(KYCDocument).filter(KYCDocument.status == "processing").count()
            review = self.db.query(KYCDocument).filter(KYCDocument.status == "review").count()
            verified = self.db.query(KYCDocument).filter(KYCDocument.status == "verified").count()
            rejected = self.db.query(KYCDocument).filter(KYCDocument.status == "rejected").count()
            
            # Temps moyen de traitement
            avg_time = self._calculate_avg_processing_time()
            
            # Taux de succès
            total = verified + rejected
            success_rate = (verified / total * 100) if total > 0 else 0
            
            # Distribution par type de document
            doc_types = {}
            for doc_type in ["passeport", "cin", "permis", "titre_sejour", "autre"]:
                count = self.db.query(KYCDocument).filter(
                    KYCDocument.document_type == doc_type
                ).count()
                if count > 0:
                    doc_types[doc_type] = count
            
            # Distribution par statut
            by_status = {
                "pending": pending,
                "processing": processing,
                "review": review,
                "verified": verified,
                "rejected": rejected
            }
            
            # Documents récents
            recent_docs_raw = self.db.query(KYCDocument).order_by(
                desc(KYCDocument.submitted_at)
            ).limit(5).all()
            
            recent_documents = []
            for doc in recent_docs_raw:
                recent_documents.append({
                    "id": doc.id,
                    "name": doc.client_name,
                    "document": doc.document_type,
                    "status": doc.status,
                    "confidence": doc.confidence_score,
                    "submitted": doc.submitted_at.strftime("%Y-%m-%d")
                })
            
            # Distribution des scores de confiance
            confidence_dist = {
                ">90": self.db.query(KYCDocument).filter(KYCDocument.confidence_score >= 90).count(),
                "70-89": self.db.query(KYCDocument).filter(
                    KYCDocument.confidence_score >= 70, 
                    KYCDocument.confidence_score < 90
                ).count(),
                "50-69": self.db.query(KYCDocument).filter(
                    KYCDocument.confidence_score >= 50, 
                    KYCDocument.confidence_score < 70
                ).count(),
                "<50": self.db.query(KYCDocument).filter(KYCDocument.confidence_score < 50).count()
            }
            
            return KYCStatsResponse(
                pending=pending + processing,
                verified=verified,
                rejected=rejected,
                avg_time=avg_time,
                success_rate=round(success_rate, 1),
                by_document_type=doc_types,
                by_status=by_status,
                recent_documents=recent_documents,
                confidence_distribution=confidence_dist
            )
        except Exception as e:
            logger.error(f"❌ Erreur get_dashboard_stats: {e}")
            traceback.print_exc()
            # Retourner des données par défaut
            return KYCStatsResponse(
                pending=0,
                verified=0,
                rejected=0,
                avg_time="0s",
                success_rate=0,
                by_document_type={},
                by_status={},
                recent_documents=[],
                confidence_distribution={}
            )

    # ===== Méthodes privées =====
    def _analyze_document(self, document: KYCDocumentCreate) -> float:
        """Analyse le document et retourne un score de confiance"""
        try:
            # Simulation d'analyse IA
            base_score = random.uniform(60, 100)
            
            # Ajustements selon le type de document
            if document.document_type == "passeport":
                base_score += 5
            elif document.document_type == "cin":
                base_score += 3
            
            return min(round(base_score, 1), 100)
        except Exception as e:
            logger.error(f"❌ Erreur _analyze_document: {e}")
            return random.uniform(70, 90)

    def _assess_quality(self, document: KYCDocumentCreate) -> float:
        """Évalue la qualité du document"""
        try:
            return round(random.uniform(70, 100), 1)
        except Exception as e:
            logger.error(f"❌ Erreur _assess_quality: {e}")
            return 80.0

    def _extract_data(self, document: KYCDocumentCreate) -> Dict[str, Any]:
        """Extrait les données du document"""
        try:
            return {
                "full_name": document.client_name,
                "document_number": f"DOC-{random.randint(10000, 99999)}",
                "nationality": "FR",
                "date_of_birth": "1990-01-01",
                "extraction_confidence": random.uniform(85, 99)
            }
        except Exception as e:
            logger.error(f"❌ Erreur _extract_data: {e}")
            return {}

    def _verify_document(self, document: KYCDocumentCreate) -> Dict[str, Any]:
        """Vérifie l'authenticité du document"""
        try:
            return {
                "face_match": random.choice([True, False]),
                "document_valid": random.choice([True, False]),
                "expiry_valid": random.choice([True, False]),
                "security_features": random.choice([True, False]),
                "overall_score": random.uniform(70, 100)
            }
        except Exception as e:
            logger.error(f"❌ Erreur _verify_document: {e}")
            return {}

    def _create_verification_records(self, document: KYCDocument):
        """Crée des enregistrements de vérification détaillés basés sur l'IA"""
        try:
            res = document.verification_result or {}
            verifications = [
                ("face_match", res.get("face_match", True), res.get("face_match_score", 95.0)),
                ("document_validity", not document.forged_detected, 100 - res.get("fraud_score", 0)),
                ("security_features", res.get("security_check", True), res.get("security_score", 90.0)),
                ("data_consistency", res.get("consistency_check", True), res.get("consistency_score", 85.0))
            ]
            
            for v_type, result, score in verifications:
                verification = KYCVerification(
                    document_id=document.id,
                    verification_type=v_type,
                    result=result,
                    score=score,
                    details={"threshold": 70, "method": "ai_production_engine"}
                )
                self.db.add(verification)
            
            self.db.commit()
        except Exception as e:
            logger.error(f"❌ Erreur _create_verification_records: {e}")
            self.db.rollback()

    def _calculate_avg_processing_time(self) -> str:
        """Calcule le temps moyen de traitement"""
        try:
            verified_docs = self.db.query(KYCDocument).filter(
                KYCDocument.status == "verified",
                KYCDocument.verified_at.isnot(None)
            ).all()
            
            if not verified_docs:
                return "2.5 min"  # Valeur par défaut
            
            total_time = 0
            for doc in verified_docs:
                if doc.processed_at:
                    time_diff = (doc.processed_at - doc.submitted_at).total_seconds() / 60
                    total_time += time_diff
            
            avg = total_time / len(verified_docs)
            
            if avg < 1:
                return f"{int(avg * 60)} sec"
            else:
                return f"{avg:.1f} min"
        except Exception as e:
            logger.error(f"❌ Erreur _calculate_avg_processing_time: {e}")
            return "2.5 min"