from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.res_users import ResUsers
from .models import SaleOrder, SaleOrderLine
from app import db

sale_bp = Bluelogger.info('sale', __name__, url_prefix='/api/sale')

@sale_bp.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = get_jwt_identity()
    user = ResUsers.query.get(user_id)
    
    orders = SaleOrder.query.filter_by(company_id=user.company_id).all()
    return jsonify([{
        'id': o.id,
        'name': o.name,
        'partner_id': o.partner_id,
        'date_order': o.date_order.isoformat(),
        'amount_total': o.amount_total,
        'state': o.state
    } for o in orders])

@sale_bp.route('/orders', methods=['POST'])
@jwt_required()
def create_order():
    user_id = get_jwt_identity()
    user = ResUsers.query.get(user_id)
    data = request.json
    
    # Générer le nom de la commande
    last_order = SaleOrder.query.filter_by(company_id=user.company_id)\
        .order_by(SaleOrder.id.desc()).first()
    if last_order:
        num = int(last_order.name.split('-')[-1]) + 1
    else:
        num = 1
    order_name = f"SO-{datetime.now().year}-{num:04d}"
    
    order = SaleOrder(
        name=order_name,
        partner_id=data['partner_id'],
        company_id=user.company_id,
        create_uid=user.id,
        state='draft'
    )
    db.session.add(order)
    db.session.flush()
    
    total = 0
    for line_data in data['lines']:
        line = SaleOrderLine(
            order_id=order.id,
            product_id=line_data['product_id'],
            product_uom_qty=line_data['quantity'],
            price_unit=line_data['price_unit'],
            discount=line_data.get('discount', 0),
            name=line_data.get('name', '')
        )
        line._compute_subtotal()
        db.session.add(line)
        total += line.price_subtotal
    
    order.amount_untaxed = total
    order.amount_tax = total * 0.2
    order.amount_total = total * 1.2
    
    db.session.commit()
    
    return jsonify({'id': order.id, 'name': order.name}), 201

@sale_bp.route('/orders/<int:id>/confirm', methods=['POST'])
@jwt_required()
def confirm_order(id):
    order = SaleOrder.query.get_or_404(id)
    order.state = 'sale'
    db.session.commit()
    return jsonify({'message': 'Commande confirmée'})

@sale_bp.route('/orders/<int:id>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(id):
    order = SaleOrder.query.get_or_404(id)
    order.state = 'cancel'
    db.session.commit()
    return jsonify({'message': 'Commande annulée'})