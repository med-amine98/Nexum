import os
from datetime import datetime
try:
    from fpdf import FPDF
    FPDF_AVAILABLE = True
except ImportError:
    FPDF_AVAILABLE = False
    FPDF = None
import pandas as pd
import json

class ReportingService:
    def __init__(self):
        self.report_dir = "storage/reports"
        os.makedirs(self.report_dir, exist_ok=True)

    def _create_base_pdf(self, title, sector):
        if not FPDF_AVAILABLE:
            return None
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_font("helvetica", "B", 20)
        pdf.set_text_color(65, 88, 208)
        pdf.cell(0, 15, title, 0, 1, "C")
        
        pdf.set_font("helvetica", "I", 10)
        pdf.set_text_color(128, 128, 128)
        pdf.cell(0, 10, f"Rapport généré par Nexum AI - Secteur {sector}", 0, 1, "C")
        pdf.cell(0, 5, f"Date: {datetime.now().strftime('%d/%m/%Y %H:%M')}", 0, 1, "C")
        pdf.ln(10)
        
        return pdf

    def _draw_comparison_table(self, pdf, current_val, prev_val, label, unit=""):
        """Dessine une ligne de comparaison avec tendance"""
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(60, 10, label, 1)
        
        pdf.set_font("helvetica", "", 10)
        pdf.cell(45, 10, f"{prev_val:,} {unit}", 1, 0, "C")
        pdf.cell(45, 10, f"{current_val:,} {unit}", 1, 0, "C")
        
        # Calcul tendance
        if prev_val > 0:
            change = ((current_val - prev_val) / prev_val) * 100
            color = (0, 150, 0) if change >= 0 else (200, 0, 0)
            sign = "+" if change >= 0 else ""
            trend_text = f"{sign}{change:.1f}%"
        else:
            trend_text = "N/A"
            color = (100, 100, 100)
            
        pdf.set_text_color(*color)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(40, 10, trend_text, 1, 1, "C")
        pdf.set_text_color(0, 0, 0)

    def generate_banking_report(self, data: dict):
        """Génère un rapport d'analyse bancaire avec comparaison trimestrielle"""
        pdf = self._create_base_pdf("RAPPORT D'ACTIVITÉ BANCAIRE", "BANKING")
        if not pdf:
            return {"status": "error", "message": "FPDF non installé"}
        
        # Section Comparaison
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "1. Comparaison Inter-Trimestrielle (QoQ)", 0, 1)
        
        # Header tableau
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(60, 10, " Indicateur", 1, 0, "L", True)
        pdf.cell(45, 10, " Trimestre Précédent", 1, 0, "C", True)
        pdf.cell(45, 10, " Trimestre Actuel", 1, 0, "C", True)
        pdf.cell(40, 10, " Évolution", 1, 1, "C", True)
        
        comp = data.get("comparison", {})
        self._draw_comparison_table(pdf, data.get('total_volume', 0), comp.get('prev_volume', 0), " Volume Transactions", "EUR")
        self._draw_comparison_table(pdf, data.get('tx_count', 0), comp.get('prev_tx_count', 0), " Nombre Transactions")
        self._draw_comparison_table(pdf, data.get('fraud_alerts', 0), comp.get('prev_fraud_alerts', 0), " Alertes Fraude")
        
        pdf.ln(10)
        # Security Analysis
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "2. Analyse de Sécurité & Fraude (IA GNN)", 0, 1)
        
        filename = f"banking_report_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
        filepath = os.path.join(self.report_dir, filename)
        pdf.output(filepath)
        return {"status": "success", "path": filepath}

    def generate_insurance_report(self, data: dict):
        """Génère un rapport de sinistres avec comparaison trimestrielle"""
        pdf = self._create_base_pdf("RAPPORT DE SINISTRALITÉ & RISQUES", "INSURANCE")
        if not pdf:
            return {"status": "error", "message": "FPDF non installé"}

        # Section Comparaison
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "1. Comparaison Inter-Trimestrielle (QoQ)", 0, 1)
        
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(60, 10, " Indicateur", 1, 0, "L", True)
        pdf.cell(45, 10, " Trimestre Précédent", 1, 0, "C", True)
        pdf.cell(45, 10, " Trimestre Actuel", 1, 0, "C", True)
        pdf.cell(40, 10, " Évolution", 1, 1, "C", True)
        
        comp = data.get("comparison", {})
        self._draw_comparison_table(pdf, data.get('claims_count', 0), comp.get('prev_claims_count', 0), " Sinistres Déclarés")
        self._draw_comparison_table(pdf, data.get('total_payouts', 0), comp.get('prev_total_payouts', 0), " Indemnisations", "EUR")
        
        pdf.ln(10)
        # Parametric Triggering
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "2. Déclenchements Paramétriques Web3", 0, 1)

        filename = f"insurance_report_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
        filepath = os.path.join(self.report_dir, filename)
        pdf.output(filepath)
        return {"status": "success", "path": filepath}

    def generate_enterprise_report(self, data: dict):
        """Génère un rapport de performance avec comparaison trimestrielle"""
        pdf = self._create_base_pdf("RAPPORT DE PERFORMANCE ENTREPRISE", "ENTERPRISE")
        if not pdf:
            return {"status": "error", "message": "FPDF non installé"}

        # Section Comparaison
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "1. Comparaison Inter-Trimestrielle (QoQ)", 0, 1)
        
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(60, 10, " Indicateur", 1, 0, "L", True)
        pdf.cell(45, 10, " Trimestre Précédent", 1, 0, "C", True)
        pdf.cell(45, 10, " Trimestre Actuel", 1, 0, "C", True)
        pdf.cell(40, 10, " Évolution", 1, 1, "C", True)
        
        comp = data.get("comparison", {})
        self._draw_comparison_table(pdf, data.get('stock_opt', 0), comp.get('prev_stock_opt', 0), " Optimisation Stock", "%")
        self._draw_comparison_table(pdf, data.get('logistics_eff', 0), comp.get('prev_logistics_eff', 0), " Efficacité Logistique", "%")
        
        pdf.ln(10)
        # Sales Forecast
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "2. Prévisions de Ventes (XGBoost)", 0, 1)

        filename = f"enterprise_report_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
        filepath = os.path.join(self.report_dir, filename)
        pdf.output(filepath)
        return {"status": "success", "path": filepath}

reporting_service = ReportingService()
