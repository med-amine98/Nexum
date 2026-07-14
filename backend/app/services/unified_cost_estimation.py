# app/services/unified_cost_estimation.py
import torch
import torch.nn.functional as F
from transformers import AutoImageProcessor, AutoModelForImageClassification
from ultralytics import YOLO
from PIL import Image
import io
import base64
import json
from pathlib import Path
import sys

class UnifiedCostEstimationService:
    """
    Service unifié pour l'estimation des coûts de réparation/indemnisation
    """
    
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Modèles pré-entraînés
        self.yolo_model = None
        self.damage_classifier = None
        
        # Base de données des coûts
        self.cost_database = self._load_cost_database()
        
        logger.info("=" * 60)
        logger.info("💰 INITIALISATION SERVICE D'ESTIMATION DES COÛTS")
        logger.info("=" * 60)
        
        self.load_models()
        logger.info(f"✅ Service prêt - {len(self.cost_database)} références de prix chargées")
    
    def _load_cost_database(self):
        """Charge la base de données des coûts de réparation"""
        return {
            # ========== ACCIDENT AUTOMOBILE ==========
            "accident": {
                "pare-chocs_avant": {"part_cost": 250, "labor_hours": 1.5, "paint": 120, "total": 535},
                "pare-chocs_arriere": {"part_cost": 220, "labor_hours": 1.2, "paint": 120, "total": 484},
                "porte_avant_gauche": {"part_cost": 350, "labor_hours": 2.0, "paint": 150, "total": 680},
                "porte_avant_droite": {"part_cost": 350, "labor_hours": 2.0, "paint": 150, "total": 680},
                "porte_arriere_gauche": {"part_cost": 320, "labor_hours": 1.8, "paint": 150, "total": 650},
                "porte_arriere_droite": {"part_cost": 320, "labor_hours": 1.8, "paint": 150, "total": 650},
                "capot": {"part_cost": 400, "labor_hours": 2.5, "paint": 180, "total": 805},
                "coffre": {"part_cost": 380, "labor_hours": 2.2, "paint": 180, "total": 780},
                "aile_avant_gauche": {"part_cost": 180, "labor_hours": 1.2, "paint": 120, "total": 426},
                "aile_avant_droite": {"part_cost": 180, "labor_hours": 1.2, "paint": 120, "total": 426},
                "retroviseur_gauche": {"part_cost": 120, "labor_hours": 0.8, "paint": 0, "total": 156},
                "retroviseur_droit": {"part_cost": 120, "labor_hours": 0.8, "paint": 0, "total": 156},
                "phare_avant_gauche": {"part_cost": 280, "labor_hours": 0.7, "paint": 0, "total": 311},
                "phare_avant_droit": {"part_cost": 280, "labor_hours": 0.7, "paint": 0, "total": 311},
                "feu_arriere_gauche": {"part_cost": 150, "labor_hours": 0.5, "paint": 0, "total": 172},
                "feu_arriere_droit": {"part_cost": 150, "labor_hours": 0.5, "paint": 0, "total": 172},
                "pare_brise_avant": {"part_cost": 450, "labor_hours": 1.5, "paint": 0, "total": 517},
                "pare_brise_arriere": {"part_cost": 400, "labor_hours": 1.2, "paint": 0, "total": 454},
                "roue": {"part_cost": 150, "labor_hours": 0.5, "paint": 0, "total": 172},
                "pneu": {"part_cost": 120, "labor_hours": 0.3, "paint": 0, "total": 133}
            },
            
            # ========== SINISTRE HABITATION ==========
            "habitation": {
                "mur": {"cost_per_m2": 80, "labor_hours_per_m2": 1.5, "total": 140},
                "plafond": {"cost_per_m2": 60, "labor_hours_per_m2": 1.2, "total": 108},
                "sol": {"cost_per_m2": 70, "labor_hours_per_m2": 1.0, "total": 115},
                "toiture": {"cost_per_m2": 120, "labor_hours_per_m2": 2.0, "total": 210},
                "fenetre": {"part_cost": 300, "labor_hours": 1.5, "paint": 0, "total": 367},
                "porte": {"part_cost": 400, "labor_hours": 2.0, "paint": 0, "total": 490},
                "electricite": {"cost_per_point": 50, "labor_hours": 0.5, "total": 72},
                "plomberie": {"cost_per_point": 80, "labor_hours": 1.0, "total": 125},
                "chauffage": {"cost_per_radiator": 200, "labor_hours": 1.5, "total": 267},
                "peinture": {"cost_per_m2": 15, "labor_hours_per_m2": 0.3, "total": 28},
                "isolation": {"cost_per_m2": 40, "labor_hours_per_m2": 0.8, "total": 76}
            },
            
            # ========== SINISTRE AGRICOLE ==========
            "agricole": {
                "healthy": 0,
                "early_blight": 150,
                "late_blight": 300,
                "leaf_mold": 100,
                "septoria": 120,
                "spider_mites": 80,
                "yellow_curl_virus": 500,
                "bacterial_spot": 200,
                "cow_disease": 400,
                "poultry_disease": 200
            },
            
            # ========== SANTÉ ==========
            "sante": {
                "consultation": 25,
                "specialiste": 50,
                "hospitalisation_jour": 800,
                "medicaments": 30,
                "optique": 150,
                "dentaire": 100,
                "ambulance": 100,
                "analyse": 40
            },
            
            # ========== TRANSPORT / LOGISTIQUE ==========
            "transport": {
                "colis_standard": 50,
                "colis_fragile": 100,
                "colis_valeur": 200,
                "palette": 500,
                "conteneur": 2000,
                "frais_livraison": 20
            },
            
            # ========== CATASTROPHE NATURELLE ==========
            "catastrophe": {
                "degats_leger": 2000,
                "degats_modere": 5000,
                "degats_severe": 15000,
                "degats_critique": 50000
            },
            
            # ========== CYBER / PIRATAGE ==========
            "cyber": {
                "audit_securite": 500,
                "restauration_donnees": 1000,
                "ransomware": 5000,
                "protection_renforcee": 300,
                "formation_employes": 200
            },
            
            # ========== ÉLECTRONIQUE ==========
            "electronique": {
                "smartphone_ecran": 150,
                "smartphone_batterie": 80,
                "smartphone_carte_mere": 200,
                "ordinateur_ecran": 250,
                "ordinateur_clavier": 60,
                "ordinateur_disque_dur": 120,
                "tablette_ecran": 180,
                "tv_ecran": 300
            },
            
            # ========== VOYAGE / ANNULATION ==========
            "voyage": {
                "annulation_billet": 200,
                "retard_vol": 300,
                "bagage_perdu": 150,
                "maladie_etranger": 500
            },
            
            # ========== SINISTRE PROFESSIONNEL ==========
            "entreprise": {
                "bris_machine": 1500,
                "interruption_activite": 5000,
                "vol_marchandises": 2000,
                "incendie_local": 10000
            },
            
            # ========== ANIMAL DE COMPAGNIE ==========
            "animal": {
                "consultation_veto": 50,
                "vaccination": 60,
                "hospitalisation_jour": 200,
                "chirurgie": 500,
                "medicaments": 40,
                "analyse_sang": 80
            }
        }
    
    def load_models(self):
        """Charge les modèles pré-entraînés"""
        try:
            logger.info("📦 Chargement de YOLOv8...")
            self.yolo_model = YOLO('yolov8n.pt')
            logger.info("   ✅ YOLO chargé")
        except Exception as e:
            logger.error(f"   ⚠️ Erreur YOLO: {e}")
        
        try:
            logger.info("📦 Chargement de ResNet50...")
            self.damage_classifier = torch.hub.load('pytorch/vision:v0.10.0', 'resnet50', pretrained=True)
            self.damage_classifier.eval()
            self.damage_classifier = self.damage_classifier.to(self.device)
            logger.info("   ✅ ResNet50 chargé")
        except Exception as e:
            logger.error(f"   ⚠️ Erreur ResNet50: {e}")
    
    async def estimate_accident_cost(self, detections: list) -> dict:
        """Estimation pour accident automobile"""
        total_cost = 0
        details = []
        labor_rate = 55  # €/heure
        
        for detection in detections:
            part = detection.get('part', '').lower()
            part_data = self.cost_database["accident"].get(part, {})
            
            if part_data:
                cost = part_data.get('total', 200)
                total_cost += cost
                details.append({
                    "piece": part,
                    "cout_piece": part_data.get('part_cost', 0),
                    "main_oeuvre": part_data.get('labor_hours', 0) * labor_rate,
                    "peinture": part_data.get('paint', 0),
                    "total": cost
                })
        
        return {
            "type": "accident",
            "total_cost": total_cost,
            "details": details,
            "labor_rate": labor_rate,
            "recommendation": self._get_recommendation(total_cost)
        }
    
    async def estimate_habitation_cost(self, damage_type: str, surface_m2: float = 10) -> dict:
        """Estimation pour sinistre habitation"""
        data = self.cost_database["habitation"].get(damage_type, {})
        
        if data.get('cost_per_m2'):
            total_cost = data['cost_per_m2'] * surface_m2 + data.get('labor_hours_per_m2', 0) * 45 * surface_m2
        else:
            total_cost = data.get('total', 500)
        
        return {
            "type": "habitation",
            "damage_type": damage_type,
            "surface_m2": surface_m2,
            "total_cost": total_cost,
            "labor_rate": 45
        }
    
    async def estimate_agricole_cost(self, disease_name: str) -> dict:
        """Estimation pour sinistre agricole"""
        cost = self.cost_database["agricole"].get(disease_name, 100)
        
        return {
            "type": "agricole",
            "disease": disease_name,
            "total_cost": cost,
            "is_diseased": disease_name != "healthy",
            "recommendation": self._get_agricole_recommendation(disease_name)
        }
    
    async def estimate_sante_cost(self, care_type: str) -> dict:
        """Estimation pour santé"""
        cost = self.cost_database["sante"].get(care_type, 50)
        
        return {
            "type": "sante",
            "care_type": care_type,
            "total_cost": cost,
            "remboursement_base": cost * 0.7,
            "mutuelle": cost * 0.2
        }
    
    async def estimate_transport_cost(self, package_type: str = "colis_standard") -> dict:
        """Estimation pour transport/logistique"""
        cost = self.cost_database["transport"].get(package_type, 50)
        
        return {
            "type": "transport",
            "package_type": package_type,
            "total_cost": cost,
            "indemnisation": cost
        }
    
    async def estimate_catastrophe_cost(self, severity: str = "degats_modere") -> dict:
        """Estimation pour catastrophe naturelle"""
        cost = self.cost_database["catastrophe"].get(severity, 5000)
        
        return {
            "type": "catastrophe",
            "severity": severity,
            "total_cost": cost,
            "urgence": severity in ["degats_severe", "degats_critique"]
        }
    
    async def estimate_cyber_cost(self, service_type: str = "audit_securite") -> dict:
        """Estimation pour cyber/piratage"""
        cost = self.cost_database["cyber"].get(service_type, 500)
        
        return {
            "type": "cyber",
            "service": service_type,
            "total_cost": cost
        }
    
    async def estimate_electronique_cost(self, device_type: str = "smartphone_ecran") -> dict:
        """Estimation pour électronique/casse"""
        cost = self.cost_database["electronique"].get(device_type, 150)
        
        return {
            "type": "electronique",
            "device": device_type,
            "total_cost": cost,
            "garantie_applicable": cost < 200
        }
    
    async def estimate_voyage_cost(self, incident_type: str = "annulation_billet") -> dict:
        """Estimation pour voyage/annulation"""
        cost = self.cost_database["voyage"].get(incident_type, 200)
        
        return {
            "type": "voyage",
            "incident": incident_type,
            "total_cost": cost,
            "indemnisation": cost
        }
    
    async def estimate_entreprise_cost(self, incident_type: str = "bris_machine") -> dict:
        """Estimation pour sinistre professionnel"""
        cost = self.cost_database["entreprise"].get(incident_type, 1500)
        
        return {
            "type": "entreprise",
            "incident": incident_type,
            "total_cost": cost,
            "interruption_activite": incident_type == "interruption_activite"
        }
    
    async def estimate_animal_cost(self, care_type: str = "consultation_veto") -> dict:
        """Estimation pour animal de compagnie"""
        cost = self.cost_database["animal"].get(care_type, 50)
        
        return {
            "type": "animal",
            "care": care_type,
            "total_cost": cost
        }
    
    async def full_estimate(self, claim_type: str, **kwargs) -> dict:
        """Point d'entrée unique pour l'estimation"""
        
        estimation_methods = {
            "accident": self.estimate_accident_cost,
            "habitation": self.estimate_habitation_cost,
            "agricole": self.estimate_agricole_cost,
            "sante": self.estimate_sante_cost,
            "transport": self.estimate_transport_cost,
            "catastrophe": self.estimate_catastrophe_cost,
            "cyber": self.estimate_cyber_cost,
            "electronique": self.estimate_electronique_cost,
            "voyage": self.estimate_voyage_cost,
            "entreprise": self.estimate_entreprise_cost,
            "animal": self.estimate_animal_cost
        }
        
        method = estimation_methods.get(claim_type)
        if not method:
            return {"error": f"Type de sinistre inconnu: {claim_type}"}
        
        estimation = await method(**kwargs)
        estimation["tva"] = estimation["total_cost"] * 0.2
        estimation["total_ttc"] = estimation["total_cost"] + estimation["tva"]
        
        return estimation
    
    def _get_recommendation(self, cost):
        if cost < 500:
            return "Réparation rapide recommandée. Devis à demander dans 3 garages."
        elif cost < 1500:
            return "Expertise recommandée. Comparer plusieurs devis."
        else:
            return "Expertise obligatoire. Contactez votre assurance avant toute réparation."
    
    def _get_agricole_recommendation(self, disease):
        recos = {
            "healthy": "Aucun traitement nécessaire.",
            "early_blight": "Traiter avec un fongicide. Retirer les feuilles infectées.",
            "late_blight": "Traitement urgent. Contacter un expert agricole.",
            "leaf_mold": "Améliorer la ventilation. Traiter avec un fongicide.",
            "septoria": "Retirer les feuilles infectées. Traitement fongicide.",
            "spider_mites": "Pulvériser de l'eau savonneuse. Acaricide si nécessaire.",
            "yellow_curl_virus": "Aucun traitement. Éliminer les plants infectés.",
            "bacterial_spot": "Bactéricide à base de cuivre. Semences certifiées."
        }
        return recos.get(disease, "Consulter un expert agricole.")


# Instance globale
estimation_service = UnifiedCostEstimationService()