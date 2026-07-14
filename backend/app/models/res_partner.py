from .base import db, BaseModel

class ResPartner(BaseModel):
    __tablename__ = 'res_partner'
    
    name = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(255))
    company_type = db.Column(db.String(20), default='company')  # company/person
    email = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    mobile = db.Column(db.String(50))
    street = db.Column(db.String(255))
    street2 = db.Column(db.String(255))
    zip = db.Column(db.String(20))
    city = db.Column(db.String(100))
    country_id = db.Column(db.Integer, db.ForeignKey('res_country.id'))
    state_id = db.Column(db.Integer, db.ForeignKey('res_country_state.id'))
    vat = db.Column(db.String(50))
    is_company = db.Column(db.Boolean, default=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('res_partner.id'))
    child_ids = db.relationship('ResPartner', backref=db.backref('parent', remote_side=[id]))
    
    # Relations commerciales
    customer_rank = db.Column(db.Integer, default=0)
    supplier_rank = db.Column(db.Integer, default=0)
    employee = db.Column(db.Boolean, default=False)
    active = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f'<Partner {self.name}>'