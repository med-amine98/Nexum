# fix_main_routes.py - À exécuter dans le conteneur
import re
import os

def fix_main_routes():
    """Ajoute le filtre company_id à TOUTES les routes dans main.py"""
    
    file_path = '/app/app/main.py'
    
    if not os.path.exists(file_path):
        print(f"❌ Fichier {file_path} non trouvé")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # ============================================
    # 1. Ajouter current_user aux fonctions qui en manquent
    # ============================================
    
    # Pattern: async def function_name(db: Session = Depends(get_db))
    pattern1 = r'(async def (\w+)\([^)]*db: Session = Depends\(get_db\)[^)]*\))'
    
    def add_current_user(match):
        func_def = match.group(1)
        func_name = match.group(2)
        if 'current_user' not in func_def and 'current_user' not in match.group(0):
            if func_def.endswith(')'):
                return func_def[:-1] + ', current_user: User = Depends(get_current_user))'
            return func_def + ', current_user: User = Depends(get_current_user)'
        return func_def
    
    content = re.sub(pattern1, add_current_user, content)
    
    # ============================================
    # 2. Ajouter db._tenant_user = current_user
    # ============================================
    
    pattern2 = r'(async def \w+\([^)]*current_user: User[^)]*\):[ \t]*\n)([ \t]*)(\S+)'
    
    def add_tenant_line(match):
        before = match.group(1)
        indent = match.group(2)
        rest = match.group(3)
        
        # Vérifier si la ligne est déjà présente
        if 'db._tenant_user' in before or 'db._tenant_user' in rest:
            return match.group(0)
        
        # Ajouter la ligne tenant
        return before + indent + 'db._tenant_user = current_user\n' + indent + rest
    
    content = re.sub(pattern2, add_tenant_line, content, flags=re.DOTALL)
    
    # ============================================
    # 3. Ajouter les filtres company_id aux requêtes
    # ============================================
    
    # Modèles à filtrer
    models = [
        'PurchaseOrder', 'SaleOrder', 'Invoice', 'Partner',
        'Product', 'Employee', 'Lead', 'Account', 'Transaction',
        'StockMovement', 'SupportTicket', 'EnterpriseProject',
        'EnterpriseSale', 'EnterpriseEmployee', 'CallRecord',
        'Category', 'Department', 'Leave', 'Company', 'User',
        'InsurancePolicy', 'Claim', 'FraudTransaction',
        'DocumentIntelligence', 'AIModel', 'SubscriptionPlan',
        'CompanySubscription', 'KnowledgeBase', 'TicketSolution',
        'TicketMessage', 'OCRFraudAlert', 'OCRCorrection',
        'AMLTransactionModel', 'AMLAlertModel', 'KYCDocument',
        'KYCVerification', 'KYCRule', 'DigitalTwin', 'KanbanTask'
    ]
    
    # Ajouter .filter(company_id == current_user.company_id)
    for model in models:
        # Remplacer .all() par .filter(company_id == current_user.company_id).all()
        pattern3 = f'db\\.query\\({model}\\)\\.all\\(\\)'
        replacement3 = f'db.query({model}).filter({model}.company_id == current_user.company_id).all()'
        content = re.sub(pattern3, replacement3, content)
        
        # Remplacer .filter(...).all()
        pattern4 = f'db\\.query\\({model}\\)\\.filter\\(([^)]*)\\)\\.all\\(\\)'
        def replacer_filter(match, model=model):
            existing = match.group(1)
            if 'company_id' not in existing and 'current_user' not in existing:
                if existing.strip():
                    return f'db.query({model}).filter({existing}, {model}.company_id == current_user.company_id).all()'
                else:
                    return f'db.query({model}).filter({model}.company_id == current_user.company_id).all()'
            return match.group(0)
        content = re.sub(pattern4, replacer_filter, content)
        
        # Remplacer .first() par .filter(company_id == current_user.company_id).first()
        pattern5 = f'db\\.query\\({model}\\)\\.first\\(\\)'
        replacement5 = f'db.query({model}).filter({model}.company_id == current_user.company_id).first()'
        content = re.sub(pattern5, replacement5, content)
        
        # Remplacer .count() par .filter(company_id == current_user.company_id).count()
        pattern6 = f'db\\.query\\({model}\\)\\.count\\(\\)'
        replacement6 = f'db.query({model}).filter({model}.company_id == current_user.company_id).count()'
        content = re.sub(pattern6, replacement6, content)
    
    # ============================================
    # 4. Ajouter les imports nécessaires
    # ============================================
    
    imports_to_add = [
        'from app.models.auth import User',
        'from app.routes.auth import get_current_user'
    ]
    
    # Vérifier si les imports existent déjà
    for imp in imports_to_add:
        if imp not in content:
            # Ajouter après les imports existants
            content = content.replace('import logging', 'import logging\n' + imp)
    
    # Écrire le fichier modifié
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ main.py modifié avec succès !")

if __name__ == '__main__':
    fix_main_routes()