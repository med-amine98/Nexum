from flask import Blueprint, request, jsonify
from app import db
from app.models import Product, ProductCategory
from flask_jwt_extended import jwt_required

bp = Bluelogger.info('products', __name__, url_prefix='/api/products')

@bp.route('', methods=['GET'])
@jwt_required()
def get_products():
    products = Product.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'code': p.code,
        'barcode': p.barcode,
        'category_id': p.category_id,
        'list_price': p.list_price,
        'cost_price': p.cost_price,
        'stock': p.stock,
        'unit': p.unit
    } for p in products])

@bp.route('', methods=['POST'])
@jwt_required()
def create_product():
    data = request.json
    product = Product(
        name=data['name'],
        code=data.get('code'),
        barcode=data.get('barcode'),
        category_id=data.get('category_id'),
        list_price=data.get('list_price', 0),
        cost_price=data.get('cost_price', 0),
        stock=data.get('stock', 0),
        unit=data.get('unit', 'unit')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({'id': product.id, 'message': 'Product created'}), 201

@bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    categories = ProductCategory.query.all()
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'parent_id': c.parent_id
    } for c in categories])