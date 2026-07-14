from app.database import db
from datetime import datetime

class AIConversation(db.Model):
    __tablename__ = 'ai_conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    message = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    intent = db.Column(db.String(100))
    confidence = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='ai_conversations')

class AIPrediction(db.Model):
    __tablename__ = 'ai_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    model_type = db.Column(db.String(50))  # sales, stock, hr
    prediction_data = db.Column(db.JSON)
    confidence_score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)

class AITrainingLog(db.Model):
    __tablename__ = 'ai_training_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(100))
    accuracy = db.Column(db.Float)
    training_date = db.Column(db.DateTime, default=datetime.utcnow)
    parameters = db.Column(db.JSON)