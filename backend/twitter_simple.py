import requests
import json
from datetime import datetime
import re

class TwitterSimple:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def get_tweets(self, username, limit=10):
        """Récupère les tweets via Nitter (gratuit, sans clé API)"""
        
        # Utiliser une instance Nitter publique
        nitter_url = f"https://nitter.poast.org/{username}"
        
        try:
            response = self.session.get(nitter_url, timeout=15)
            if response.status_code != 200:
                return []
            
            # Extraire les tweets avec regex simple
            tweets = []
            pattern = r'<div class="tweet-content[^"]*"[^>]*>(.*?)</div>'
            
            matches = re.findall(pattern, response.text, re.DOTALL)
            
            for i, match in enumerate(matches[:limit]):
                # Nettoyer le HTML
                text = re.sub(r'<[^>]+>', ' ', match)
                text = re.sub(r'\s+', ' ', text).strip()
                
                if text and len(text) > 10:
                    tweets.append({
                        'content': text,
                        'sentiment': self._analyze_sentiment(text),
                        'engagement': 0
                    })
            
            return tweets
            
        except Exception as e:
            logger.error(f"Erreur: {e}")
            return []
    
    def _analyze_sentiment(self, text):
        """Analyse simple de sentiment"""
        positive = ['good', 'great', 'awesome', 'love', 'excellent', 'super', 'best']
        negative = ['bad', 'terrible', 'hate', 'awful', 'worst', 'poor']
        
        text_lower = text.lower()
        pos = sum(1 for w in positive if w in text_lower)
        neg = sum(1 for w in negative if w in text_lower)
        
        if pos > neg:
            return 'positive'
        elif neg > pos:
            return 'negative'
        return 'neutral'

# Test
if __name__ == "__main__":
    tw = TwitterSimple()
    tweets = tw.get_tweets("elonmusk", 5)
    for tweet in tweets:
        logger.info(f"{tweet['sentiment']}: {tweet['content'][:100]}...")
