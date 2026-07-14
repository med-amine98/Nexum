from typing import Dict, Any
from datetime import datetime

class ReimbursementService:
    """Service de calcul des remboursements"""
    
    REIMBURSEMENT_RATES = {
        "consultation_generaliste": {"base": 0.70, "mutuelle": 0.30, "plafond": 25, "code": "CS001"},
        "consultation_specialiste": {"base": 0.70, "mutuelle": 0.30, "plafond": 60, "code": "CS002"},
        "medicament": {"base": 0.65, "mutuelle": 0.35, "plafond": 50, "code": "MED001"},
        "analyse": {"base": 0.70, "mutuelle": 0.30, "plafond": 100, "code": "LAB001"},
        "radiologie": {"base": 0.70, "mutuelle": 0.30, "plafond": 120, "code": "RAD001"},
        "hospitalisation": {"base": 0.80, "mutuelle": 0.20, "plafond": 2000, "code": "HOS001"},
        "ambulance": {"base": 0.65, "mutuelle": 0.35, "plafond": 300, "code": "AMB001"},
        "paramedical": {"base": 0.60, "mutuelle": 0.40, "plafond": 50, "code": "PAR001"}
    }
    
    @classmethod
    def simulate(cls, act_type: str, amount: float) -> Dict[str, Any]:
        """Simule un remboursement avec details"""
        
        rates = cls.REIMBURSEMENT_RATES.get(act_type, {"base": 0.60, "mutuelle": 0.20, "plafond": amount, "code": "GEN001"})
        
        # Appliquer le plafond
        plafond = rates.get("plafond", amount)
        montant_remboursable = min(amount, plafond)
        
        base_reimbursement = round(montant_remboursable * rates["base"], 2)
        mutuelle_reimbursement = round(montant_remboursable * rates["mutuelle"], 2)
        patient_share = round(amount - base_reimbursement - mutuelle_reimbursement, 2)
        
        if patient_share < 0:
            patient_share = 0
        
        return {
            "total_amount": amount,
            "base_reimbursement": base_reimbursement,
            "mutuelle_reimbursement": mutuelle_reimbursement,
            "patient_share": patient_share,
            "plafond_applique": plafond,
            "taux_base": f"{int(rates['base'] * 100)}%",
            "taux_mutuelle": f"{int(rates['mutuelle'] * 100)}%",
            "code_acte": rates["code"],
            "date_simulation": datetime.now().strftime("%d/%m/%Y %H:%M")
        }