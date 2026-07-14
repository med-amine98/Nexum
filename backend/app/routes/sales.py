from flask import Blueprint, request, jsonify
from app import db
from app.models import SaleOrder, SaleOrderLine, Product, Partner
from flask_jwt_extended import jwt_required
from datetime import datetime

bp = Bluelogger.info('sales', __name__, url_prefix='/api/sales')

@bp.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    orders = SaleOrder.query.all()
    return jsonify([{
        'id': o.id,
        'name': o.name,
        'partner_id': o.partner_id,
        'date_order': o.date_order.isoformat(),
        'amount_total': o.amount_total,
        'state': o.state
    } for o in orders])

@bp.route('/orders', methods=['POST'])
@jwt_required()
def create_order():
    data = request.json
    
    # Generate order name
    last_order = SaleOrder.query.order_by(SaleOrder.id.desc()).first()
    next_num = (last_order.id + 1) if last_order else 1
    order_name = f"SO{datetime.now().year}{next_num:04d}"
    
    order = SaleOrder(
        name=order_name,
        partner_id=data['partner_id'],
        state='draft'
    )
    db.session.add(order)
    db.session.flush()
    
    total = 0
    for line_data in data['lines']:
        product = Product.query.get(line_data['product_id'])
        subtotal = line_data['quantity'] * line_data['price_unit']
        
        line = SaleOrderLine(
            order_id=order.id,
            product_id=line_data['product_id'],
            quantity=line_data['quantity'],
            price_unit=line_data['price_unit'],
            price_subtotal=subtotal
        )
        db.session.add(line)
        total += subtotal
    
    order.amount_total = total
    db.session.commit()
    
    return jsonify({'id': order.id, 'name': order.name}), 201

@bp.route('/orders/<int:id>/confirm', methods=['POST'])
@jwt_required()
def confirm_order(id):
    order = SaleOrder.query.get_or_404(id)
    order.state = 'confirmed'
    db.session.commit()
    return jsonify({'message': 'Order confirmed'})