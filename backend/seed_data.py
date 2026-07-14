#!/usr/bin/env python3
"""
Script de seeding pour la base de données ERP
Ce script AJOUTE des données sans vider les tables existantes
Exécuter: python seed_only.py
"""

import sys
import os
from datetime import datetime, timedelta
import random

# Ajouter le dossier parent au PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.partner import Partner
from app.models.product import Product
from app.models.sale import SaleOrder, SaleOrderLine, OrderStatus, PaymentStatus
from app.models.purchase import PurchaseOrder, PurchaseOrderLine
from app.models.crm import Lead, LeadStatus, LeadSource
from app.models.hr import Employee, Leave, EmployeeStatus, LeaveType, LeaveStatus
from app.models.category import Category
from app.models.location import Location
from app.models.activity import Activity

def get_or_create_category(db, name, color, description):
    """Récupère une catégorie existante ou en crée une nouvelle"""
    category = db.query(Category).filter(Category.name == name).first()
    if not category:
        category = Category(name=name, color=color, description=description)
        db.add(category)
        db.flush()
        logger.info(f"  ✅ Catégorie créée: {name}")
    else:
        logger.info(f"  ℹ️ Catégorie existante: {name}")
    return category

def get_or_create_location(db, code, name, zone, aisle, rack):
    """Récupère un emplacement existant ou en crée un nouveau"""
    location = db.query(Location).filter(Location.code == code).first()
    if not location:
        location = Location(code=code, name=name, zone=zone, aisle=aisle, rack=rack)
        db.add(location)
        db.flush()
        logger.info(f"  ✅ Emplacement créé: {code}")
    else:
        logger.info(f"  ℹ️ Emplacement existant: {code}")
    return location

def get_or_create_partner(db, name, email, phone, city, country, is_company):
    """Récupère un partenaire existant ou en crée un nouveau"""
    partner = db.query(Partner).filter(Partner.email == email).first()
    if not partner:
        partner = Partner(
            name=name, 
            email=email, 
            phone=phone, 
            city=city, 
            country=country, 
            is_company=is_company
        )
        db.add(partner)
        db.flush()
        logger.info(f"  ✅ Partenaire créé: {name}")
    else:
        logger.info(f"  ℹ️ Partenaire existant: {name}")
    return partner

def get_or_create_product(db, code, name, category_id, location_id, purchase_price, selling_price, current_stock, min_stock, max_stock):
    """Récupère un produit existant ou en crée un nouveau"""
    product = db.query(Product).filter(Product.code == code).first()
    if not product:
        product = Product(
            code=code,
            name=name,
            category_id=category_id,
            location_id=location_id,
            purchase_price=purchase_price,
            selling_price=selling_price,
            current_stock=current_stock,
            min_stock=min_stock,
            max_stock=max_stock
        )
        db.add(product)
        db.flush()
        logger.info(f"  ✅ Produit créé: {name}")
    else:
        logger.info(f"  ℹ️ Produit existant: {name}")
    return product

def seed_categories(db):
    """Créer des catégories de produits si elles n'existent pas"""
    logger.info("📦 Vérification/création des catégories...")
    
    categories_data = [
        {"name": "Électronique", "color": "#875A7B", "description": "Produits électroniques"},
        {"name": "Informatique", "color": "#F6AE2D", "description": "Ordinateurs et périphériques"},
        {"name": "Téléphonie", "color": "#86BBD8", "description": "Téléphones et accessoires"},
        {"name": "Audio", "color": "#758E4F", "description": "Casques, enceintes"},
        {"name": "Accessoires", "color": "#33658A", "description": "Accessoires divers"},
    ]
    
    created = []
    for cat_data in categories_data:
        cat = get_or_create_category(db, **cat_data)
        created.append(cat)
    
    db.commit()
    logger.info(f"✅ {len(created)} catégories disponibles")
    return created

def seed_locations(db):
    """Créer des emplacements de stock si ils n'existent pas"""
    logger.info("📍 Vérification/création des emplacements...")
    
    locations_data = [
        {"code": "A1-01", "name": "Rayon A1-01", "zone": "A", "aisle": "1", "rack": "01"},
        {"code": "A1-02", "name": "Rayon A1-02", "zone": "A", "aisle": "1", "rack": "02"},
        {"code": "B2-01", "name": "Rayon B2-01", "zone": "B", "aisle": "2", "rack": "01"},
        {"code": "C3-01", "name": "Rayon C3-01", "zone": "C", "aisle": "3", "rack": "01"},
        {"code": "D4-01", "name": "Rayon D4-01", "zone": "D", "aisle": "4", "rack": "01"},
    ]
    
    created = []
    for loc_data in locations_data:
        loc = get_or_create_location(db, **loc_data)
        created.append(loc)
    
    db.commit()
    logger.info(f"✅ {len(created)} emplacements disponibles")
    return created

def seed_products(db, categories, locations):
    """Créer des produits si ils n'existent pas"""
    logger.info("📱 Vérification/création des produits...")
    
    # Créer un mapping pour faciliter l'accès
    cat_map = {c.name: c.id for c in categories}
    loc_map = {l.code: l.id for l in locations}
    
    products_data = [
        # Téléphonie
        {"code": "PRD-001", "name": "iPhone 15 Pro", "category_name": "Téléphonie", "location_code": "A1-01", 
         "purchase_price": 1100.00, "selling_price": 1299.00, "current_stock": 45, "min_stock": 10, "max_stock": 100},
        {"code": "PRD-002", "name": "iPhone 15", "category_name": "Téléphonie", "location_code": "A1-01", 
         "purchase_price": 900.00, "selling_price": 1099.00, "current_stock": 32, "min_stock": 10, "max_stock": 100},
        {"code": "PRD-003", "name": "Samsung Galaxy S24", "category_name": "Téléphonie", "location_code": "A1-01", 
         "purchase_price": 850.00, "selling_price": 999.00, "current_stock": 28, "min_stock": 10, "max_stock": 100},
        
        # Informatique
        {"code": "PRD-004", "name": "MacBook Pro 14", "category_name": "Informatique", "location_code": "A1-02", 
         "purchase_price": 2000.00, "selling_price": 2499.00, "current_stock": 12, "min_stock": 5, "max_stock": 50},
        {"code": "PRD-005", "name": "MacBook Air", "category_name": "Informatique", "location_code": "A1-02", 
         "purchase_price": 1100.00, "selling_price": 1399.00, "current_stock": 18, "min_stock": 5, "max_stock": 50},
        {"code": "PRD-006", "name": "Dell XPS 15", "category_name": "Informatique", "location_code": "A1-02", 
         "purchase_price": 1800.00, "selling_price": 2199.00, "current_stock": 8, "min_stock": 5, "max_stock": 30},
        
        # Audio
        {"code": "PRD-007", "name": "AirPods Pro", "category_name": "Audio", "location_code": "B2-01", 
         "purchase_price": 220.00, "selling_price": 279.00, "current_stock": 67, "min_stock": 15, "max_stock": 200},
        {"code": "PRD-008", "name": "Sony WH-1000XM5", "category_name": "Audio", "location_code": "B2-01", 
         "purchase_price": 350.00, "selling_price": 429.00, "current_stock": 23, "min_stock": 10, "max_stock": 100},
        {"code": "PRD-009", "name": "Bose QC45", "category_name": "Audio", "location_code": "B2-01", 
         "purchase_price": 300.00, "selling_price": 379.00, "current_stock": 15, "min_stock": 8, "max_stock": 80},
        
        # Accessoires
        {"code": "PRD-010", "name": "Chargeur MagSafe", "category_name": "Accessoires", "location_code": "C3-01", 
         "purchase_price": 35.00, "selling_price": 49.00, "current_stock": 142, "min_stock": 20, "max_stock": 500},
        {"code": "PRD-011", "name": "Coque iPhone", "category_name": "Accessoires", "location_code": "C3-01", 
         "purchase_price": 15.00, "selling_price": 29.00, "current_stock": 89, "min_stock": 30, "max_stock": 300},
        {"code": "PRD-012", "name": "Câble USB-C", "category_name": "Accessoires", "location_code": "D4-01", 
         "purchase_price": 8.00, "selling_price": 19.00, "current_stock": 234, "min_stock": 50, "max_stock": 1000},
    ]
    
    created = []
    for prod_data in products_data:
        prod = get_or_create_product(
            db, 
            code=prod_data["code"],
            name=prod_data["name"],
            category_id=cat_map[prod_data["category_name"]],
            location_id=loc_map[prod_data["location_code"]],
            purchase_price=prod_data["purchase_price"],
            selling_price=prod_data["selling_price"],
            current_stock=prod_data["current_stock"],
            min_stock=prod_data["min_stock"],
            max_stock=prod_data["max_stock"]
        )
        created.append(prod)
    
    db.commit()
    logger.info(f"✅ {len(created)} produits disponibles")
    return created

def seed_partners(db):
    """Créer des clients et fournisseurs si ils n'existent pas"""
    logger.info("👥 Vérification/création des partenaires...")
    
    partners_data = [
        # Clients
        {"name": "Tech Solutions", "email": "contact@techsolutions.fr", "phone": "01 23 45 67 89", "city": "Paris", "country": "France", "is_company": True},
        {"name": "Digital Corp", "email": "info@digitalcorp.com", "phone": "01 34 56 78 90", "city": "Lyon", "country": "France", "is_company": True},
        {"name": "Startup XYZ", "email": "contact@startupxyz.fr", "phone": "01 45 67 89 01", "city": "Bordeaux", "country": "France", "is_company": True},
        {"name": "ABC Corporation", "email": "info@abccorp.com", "phone": "01 56 78 90 12", "city": "Lille", "country": "France", "is_company": True},
        {"name": "Global Import", "email": "contact@globalimport.fr", "phone": "01 67 89 01 23", "city": "Marseille", "country": "France", "is_company": True},
        
        # Fournisseurs
        {"name": "Apple France", "email": "pro@apple.fr", "phone": "01 78 90 12 34", "city": "Paris", "country": "France", "is_company": True},
        {"name": "Samsung Electronics", "email": "b2b@samsung.fr", "phone": "01 89 01 23 45", "city": "Paris", "country": "France", "is_company": True},
        {"name": "Dell Technologies", "email": "commercial@dell.fr", "phone": "01 90 12 34 56", "city": "Lyon", "country": "France", "is_company": True},
        
        # Particuliers
        {"name": "Jean Dupont", "email": "j.dupont@gmail.com", "phone": "06 12 34 56 78", "city": "Paris", "country": "France", "is_company": False},
        {"name": "Marie Martin", "email": "m.martin@yahoo.fr", "phone": "06 23 45 67 89", "city": "Lyon", "country": "France", "is_company": False},
        {"name": "Pierre Durand", "email": "p.durand@free.fr", "phone": "06 34 56 78 90", "city": "Bordeaux", "country": "France", "is_company": False},
    ]
    
    created = []
    for partner_data in partners_data:
        partner = get_or_create_partner(db, **partner_data)
        created.append(partner)
    
    db.commit()
    logger.info(f"✅ {len(created)} partenaires disponibles")
    return created

def seed_sales_orders(db, partners, products):
    """Créer des commandes de vente supplémentaires"""
    logger.info("🛒 Création de commandes de vente supplémentaires...")
    
    # Compter les commandes existantes
    existing_count = db.query(SaleOrder).count()
    logger.info(f"  📊 Commandes existantes: {existing_count}")
    
    if existing_count >= 20:
        logger.info("  ℹ️ Nombre suffisant de commandes déjà existantes")
        return db.query(SaleOrder).all()
    
    to_create = 20 - existing_count
    logger.info(f"  ➕ Création de {to_create} nouvelles commandes")
    
    statuses = [OrderStatus.DRAFT, OrderStatus.CONFIRMED, OrderStatus.DELIVERED, OrderStatus.CANCELLED]
    payment_statuses = [PaymentStatus.UNPAID, PaymentStatus.PENDING, PaymentStatus.PAID, PaymentStatus.PARTIAL]
    
    created = []
    for i in range(1, to_create + 1):
        partner = random.choice(partners[:8])
        
        days_ago = random.randint(0, 90)
        order_date = datetime.now() - timedelta(days=days_ago)
        
        order = SaleOrder(
            name=f"SO-2024-{str(existing_count + i).zfill(4)}",
            partner_id=partner.id,
            date_order=order_date,
            status=random.choice(statuses),
            payment_status=random.choice(payment_statuses)
        )
        db.add(order)
        db.flush()
        
        amount_untaxed = 0
        lines_count = random.randint(1, 5)
        for j in range(lines_count):
            product = random.choice(products)
            quantity = random.randint(1, 3)
            price = product.selling_price
            subtotal = quantity * price
            
            line = SaleOrderLine(
                order_id=order.id,
                product_id=product.id,
                description=product.name,
                quantity=quantity,
                price_unit=price,
                price_subtotal=subtotal
            )
            db.add(line)
            amount_untaxed += subtotal
        
        order.amount_untaxed = amount_untaxed
        order.amount_tax = amount_untaxed * 0.20
        order.amount_total = amount_untaxed * 1.20
        
        created.append(order)
    
    db.commit()
    logger.info(f"✅ {len(created)} nouvelles commandes créées")
    return created

# ... (fonctions similaires pour les autres tables)

def main():
    """Fonction principale"""
    logger.info("=" * 50)
    logger.info("🌱 SEEDING DE LA BASE DE DONNÉES (AJOUT SEULEMENT)")
    logger.info("=" * 50)
    
    db = SessionLocal()
    
    try:
        # Créer les données de base (ne supprime rien)
        categories = seed_categories(db)
        locations = seed_locations(db)
        products = seed_products(db, categories, locations)
        partners = seed_partners(db)
        
        # Créer des données supplémentaires si besoin
        sales = seed_sales_orders(db, partners, products)
        # purchases = seed_purchases(db, partners, products)
        # leads = seed_crm(db, partners)
        # employees = seed_hr(db)
        
        logger.info("\n" + "=" * 50)
        logger.info("✅ SEEDING TERMINÉ AVEC SUCCÈS!")
        logger.info("=" * 50)
        logger.info(f"📊 Récapitulatif:")
        logger.info(f"   - {len(categories)} catégories")
        logger.info(f"   - {len(locations)} emplacements")
        logger.info(f"   - {len(products)} produits")
        logger.info(f"   - {len(partners)} partenaires")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()