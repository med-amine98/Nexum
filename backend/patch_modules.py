import codecs
import json
import os

with codecs.open('models_seed_data.py', 'r', 'utf-8') as f:
    exec(f.read())

with codecs.open('app/services/module_service.py', 'r', 'utf-8') as f:
    content = f.read()

start = content.find('def seed_initial_data(self):')
end = content.find('self.db.commit()', start) + len('self.db.commit()')

new_seed = f"""def seed_initial_data(self):
        \"\"\"Initialise les données de test avec tous les modules du frontend\"\"\"
        
        # Créer les catégories
        categories = [
            {{"name": "core business", "display_name": "Core Business", "color": "#0052cc", "icon": "ShopOutlined", "order_index": 1}},
            {{"name": "ia générative", "display_name": "IA Générative", "color": "#00a3c4", "icon": "RobotOutlined", "order_index": 2}},
            {{"name": "support ia", "display_name": "Support IA", "color": "#2a3448", "icon": "CustomerServiceOutlined", "order_index": 3}},
            {{"name": "assurance ia", "display_name": "Assurance IA", "color": "#0052cc", "icon": "SafetyCertificateOutlined", "order_index": 4}},
            {{"name": "entreprise ia", "display_name": "Entreprise IA", "color": "#003d99", "icon": "GlobalOutlined", "order_index": 5}},
            {{"name": "finance ia", "display_name": "Finance IA", "color": "#0052cc", "icon": "RobotFilled", "order_index": 6}},
            {{"name": "technologies", "display_name": "Technologies", "color": "#e67e22", "icon": "ThunderboltOutlined", "order_index": 7}},
            {{"name": "utilitaires", "display_name": "Utilitaires", "color": "#7a8b9f", "icon": "SettingOutlined", "order_index": 8}},
            {{"name": "banque", "display_name": "Banque", "color": "#0052cc", "icon": "BankOutlined", "order_index": 9}},
            {{"name": "assurance", "display_name": "Assurance", "color": "#00a3c4", "icon": "InsuranceOutlined", "order_index": 10}},
            {{"name": "assistants ia", "display_name": "Assistants IA", "color": "#27ae60", "icon": "RobotFilled", "order_index": 11}},
            {{"name": "dashboards clients", "display_name": "Dashboards Clients", "color": "#3498db", "icon": "DashboardFilled", "order_index": 12}},
        ]
        
        for cat_data in categories:
            existing = self.db.query(ModuleCategory).filter(
                ModuleCategory.name == cat_data["name"]
            ).first()
            if not existing:
                self.db.add(ModuleCategory(**cat_data))
                
        modules = {json.dumps(MODULES_SEED, indent=12)}
        
        for module_data in modules:
            existing = self.db.query(Module).filter(
                Module.key == module_data["key"]
            ).first()
            if not existing:
                self.db.add(Module(**module_data))
        
        self.db.commit()"""

with codecs.open('app/services/module_service.py', 'w', 'utf-8') as f:
    f.write(content[:start] + new_seed + content[end:])
