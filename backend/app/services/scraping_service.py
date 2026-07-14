# app/services/scraping_service.py - Version scraping web uniquement
import aiohttp
import asyncio
import re
from urllib.parse import urljoin
from typing import List, Dict, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class WebScraper:
    """Service de scraping web - Version asynchrone"""
    
    def __init__(self):
        self.session = None
    
    async def get_session(self):
        if not self.session or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )
        return self.session
    
    async def close_session(self):
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def scrape_url(self, url: str, depth: int = 1, extract_images: bool = True, extract_links: bool = True) -> Dict[str, Any]:
        """Scraper une URL unique"""
        try:
            session = await self.get_session()
            async with session.get(url, timeout=30) as response:
                if response.status != 200:
                    return {
                        'url': url,
                        'error': f"HTTP {response.status}",
                        'content': None,
                        'title': '',
                        'page_metadata': {},
                        'images': [],
                        'links': []
                    }
                html = await response.text()
            
            # Extraire le titre
            title_match = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
            title = title_match.group(1).strip() if title_match else ''
            
            # Extraire le contenu texte
            text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            
            result = {
                'url': url,
                'title': title,
                'content': text[:5000],
                'page_metadata': {
                    'description': '',
                    'keywords': '',
                    'author': ''
                },
                'images': [],
                'links': []
            }
            
            # Extraire les meta tags
            meta_desc = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
            if meta_desc:
                result['page_metadata']['description'] = meta_desc.group(1)
            
            # Extraire les images
            if extract_images:
                img_pattern = r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>'
                images = []
                for match in re.finditer(img_pattern, html, re.IGNORECASE):
                    src = match.group(1)
                    if src and not src.startswith('data:'):
                        full_url = urljoin(url, src)
                        images.append({'url': full_url})
                result['images'] = images[:20]
            
            # Extraire les liens
            if extract_links:
                link_pattern = r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>'
                links = []
                seen = set()
                for match in re.finditer(link_pattern, html, re.IGNORECASE):
                    href = match.group(1)
                    if href and href.startswith('http') and href not in seen:
                        seen.add(href)
                        links.append({'url': href})
                result['links'] = links[:50]
            
            return result
            
        except asyncio.TimeoutError:
            logger.warning(f"Timeout lors du scraping de {url}")
            return {
                'url': url,
                'error': 'Timeout',
                'content': None,
                'title': '',
                'page_metadata': {},
                'images': [],
                'links': []
            }
        except Exception as e:
            logger.error(f"Erreur lors du scraping de {url}: {str(e)}")
            return {
                'url': url,
                'error': str(e),
                'content': None,
                'title': '',
                'page_metadata': {},
                'images': [],
                'links': []
            }
    
    async def scrape_multiple_urls(self, urls: List[str], config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scraper plusieurs URLs en parallèle"""
        if not urls:
            return []
        
        tasks = []
        for url in urls:
            if url and isinstance(url, str):
                task = self.scrape_url(
                    url,
                    depth=config.get('depth', 1),
                    extract_images=config.get('extractImages', True),
                    extract_links=config.get('extractLinks', True)
                )
                tasks.append(task)
        
        if not tasks:
            return []
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            valid_results = []
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Exception dans gather: {result}")
                    continue
                if result and isinstance(result, dict):
                    valid_results.append(result)
            return valid_results
        except Exception as e:
            logger.error(f"Erreur lors du scraping multiple: {e}")
            return []