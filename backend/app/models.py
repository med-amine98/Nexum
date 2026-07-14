from app import db
from datetime import datetime
import bcrypt

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    hashed_password = db.Column(db.String(200), nullable=False)
    full_name = db.Column(db.String(200), nullable=True)  # <-- AJOUTER
    is_active = db.Column(db.Boolean, default=True)
    role = db.Column(db.String(50), default='user')
    provider = db.Column(db.String(50), nullable=True)  # <-- AJOUTER (google, linkedin)
    provider_user_id = db.Column(db.String(255), nullable=True)  # <-- AJOUTER
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    
    def set_password(self, password):
        from werkzeug.security import generate_password_hash
        self.hashed_password = generate_password_hash(password)
    
    def check_password(self, password):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.hashed_password, password)

class Partner(db.Model):
    __tablename__ = 'partners'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50), default='customer')  # customer, supplier, both
    email = db.Column(db.String(120))
    phone = db.Column(db.String(50))
    mobile = db.Column(db.String(50))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    country = db.Column(db.String(100))
    vat = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ProductCategory(db.Model):
    __tablename__ = 'product_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('product_categories.id'))

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(50), unique=True)
    barcode = db.Column(db.String(100))
    category_id = db.Column(db.Integer, db.ForeignKey('product_categories.id'))
    list_price = db.Column(db.Float, default=0.0)
    cost_price = db.Column(db.Float, default=0.0)
    stock = db.Column(db.Float, default=0.0)
    unit = db.Column(db.String(20), default='unit')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SaleOrder(db.Model):
    __tablename__ = 'sale_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    partner_id = db.Column(db.Integer, db.ForeignKey('partners.id'))
    date_order = db.Column(db.DateTime, default=datetime.utcnow)
    amount_total = db.Column(db.Float, default=0.0)
    amount_tax = db.Column(db.Float, default=0.0)
    state = db.Column(db.String(50), default='draft')  # draft, confirmed, done, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SaleOrderLine(db.Model):
    __tablename__ = 'sale_order_lines'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('sale_orders.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    quantity = db.Column(db.Float, default=1.0)
    price_unit = db.Column(db.Float, default=0.0)
    discount = db.Column(db.Float, default=0.0)
    price_subtotal = db.Column(db.Float, default=0.0)

class FraudAlert(db.Model):
    __tablename__ = 'fraud_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    partner_id = db.Column(db.Integer, db.ForeignKey('partners.id'))
    score = db.Column(db.Float)
    level = db.Column(db.String(20))  # LOW, MEDIUM, HIGH
    description = db.Column(db.Text)
    blockchain_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)