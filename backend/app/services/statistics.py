from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import List, Dict, Any
import random

from app.models.sale import SaleOrder, OrderStatus
from app.models.partner import Partner
from app.models.product import Product

class StatisticsService:
    @staticmethod
    def get_kpi_data(db: Session) -> List[Dict[str, Any]]:
        """Calcule les KPIs pour le dashboard"""
        # Chiffre d'affaires du mois
        current_month = datetime.now().replace(day=1)
        last_month = (current_month - timedelta(days=1)).replace(day=1)
        
        revenue_current = db.query(func.sum(SaleOrder.amount_total))\
            .filter(SaleOrder.date_order >= current_month)\
            .filter(SaleOrder.status.in_([OrderStatus.CONFIRMED, OrderStatus.DELIVERED]))\
            .scalar() or 0
        
        revenue_last = db.query(func.sum(SaleOrder.amount_total))\
            .filter(SaleOrder.date_order >= last_month)\
            .filter(SaleOrder.date_order < current_month)\
            .filter(SaleOrder.status.in_([OrderStatus.CONFIRMED, OrderStatus.DELIVERED]))\
            .scalar() or 0
        
        # Nombre de commandes
        orders_current = db.query(func.count(SaleOrder.id))\
            .filter(SaleOrder.date_order >= current_month)\
            .scalar() or 0
        
        # Devis en cours
        quotes_pending = db.query(func.count(SaleOrder.id))\
            .filter(SaleOrder.status == OrderStatus.DRAFT)\
            .scalar() or 0
        
        # Taux de conversion
        total_quotes = db.query(func.count(SaleOrder.id))\
            .filter(SaleOrder.status.in_([OrderStatus.DRAFT, OrderStatus.CONFIRMED]))\
            .scalar() or 1
        converted = db.query(func.count(SaleOrder.id))\
            .filter(SaleOrder.status == OrderStatus.CONFIRMED)\
            .scalar() or 0
        conversion_rate = (converted / total_quotes) * 100 if total_quotes > 0 else 0
        
        # Calcul des tendances
        revenue_trend = ((revenue_current - revenue_last) / revenue_last * 100) if revenue_last > 0 else 0
        orders_trend = random.uniform(5, 15)  # Simulé, à remplacer par vrai calcul
        
        return [
            {
                "title": "Chiffre d'affaires",
                "value": revenue_current,
                "prefix": "€",
                "trend": revenue_trend,
                "trend_up": revenue_trend > 0,
                "subtitle": "vs mois dernier"
            },
            {
                "title": "Commandes",
                "value": orders_current,
                "trend": orders_trend,
                "trend_up": orders_trend > 0,
                "subtitle": "ce mois"
            },
            {
                "title": "Devis en cours",
                "value": quotes_pending,
                "trend": -5.2,  # Simulé
                "trend_up": False,
                "subtitle": "en attente"
            },
            {
                "title": "Taux de conversion",
                "value": f"{conversion_rate:.1f}%",
                "trend": 3.1,  # Simulé
                "trend_up": True,
                "subtitle": "+2% vs dernier mois"
            }
        ]
    
    @staticmethod
    def get_sales_chart_data(db: Session) -> List[Dict[str, Any]]:
        """Données pour le graphique d'évolution"""
        current_year = datetime.now().year
        months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
        
        chart_data = []
        for i, month in enumerate(months[:7]):  # 7 premiers mois
            month_num = i + 1
            ventes = db.query(func.sum(SaleOrder.amount_total))\
                .filter(extract('year', SaleOrder.date_order) == current_year)\
                .filter(extract('month', SaleOrder.date_order) == month_num)\
                .filter(SaleOrder.status.in_([OrderStatus.CONFIRMED, OrderStatus.DELIVERED]))\
                .scalar() or 0
            
            # Prévision simulée
            prevision = ventes * random.uniform(0.95, 1.05)
            
            # Nombre de commandes
            commandes = db.query(func.count(SaleOrder.id))\
                .filter(extract('year', SaleOrder.date_order) == current_year)\
                .filter(extract('month', SaleOrder.date_order) == month_num)\
                .scalar() or 0
            
            chart_data.append({
                "month": month,
                "ventes": ventes / 1000,  # En milliers
                "prevision": prevision / 1000,
                "commandes": commandes
            })
        
        return chart_data
    
    @staticmethod
    def get_category_distribution(db: Session) -> List[Dict[str, Any]]:
        """Répartition des ventes par catégorie"""
        categories = [
            {"name": "Électronique", "color": "#875A7B"},
            {"name": "Informatique", "color": "#F6AE2D"},
            {"name": "Téléphonie", "color": "#86BBD8"},
            {"name": "Accessoires", "color": "#758E4F"},
        ]
        
        # Simulé - à remplacer par vraie requête
        for cat in categories:
            cat["value"] = random.randint(10, 45)
        
        return categories
    
    @staticmethod
    def get_pipeline_data(db: Session) -> List[Dict[str, Any]]:
        """Pipeline des opportunités"""
        stages = [
            {"stage": "Prospection", "count": 23, "value": 45000},
            {"stage": "Qualification", "count": 18, "value": 67000},
            {"stage": "Proposition", "count": 12, "value": 89000},
            {"stage": "Négociation", "count": 8, "value": 120000},
            {"stage": "Gagné", "count": 15, "value": 234000},
        ]
        return stages