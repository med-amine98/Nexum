# data/enrich_qdrant_complete.py
import requests
import time
import sys

API_URL = "http://localhost:8000/api/v1"

# ========== BASE DE CONNAISSANCES COMPLÈTE ET RICHE ==========

KNOWLEDGE_BASE = {
    # ==================== SOPHIE LAURENT - RISK MANAGEMENT ====================
    "risk": [
        # Salutations et présentation
        {
            "content": "Bonjour ! Je suis Sophie Laurent, directrice de la gestion des risques. Je suis spécialisée dans l'analyse des sinistres, le scoring des risques clients, la conformité réglementaire, les risques cyber et la gestion de crise. Comment puis-je vous aider à sécuriser vos activités ?",
            "metadata": {"type": "greeting", "importance": "high", "category": "presentation"}
        },
        
        # Sinistres - Statistiques générales
        {
            "content": "Les sinistres se répartissent comme suit : incendies (35% des cas, coût moyen 45 000€), dégâts des eaux (28%, coût moyen 12 000€), vols (22%, coût moyen 8 000€), autres sinistres (15%).",
            "metadata": {"type": "sinistre", "importance": "high", "category": "statistiques"}
        },
        {
            "content": "Le délai moyen de traitement des sinistres est actuellement de 4,2 jours. Notre objectif pour 2026 est de réduire ce délai à 3,5 jours grâce à l'automatisation et à l'IA.",
            "metadata": {"type": "sinistre", "importance": "high", "category": "delais"}
        },
        {
            "content": "Les sinistres les plus coûteux sont les incendies industriels (moyenne 150 000€), suivis des dégâts des eaux en copropriété (35 000€) et des vols avec effraction (25 000€).",
            "metadata": {"type": "sinistre", "importance": "medium", "category": "couts"}
        },
        {
            "content": "Les sinistres surviennent principalement en hiver (35% des cas) pour les dégâts des eaux, et en été (40%) pour les incendies liés à la chaleur.",
            "metadata": {"type": "sinistre", "importance": "medium", "category": "saisonnalite"}
        },
        
        # Scoring de risque client
        {
            "content": "Le scoring de risque client repose sur quatre piliers fondamentaux : l'historique de paiement (pondération 40%), le secteur d'activité (25%), le montant assuré (20%) et l'ancienneté de la relation (15%).",
            "metadata": {"type": "scoring", "importance": "high", "category": "methodologie"}
        },
        {
            "content": "Un score de risque supérieur à 75/100 est considéré comme élevé. Pour ces clients, nous recommandons un audit renforcé annuel, une révision des garanties et un suivi mensuel personnalisé.",
            "metadata": {"type": "scoring", "importance": "high", "category": "seuils"}
        },
        {
            "content": "Les clients avec un score entre 50 et 75 nécessitent une surveillance trimestrielle. Ceux avec un score inférieur à 50 sont considérés comme faible risque et bénéficient d'une surveillance annuelle standard.",
            "metadata": {"type": "scoring", "importance": "high", "category": "seuils"}
        },
        {
            "content": "Les secteurs les plus risqués sont la construction (score moyen 72), la restauration (68) et le commerce de détail (65). Les secteurs les moins risqués sont les services aux entreprises (45) et la santé (42).",
            "metadata": {"type": "scoring", "importance": "medium", "category": "secteurs"}
        },
        
        # Conformité réglementaire
        {
            "content": "Notre taux de conformité réglementaire atteint 94%. Les principaux axes de contrôle concernent les procédures KYC (Know Your Customer) pour 45% des alertes et la lutte anti-blanchiment AML pour 30%.",
            "metadata": {"type": "conformite", "importance": "high", "category": "reglementation"}
        },
        {
            "content": "Les nouvelles réglementations 2026 imposent des contrôles renforcés sur toutes les transactions supérieures à 10 000€, avec une obligation de traçabilité renforcée et des délais de conservation des données étendus.",
            "metadata": {"type": "conformite", "importance": "high", "category": "reglementation"}
        },
        {
            "content": "Les sanctions pour non-conformité peuvent atteindre 5% du chiffre d'affaires annuel, avec des peines complémentaires d'interdiction d'activité dans les cas les plus graves.",
            "metadata": {"type": "conformite", "importance": "medium", "category": "sanctions"}
        },
        
        # Risques cyber
        {
            "content": "Les cyberattaques se répartissent ainsi : phishing (45% des incidents), ransomware (30%), attaques DDoS (15%) et vols de données (10%). Les PME sont les cibles privilégiées.",
            "metadata": {"type": "cyber", "importance": "high", "category": "menaces"}
        },
        {
            "content": "Pour se protéger efficacement contre les cyberattaques, je recommande : la double authentification pour tous les accès sensibles, des sauvegardes quotidiennes hors ligne, une sensibilisation mensuelle des employés, et un pare-feu nouvelle génération.",
            "metadata": {"type": "cyber", "importance": "high", "category": "prevention"}
        },
        {
            "content": "Le coût moyen d'une cyberattaque pour une PME se situe entre 50 000€ et 200 000€, incluant les frais de remédiation, la perte d'exploitation et les éventuelles amendes.",
            "metadata": {"type": "cyber", "importance": "medium", "category": "impacts"}
        },
        {
            "content": "Les signes d'une cyberattaque imminente incluent : ralentissement des systèmes, activités réseau anormales, tentatives de connexion suspectes et demandes de rançon.",
            "metadata": {"type": "cyber", "importance": "medium", "category": "detection"}
        },
        
        # Gestion de crise
        {
            "content": "Un Plan de Continuité d'Activité (PCA) efficace prévoit un objectif de reprise inférieur à 4 heures pour les services critiques et inférieur à 24 heures pour les services secondaires.",
            "metadata": {"type": "crise", "importance": "high", "category": "pca"}
        },
        {
            "content": "La cellule de crise doit être activée immédiatement en cas de sinistre majeur. Elle est composée du directeur des risques, du DSI, du directeur juridique et du responsable communication.",
            "metadata": {"type": "crise", "importance": "high", "category": "organisation"}
        },
        {
            "content": "Les exercices de simulation de crise doivent être organisés au minimum deux fois par an pour tester l'efficacité du PCA et former les équipes aux bons réflexes.",
            "metadata": {"type": "crise", "importance": "medium", "category": "exercices"}
        },
        
        # Assurances
        {
            "content": "Les garanties essentielles en assurance des risques professionnels incluent : l'incendie (plafond recommandé 5M€), les dégâts des eaux (500k€), le vol (200k€) et le bris de machine (250k€).",
            "metadata": {"type": "assurance", "importance": "high", "category": "garanties"}
        },
        {
            "content": "Les franchises standards sont : incendie 5000€, dégâts des eaux 1500€, vol 3000€. Ces montants peuvent être ajustés à la baisse moyennant une augmentation de prime.",
            "metadata": {"type": "assurance", "importance": "medium", "category": "franchises"}
        },
        {
            "content": "Je recommande une révision annuelle des garanties pour s'assurer de leur adéquation avec l'évolution des risques et des valeurs assurées.",
            "metadata": {"type": "assurance", "importance": "medium", "category": "recommandations"}
        }
    ],
    
    # ==================== ELENA PETROVA - GROWTH STRATEGY ====================
    "growth": [
        # Salutations
        {
            "content": "Bonjour ! Je suis Elena Petrova, stratège en croissance d'entreprise. Je vous aide à développer votre activité grâce à l'analyse des leviers de croissance, l'optimisation des ventes, la réduction de l'attrition et l'identification des opportunités de marché. Comment puis-je vous aider à faire croître votre entreprise ?",
            "metadata": {"type": "greeting", "importance": "high", "category": "presentation"}
        },
        
        # Leviers de croissance
        {
            "content": "Les trois leviers de croissance fondamentaux sont : l'acquisition de nouveaux clients (qui représente 40% de la croissance potentielle), la fidélisation des clients existants (35%) et l'upselling/cross-selling (25%).",
            "metadata": {"type": "strategie", "importance": "high", "category": "leviers"}
        },
        {
            "content": "Une stratégie d'acquisition équilibrée recommande d'allouer 30% du budget au SEO, 25% aux réseaux sociaux, 20% aux campagnes email, 15% aux partenariats et 10% à la publicité payante.",
            "metadata": {"type": "acquisition", "importance": "high", "category": "strategie"}
        },
        {
            "content": "Le Coût d'Acquisition Client (CAC) moyen varie selon les secteurs : 150€ en banque, 120€ en assurance, 80€ en retail. L'objectif est d'avoir un CAC inférieur à un tiers de la Valeur Vie Client (LTV).",
            "metadata": {"type": "acquisition", "importance": "high", "category": "metriques"}
        },
        
        # Fidélisation
        {
            "content": "Les programmes de fidélisation les plus efficaces sont : les programmes de points (adoptés par 45% des clients), le cashback (30%) et les avantages exclusifs (25%).",
            "metadata": {"type": "fidelisation", "importance": "high", "category": "programmes"}
        },
        {
            "content": "Le taux de rétention optimal est de 85%. Notre taux actuel est de 78%, avec un objectif d'atteindre 82% d'ici la fin de l'année grâce aux nouvelles initiatives de fidélisation.",
            "metadata": {"type": "fidelisation", "importance": "high", "category": "metriques"}
        },
        {
            "content": "La Valeur Vie Client (LTV) moyenne se décompose ainsi : secteur bancaire 2500€, assurance 1800€, retail 600€. Une LTV élevée indique une bonne santé de la relation client.",
            "metadata": {"type": "fidelisation", "importance": "high", "category": "metriques"}
        },
        {
            "content": "Pour améliorer la fidélisation, je recommande : des enquêtes de satisfaction mensuelles, un programme de parrainage, des offres personnalisées basées sur l'historique d'achat, et un service client réactif.",
            "metadata": {"type": "fidelisation", "importance": "high", "category": "recommandations"}
        },
        
        # Attrition
        {
            "content": "Les causes principales d'attrition sont : des prix jugés trop élevés (45% des départs), un support client insuffisant (30%) et une offre concurrente plus attractive (25%).",
            "metadata": {"type": "attrition", "importance": "high", "category": "causes"}
        },
        {
            "content": "Pour réduire l'attrition, je propose : une analyse des prix face à la concurrence, une refonte du parcours support client, et une veille concurrentielle active pour adapter notre offre.",
            "metadata": {"type": "attrition", "importance": "high", "category": "actions"}
        },
        {
            "content": "Le taux d'attrition acceptable se situe en dessous de 10%. Notre objectif pour 2026 est d'atteindre 8% grâce aux actions correctives mises en place.",
            "metadata": {"type": "attrition", "importance": "high", "category": "objectifs"}
        },
        {
            "content": "Les clients les plus susceptibles de partir sont ceux qui n'ont pas interagi avec l'entreprise depuis plus de 90 jours. Un programme de réengagement ciblé peut réduire l'attrition de 25%.",
            "metadata": {"type": "attrition", "importance": "medium", "category": "prediction"}
        },
        
        # Opportunités de marché
        {
            "content": "Les secteurs offrant le plus fort potentiel de croissance sont : l'Assurance (450 000€ de CA potentiel), la Banque (380 000€), le Retail (220 000€), l'Immobilier (180 000€) et la Santé (150 000€).",
            "metadata": {"type": "opportunite", "importance": "high", "category": "secteurs"}
        },
        {
            "content": "Les régions les plus dynamiques sont l'Île-de-France (35% du marché), la région PACA (15%) et l'Auvergne-Rhône-Alpes (12%).",
            "metadata": {"type": "opportunite", "importance": "medium", "category": "geographie"}
        },
        {
            "content": "Les tendances 2026 à surveiller : la digitalisation des services (croissance attendue +25%), la personnalisation des offres (+30%) et l'amélioration de l'expérience client (+20%).",
            "metadata": {"type": "opportunite", "importance": "high", "category": "tendances"}
        },
        
        # Performance commerciale
        {
            "content": "Le panier moyen par secteur : Banque 345€, Assurance 289€, Retail 156€, Immobilier 890€, Santé 234€.",
            "metadata": {"type": "vente", "importance": "high", "category": "metriques"}
        },
        {
            "content": "Les taux de conversion par canal : recommandations (45% de conversion), SEO (25%), réseaux sociaux (20%), emailing (15%), publicité payante (10%).",
            "metadata": {"type": "vente", "importance": "high", "category": "conversion"}
        },
        {
            "content": "Nos objectifs de croissance 2026 sont ambitieux : +15% de chiffre d'affaires, +20% de nouveaux clients, et -30% du taux d'attrition.",
            "metadata": {"type": "vente", "importance": "high", "category": "objectifs"}
        },
        {
            "content": "Pour booster vos ventes, je recommande : l'analyse des données clients pour identifier les opportunités de cross-selling, la mise en place de campagnes personnalisées, et l'optimisation du tunnel de conversion.",
            "metadata": {"type": "vente", "importance": "high", "category": "recommandations"}
        }
    ],
    
    # ==================== JAMES O'CONNOR - DATA SCIENCE ====================
    "predict": [
        # Salutations
        {
            "content": "Bonjour ! Je suis James O'Connor, data scientist. Je transforme vos données en prédictions précises pour éclairer vos décisions stratégiques. Je suis spécialisé dans le scoring de crédit, la détection de fraude, les prévisions financières et l'analyse prédictive. Quelle analyse souhaitez-vous réaliser ?",
            "metadata": {"type": "greeting", "importance": "high", "category": "presentation"}
        },
        
        # Scoring crédit
        {
            "content": "Notre modèle de scoring crédit atteint une précision de 87%. Il s'appuie sur cinq facteurs clés : l'historique bancaire (35%), les revenus (25%), le taux d'endettement (20%), la stabilité professionnelle (15%) et le patrimoine (5%).",
            "metadata": {"type": "credit", "importance": "high", "category": "scoring"}
        },
        {
            "content": "Les seuils de crédit recommandés sont : excellent (>750) pour un prêt jusqu'à 250 000€, bon (650-750) jusqu'à 150 000€, moyen (550-650) jusqu'à 75 000€, et faible (<550) à étudier au cas par cas.",
            "metadata": {"type": "credit", "importance": "high", "category": "seuils"}
        },
        {
            "content": "Les taux d'approbation par catégorie : profils excellents 78%, profils bons 45%, profils moyens 15%, profils faibles 5% après étude approfondie.",
            "metadata": {"type": "credit", "importance": "medium", "category": "statistiques"}
        },
        {
            "content": "Pour améliorer son score de crédit, je recommande : payer ses factures à temps, réduire son taux d'endettement, diversifier ses sources de revenus, et maintenir une ancienneté bancaire.",
            "metadata": {"type": "credit", "importance": "high", "category": "conseils"}
        },
        
        # Détection de fraude
        {
            "content": "Notre modèle anti-fraude affiche une précision de 98,5% et un rappel de 96,2%. L'architecture repose sur des réseaux de neurones profonds couplés à une analyse comportementale en temps réel.",
            "metadata": {"type": "fraude", "importance": "high", "category": "performance"}
        },
        {
            "content": "Les types de fraude les plus fréquemment détectés sont : l'usurpation d'identité (45% des cas), le blanchiment d'argent (30%), la fraude documentaire (15%) et la fraude interne (10%).",
            "metadata": {"type": "fraude", "importance": "high", "category": "types"}
        },
        {
            "content": "Pour prévenir la fraude, je recommande : l'activation de la double authentification, la mise en place d'un monitoring en temps réel, l'analyse comportementale des utilisateurs, et le partage de blacklists entre institutions.",
            "metadata": {"type": "fraude", "importance": "high", "category": "prevention"}
        },
        
        # Prévisions financières
        {
            "content": "Nos prévisions mensuelles de chiffre d'affaires : janvier 450K€, février 465K€, mars 480K€, avril 495K€, mai 510K€, juin 525K€, soit une progression constante de 3% par mois.",
            "metadata": {"type": "prevision", "importance": "high", "category": "ca"}
        },
        {
            "content": "Les projections pour 2026 indiquent un chiffre d'affaires annuel de 6,2M€ (+15% par rapport à 2025), une marge brute de 2,1M€ et un bénéfice net de 1,3M€.",
            "metadata": {"type": "prevision", "importance": "high", "category": "annuel"}
        },
        {
            "content": "Nous utilisons trois méthodes de prévision : la régression linéaire (65% des cas), les réseaux de neurones LSTM (25%) et les forêts aléatoires (10%).",
            "metadata": {"type": "prevision", "importance": "medium", "category": "methodes"}
        },
        
        # Segmentation client
        {
            "content": "Notre segmentation client identifie trois catégories : les clients Premium (20% du portefeuille, valeur moyenne 5000€), les clients Standard (50%, valeur 1500€) et les clients Économiques (30%, valeur 500€).",
            "metadata": {"type": "client", "importance": "high", "category": "segmentation"}
        },
        {
            "content": "Les taux de conversion par segment : Premium 35%, Standard 22%, Économique 15%. Le segment Premium est le plus rentable mais aussi le plus exigeant.",
            "metadata": {"type": "client", "importance": "medium", "category": "conversion"}
        }
    ],
    
    # ==================== NEXY COPILOT ====================
    "copilot": [
        {
            "content": "Bonjour ! Je suis Nexy Copilot, votre assistant stratégique intelligent. Je peux vous orienter vers nos trois experts : Sophie Laurent (Risk Management) pour les questions sur les risques, sinistres et conformité ; Elena Petrova (Growth Strategy) pour la croissance, ventes et fidélisation ; James O'Connor (Data Science) pour le scoring crédit, fraude et prévisions. Comment puis-je vous aider ?",
            "metadata": {"type": "greeting", "importance": "high", "category": "presentation"}
        },
        {
            "content": "Pour activer un expert, dites simplement 'Sophie', 'Elena' ou 'James' dans le microphone. Vous pouvez aussi taper directement votre question et je vous orienterai vers le bon expert.",
            "metadata": {"type": "voice", "importance": "high", "category": "activation"}
        },
        {
            "content": "Fonctionnalités disponibles : analyse des risques, stratégie de croissance, prédictions financières, détection de fraude, scoring de crédit, conformité réglementaire, rapports personnalisés, alertes en temps réel.",
            "metadata": {"type": "fonctionnalite", "importance": "high", "category": "services"}
        },
        {
            "content": "Commandes vocales supportées : 'statistiques' pour les indicateurs clés, 'prédictions' pour les prévisions, 'aide' pour l'assistance, 'taux de change' pour les devises, 'banques' pour le réseau bancaire.",
            "metadata": {"type": "commandes", "importance": "medium", "category": "interaction"}
        }
    ]
}

# ==================== FONCTION D'IMPORTATION ====================

def import_knowledge():
    """Importe toutes les connaissances dans Qdrant"""
    
    logger.info("=" * 70)
    logger.info("📚 ENRICHISSEMENT COMPLET DE QDRANT")
    logger.info("=" * 70)
    
    total = 0
    errors = 0
    
    for assistant, docs in KNOWLEDGE_BASE.items():
        logger.info(f"\n📁 IMPORTATION POUR {assistant.upper()}...")
        logger.info("-" * 50)
        
        for i, doc in enumerate(docs):
            try:
                response = requests.post(
                    f"{API_URL}/assistant/learn",
                    json={
                        "assistant": assistant,
                        "content": doc["content"],
                        "metadata": doc["metadata"]
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    total += 1
                    logger.info(f"   ✅ [{i+1:2d}] {doc['content'][:70]}...")
                else:
                    errors += 1
                    logger.error(f"   ❌ [{i+1:2d}] Erreur: {response.text[:50]}")
                    
            except Exception as e:
                errors += 1
                logger.warning(f"   ⚠️ [{i+1:2d}] Exception: {str(e)[:50]}")
            
            # Petit délai pour éviter de surcharger
            time.sleep(0.1)
    
    logger.info("\n" + "=" * 70)
    logger.info(f"📊 RÉSUMÉ DE L'IMPORTATION")
    logger.info("=" * 70)
    logger.info(f"✅ Documents importés avec succès : {total}")
    logger.error(f"❌ Erreurs : {errors}")
    logger.info("=" * 70)
    
    # Afficher les statistiques finales
    logger.info("\n📊 STATISTIQUES FINALES PAR ASSISTANT:")
    logger.info("-" * 50)
    
    for assistant in ["risk", "growth", "predict", "copilot"]:
        try:
            response = requests.get(f"{API_URL}/assistant/stats/{assistant}")
            if response.status_code == 200:
                stats = response.json()
                logger.info(f"   🟢 {assistant.upper()}: {stats.get('documents_count', 0)} documents")
        except:
            logger.info(f"   🔴 {assistant.upper()}: impossible de récupérer les stats")
    
    logger.info("\n✅ ENRICHISSEMENT TERMINÉ !")
    logger.info("=" * 70)

# ==================== EXÉCUTION ====================

if __name__ == "__main__":
    logger.info("\n🚀 Démarrage de l'enrichissement de Qdrant...")
    logger.warning("⚠️  Assurez-vous que le backend est en cours d'exécution\n")
    
    try:
        import_knowledge()
    except KeyboardInterrupt:
        logger.info("\n\n⏹️ Interruption par l'utilisateur")
        sys.exit(0)
    except Exception as e:
        logger.error(f"\n❌ Erreur fatale: {e}")
        sys.exit(1)