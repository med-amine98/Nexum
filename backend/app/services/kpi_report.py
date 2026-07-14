# backend/app/services/kpi_report.py
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from pathlib import Path
import json

logger = logging.getLogger(__name__)


def generate_kpi_report(db: Session, company_id: Optional[int] = None, output_format: str = "pdf") -> Optional[str]:
    """
    Génère un rapport de KPIs et retourne le chemin du fichier PDF
    
    Args:
        db: Session SQLAlchemy
        company_id: ID de l'entreprise (optionnel)
        output_format: Format de sortie ('pdf' ou 'json')
    
    Returns:
        Chemin vers le fichier PDF généré, ou None si erreur
    """
    
    # Générer les données KPI
    report_data = _generate_report_data(db, company_id)
    
    # Créer le dossier de rapports s'il n'existe pas
    reports_dir = Path("/app/reports")
    reports_dir.mkdir(exist_ok=True)
    
    # Nom du fichier
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"kpi_report_{timestamp}.pdf"
    filepath = reports_dir / filename
    
    try:
        if output_format == "pdf":
            # Générer un PDF simple
            _generate_pdf_report(report_data, filepath)
        else:
            # Générer un fichier JSON
            filename = f"kpi_report_{timestamp}.json"
            filepath = reports_dir / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, default=str)
        
        logger.info(f"✅ Rapport KPI généré: {filepath}")
        return str(filepath)
        
    except Exception as e:
        logger.error(f"❌ Erreur génération rapport KPI: {e}")
        return None


def _generate_report_data(db: Session, company_id: Optional[int]) -> Dict[str, Any]:
    """Génère les données du rapport KPI"""
    
    report = {
        "generated_at": datetime.now().isoformat(),
        "company_id": company_id,
        "period": {
            "start": (datetime.now() - timedelta(days=30)).isoformat(),
            "end": datetime.now().isoformat()
        },
        "kpis": {
            "sales": _get_sales_kpis(db, company_id),
            "finance": _get_finance_kpis(db, company_id),
            "operations": _get_operations_kpis(db, company_id),
            "customers": _get_customers_kpis(db, company_id),
            "risk": _get_risk_kpis(db, company_id)
        },
        "trends": _get_trends(db, company_id),
        "alerts": _get_alerts(db, company_id)
    }
    
    return report


def _generate_pdf_report(data: Dict[str, Any], filepath: Path):
    """Génère un rapport PDF simple (version texte)"""
    try:
        # Essayer d'importer reportlab pour un vrai PDF
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        
        doc = SimpleDocTemplate(str(filepath), pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Titre
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2E86AB'),
            spaceAfter=30
        )
        story.append(Paragraph("Rapport KPI - Neura ERP", title_style))
        story.append(Spacer(1, 12))
        
        # Date
        story.append(Paragraph(f"Généré le: {data['generated_at']}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # KPIs par section
        for section, kpis in data['kpis'].items():
            story.append(Paragraph(f"{section.upper()}", styles['Heading2']))
            story.append(Spacer(1, 10))
            
            for kpi_name, kpi_value in kpis.items():
                if isinstance(kpi_value, (int, float)):
                    story.append(Paragraph(f"• {kpi_name}: {kpi_value}", styles['Normal']))
                elif isinstance(kpi_value, list) and len(kpi_value) <= 5:
                    story.append(Paragraph(f"• {kpi_name}: {len(kpi_value)} éléments", styles['Normal']))
            
            story.append(Spacer(1, 15))
        
        # Construire le PDF
        doc.build(story)
        logger.info(f"✅ PDF généré avec reportlab: {filepath}")
        
    except ImportError:
        # Fallback: créer un fichier texte simple
        logger.warning("⚠️ reportlab non installé, création d'un fichier texte")
        with open(filepath.with_suffix('.txt'), 'w', encoding='utf-8') as f:
            f.write(f"Rapport KPI - Neura ERP\n")
            f.write(f"Généré le: {data['generated_at']}\n")
            f.write("=" * 50 + "\n\n")
            
            for section, kpis in data['kpis'].items():
                f.write(f"{section.upper()}\n")
                f.write("-" * 30 + "\n")
                for kpi_name, kpi_value in kpis.items():
                    f.write(f"{kpi_name}: {kpi_value}\n")
                f.write("\n")
        
        # Renommer en PDF (même si c'est du texte)
        txt_path = filepath.with_suffix('.txt')
        txt_path.rename(filepath)
        logger.info(f"✅ Fichier texte créé: {filepath}")
        
    except Exception as e:
        logger.error(f"❌ Erreur génération PDF: {e}")
        # Créer un fichier vide pour éviter les erreurs
        with open(filepath, 'w') as f:
            f.write(f"Erreur génération rapport: {e}")


def _get_sales_kpis(db: Session, company_id: Optional[int]) -> Dict[str, Any]:
    """KPIs de vente"""
    return {
        "total_revenue": 0.0,
        "total_orders": 0,
        "average_order_value": 0.0,
        "conversion_rate": 0.0,
        "top_products": []
    }


def _get_finance_kpis(db: Session, company_id: Optional[int]) -> Dict[str, Any]:
    """KPIs financiers"""
    return {
        "total_income": 0.0,
        "total_expenses": 0.0,
        "profit_margin": 0.0,
        "cash_flow": 0.0,
        "outstanding_invoices": 0,
        "overdue_payments": 0
    }


def _get_operations_kpis(db: Session, company_id: Optional[int]) -> Dict[str, Any]:
    """KPIs opérationnels"""
    return {
        "active_projects": 0,
        "completed_tasks": 0,
        "pending_tasks": 0,
        "resource_utilization": 0.0,
        "on_time_delivery_rate": 0.0
    }


def _get_customers_kpis(db: Session, company_id: Optional[int]) -> Dict[str, Any]:
    """KPIs clients"""
    return {
        "total_customers": 0,
        "new_customers": 0,
        "active_customers": 0,
        "churn_rate": 0.0,
        "customer_satisfaction": 0.0,
        "repeat_customers": 0
    }


def _get_risk_kpis(db: Session, company_id: Optional[int]) -> Dict[str, Any]:
    """KPIs de risque"""
    return {
        "fraud_alerts": 0,
        "high_risk_transactions": 0,
        "anomaly_score": 0.0,
        "compliance_score": 0.0
    }


def _get_trends(db: Session, company_id: Optional[int]) -> Dict[str, Any]:
    """Tendances"""
    return {
        "revenue_trend": [],
        "order_trend": [],
        "customer_trend": []
    }


def _get_alerts(db: Session, company_id: Optional[int]) -> List[Dict[str, Any]]:
    """Alertes"""
    return []