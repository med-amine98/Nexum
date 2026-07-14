# app/services/sentiment_analyzer.py
from textblob import TextBlob
from typing import List, Dict, Any
import re
from collections import Counter
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import logging
logger = logging.getLogger(__name__)
# Télécharger les ressources NLTK si nécessaire
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

class SentimentAnalyzer:
    """Service d'analyse de sentiment"""
    
    def __init__(self):
        # Correction: Convertir les listes en sets avant d'utiliser l'opérateur |
        french_stopwords = set(stopwords.words('french'))
        english_stopwords = set(stopwords.words('english'))
        self.stop_words = french_stopwords | english_stopwords
    
    def analyze_text(self, text: str) -> Dict[str, Any]:
        """Analyser le sentiment d'un texte"""
        if not text or not isinstance(text, str):
            return {'sentiment': 'neutral', 'score': 0.0, 'subjectivity': 0.0}
        
        try:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            
            if polarity > 0.1:
                sentiment = 'positive'
            elif polarity < -0.1:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'
            
            return {
                'sentiment': sentiment,
                'score': polarity,
                'subjectivity': blob.sentiment.subjectivity
            }
        except Exception as e:
            logger.error(f"Erreur analyse sentiment: {e}")
            return {'sentiment': 'neutral', 'score': 0.0, 'subjectivity': 0.0}
    
    def analyze_batch(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Analyser le sentiment d'un lot de textes"""
        return [self.analyze_text(text) for text in texts if text]
    
    def extract_keywords(self, texts: List[str], top_n: int = 20) -> List[str]:
        """Extraire les mots-clés les plus fréquents"""
        if not texts:
            return []
        
        all_words = []
        for text in texts:
            if not text:
                continue
            # Nettoyage du texte
            text = text.lower()
            # Supprimer la ponctuation
            text = re.sub(r'[^\w\s]', ' ', text)
            # Séparer les mots
            words = text.split()
            # Filtrer les stop words et les mots trop courts
            words = [word for word in words if word not in self.stop_words and len(word) > 2]
            all_words.extend(words)
        
        # Compter les fréquences
        word_counts = Counter(all_words)
        
        # Retourner les top N mots-clés
        return [word for word, count in word_counts.most_common(top_n)]
    
    def extract_entities(self, text: str) -> List[str]:
        """Extraire les entités nommées (simplifié)"""
        if not text:
            return []
        
        # Pattern pour détecter les entités potentielles (mots avec majuscules)
        pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
        entities = re.findall(pattern, text)
        
        # Filtrer les entités trop courtes
        entities = [e for e in entities if len(e) > 2]
        
        return list(set(entities))
    
    def aggregate_sentiment(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Agréger les analyses de sentiment"""
        total = len(analyses)
        if total == 0:
            return {
                'positive_count': 0,
                'negative_count': 0,
                'neutral_count': 0,
                'average_score': 0.0,
                'positive_percentage': 0,
                'negative_percentage': 0,
                'neutral_percentage': 0
            }
        
        positive = sum(1 for a in analyses if a['sentiment'] == 'positive')
        negative = sum(1 for a in analyses if a['sentiment'] == 'negative')
        neutral = sum(1 for a in analyses if a['sentiment'] == 'neutral')
        
        scores = [a['score'] for a in analyses]
        average_score = sum(scores) / len(scores)
        
        return {
            'positive_count': positive,
            'negative_count': negative,
            'neutral_count': neutral,
            'average_score': average_score,
            'positive_percentage': round(positive / total * 100, 2),
            'negative_percentage': round(negative / total * 100, 2),
            'neutral_percentage': round(neutral / total * 100, 2)
        }