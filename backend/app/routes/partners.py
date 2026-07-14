from flask import Blueprint, request, jsonify
from app import db
from app.models import Partner
from flask_jwt_extended import jwt_required

bp = Bluelogger.info('partners', __name__, url_prefix='/api/partners')

@bp.route('', methods=['GET'])
@jwt_required()
def get_partners():
    partners = Partner.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'type': p.type,
        'email': p.email,
        'phone': p.phone,
        'city': p.city,
        'country': p.country,
        'is_active': p.is_active
    } for p in partners])

@bp.route('', methods=['POST'])
@jwt_required()
def create_partner():
    data = request.json
    partner = Partner(
        name=data['name'],
        type=data.get('type', 'customer'),
        email=data.get('email'),
        phone=data.get('phone'),
        mobile=data.get('mobile'),
        address=data.get('address'),
        city=data.get('city'),
        country=data.get('country'),
        vat=data.get('vat')
    )
    db.session.add(partner)
    db.session.commit()
    return jsonify({'id': partner.id, 'message': 'Partner created'}), 201

@bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_partner(id):
    partner = Partner.query.get_or_404(id)
    data = request.json
    
    for key, value in data.items():
        if hasattr(partner, key):
            setattr(partner, key, value)
    
    db.session.commit()
    return jsonify({'message': 'Partner updated'})

@bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_partner(id):
    partner = Partner.query.get_or_404(id)
    partner.is_active = False  # Soft delete
    db.session.commit()
    return jsonify({'message': 'Partner deleted'})