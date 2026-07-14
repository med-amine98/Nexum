
import os

filepath = r'c:\Users\salah\Desktop\mon-erp\backend\app\services\module_service.py'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add buy_module method
if 'def buy_module' not in content:
    old_method_end = 'return user_module'
    buy_method = """
    def buy_module(self, user_id: int, module_id: int, company_id: int = None) -> Optional[UserModule]:
        \"\"\"Achète un module pour l'utilisateur\"\"\"
        user_module = self.db.query(UserModule).filter(
            UserModule.user_id == user_id,
            UserModule.module_id == module_id
        ).first()
        
        if user_module:
            user_module.is_paid = True
            user_module.is_installed = True
            user_module.payment_date = datetime.utcnow()
            if company_id: user_module.company_id = company_id
        else:
            user_module = UserModule(
                user_id=user_id,
                module_id=module_id,
                is_paid=True,
                is_installed=True,
                payment_date=datetime.utcnow(),
                company_id=company_id
            )
            self.db.add(user_module)
        
        self.db.commit()
        self.db.refresh(user_module)
        return user_module
"""
    # Find the end of toggle_installed
    search_str = 'def toggle_installed'
    pos = content.find(search_str)
    if pos != -1:
        # Find the next return user_module
        next_return = content.find('return user_module', pos)
        if next_return != -1:
            insertion_point = next_return + len('return user_module')
            content = content[:insertion_point] + buy_method + content[insertion_point:]

# 2. Update get_all_modules
if 'module_data.user_paid = user_module.is_paid' not in content:
    content = content.replace(
        'module_data.user_installed = user_module.is_installed',
        'module_data.user_installed = user_module.is_installed\\n                    module_data.user_paid = user_module.is_paid'
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

logger.info("ModuleService.py updated successfully")
