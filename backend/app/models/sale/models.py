from app.models.base import db, BaseModel
from datetime import datetime

class SaleOrder(BaseModel):
    __tablename__ = 'sale_order'
    
    name = db.Column(db.String(100), unique=True, nullable=False)
    partner_id = db.Column(db.Integer, db.ForeignKey('res_partner.id'))
    partner_invoice_id = db.Column(db.Integer, db.ForeignKey('res_partner.id'))
    partner_shipping_id = db.Column(db.Integer, db.ForeignKey('res_partner.id'))
    
    date_order = db.Column(db.DateTime, default=datetime.utcnow)
    validity_date = db.Column(db.Date)
    commitment_date = db.Column(db.Date)
    
    state = db.Column(db.String(50), default='draft')  # draft, sent, sale, done, cancel
    
    # Montants
    amount_untaxed = db.Column(db.Float, default=0.0)
    amount_tax = db.Column(db.Float, default=0.0)
    amount_total = db.Column(db.Float, default=0.0)
    
    # Relations
    order_line = db.relationship('SaleOrderLine', backref='order', lazy='dynamic')
    
    def _compute_amounts(self):
        total = 0
        for line in self.order_line:
            total += line.price_subtotal
        self.amount_untaxed = total
        self.amount_tax = total * 0.2  # TVA 20%
        self.amount_total = total * 1.2

class SaleOrderLine(BaseModel):
    __tablename__ = 'sale_order_line'
    
    order_id = db.Column(db.Integer, db.ForeignKey('sale_order.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('product_product.id'))
    
    name = db.Column(db.Text)
    product_uom_qty = db.Column(db.Float, default=1.0)
    price_unit = db.Column(db.Float, default=0.0)
    discount = db.Column(db.Float, default=0.0)
    
    price_subtotal = db.Column(db.Float, default=0.0)
    price_total = db.Column(db.Float, default=0.0)
    
    def _compute_subtotal(self):
        self.price_subtotal = self.product_uom_qty * self.price_unit * (1 - self.discount/100)
        self.price_total = self.price_subtotal * 1.2