# app/api/scraping.py
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from urllib.parse import urljoin

from app.core.database import get_db
from app.models.scraping import ScrapingTask, ScrapingResult
from app.services.scraping_service import WebScraper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/scraping", tags=["scraping"])


class ScrapingConfig(BaseModel):
    maxPages: int = 5
    extractImages: bool = True
    extractLinks: bool = True
    extractMetadata: bool = True
    depth: int = 1
    keywords: List[str] = []
    dateRange: str = '7d'


class ScrapingRequest(BaseModel):
    urls: List[str]
    config: ScrapingConfig


def extract_images_from_page(soup, page_url):
    """Extrait les URLs complètes des images d'une page"""
    images = []
    for img in soup.find_all('img'):
        src = img.get('src')
        if src:
            # Construire l'URL absolue
            if src.startswith('http'):
                img_url = src
            elif src.startswith('//'):
                img_url = 'https:' + src
            else:
                img_url = urljoin(page_url, src)
            
            images.append({
                'url': img_url,
                'alt': img.get('alt', ''),
                'title': img.get('title', '')
            })
    return images


@router.post("/multi")
async def perform_scraping(
    request: ScrapingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """Lancer une tâche de scraping web"""
    
    task = ScrapingTask(
        user_id=user_id,
        urls=request.urls,
        config=request.config.dict(),
        status="pending",
        created_at=datetime.utcnow()
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    background_tasks.add_task(execute_scraping_task, task.id, request.urls, request.config.dict())
    
    return {"task_id": task.id, "status": "pending", "message": "Tâche de scraping lancée avec succès"}


async def execute_scraping_task(task_id: int, urls: List[str], config: Dict[str, Any]):
    """Exécuter la tâche de scraping en arrière-plan"""
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    scraper = WebScraper()
    
    try:
        task = db.query(ScrapingTask).filter(ScrapingTask.id == task_id).first()
        if task:
            task.status = "running"
            db.commit()
        
        # Scraper les sites web
        web_results = await scraper.scrape_multiple_urls(urls, config)
        
        # Sauvegarder les résultats avec les URLs d'images
        for result in web_results:
            if result and result.get('url'):
                # Extraire les URLs d'images si disponibles
                image_urls = result.get('image_urls', [])
                if not image_urls and result.get('images'):
                    # Si 'images' est une liste d'objets avec 'url'
                    if isinstance(result.get('images'), list):
                        image_urls = [img.get('url') for img in result.get('images', []) if img.get('url')]
                    elif isinstance(result.get('images'), int):
                        image_urls = []
                
                scraping_result = ScrapingResult(
                    task_id=task_id,
                    url=result.get('url'),
                    title=result.get('title', ''),
                    content=result.get('content', '')[:5000] if result.get('content') else '',
                    images=image_urls if image_urls else result.get('images', []),
                    links=result.get('links', [])
                )
                db.add(scraping_result)
        
        # Mettre à jour la tâche
        if task:
            task.status = "completed"
            task.completed_at = datetime.utcnow()
            task.pages_scraped = len(web_results)
            task.progress = 100
            db.commit()
        
        await scraper.close_session()
        logger.info(f"✅ Tâche {task_id} terminée avec succès")
        
    except Exception as e:
        logger.error(f"❌ Erreur lors du scraping tâche {task_id}: {str(e)}")
        task = db.query(ScrapingTask).filter(ScrapingTask.id == task_id).first()
        if task:
            task.status = "failed"
            task.error_message = str(e)
            db.commit()
    finally:
        db.close()


@router.get("/tasks/{task_id}")
async def get_scraping_task(task_id: int, db: Session = Depends(get_db)):
    """Récupérer les détails d'une tâche de scraping"""
    task = db.query(ScrapingTask).filter(ScrapingTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    return {
        "id": task.id,
        "status": task.status,
        "progress": task.progress,
        "pages_scraped": task.pages_scraped,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "error_message": task.error_message
    }


@router.get("/tasks/{task_id}/results")
async def get_scraping_results(task_id: int, db: Session = Depends(get_db)):
    """Récupérer les résultats d'une tâche de scraping avec URLs d'images"""
    task = db.query(ScrapingTask).filter(ScrapingTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    web_results = db.query(ScrapingResult).filter(ScrapingResult.task_id == task_id).all()
    
    pages = []
    for r in web_results:
        page_data = {
            "url": r.url,
            "title": r.title,
            "content": r.content[:500] if r.content else "",
            "links": len(r.links) if r.links else 0,
            "scraped_at": r.scraped_at
        }
        
        # Gérer les images (soit nombre, soit liste d'URLs)
        if r.images:
            if isinstance(r.images, list):
                page_data["images"] = len(r.images)
                page_data["image_urls"] = r.images[:20]  # Limiter à 20 images
            else:
                page_data["images"] = r.images
                page_data["image_urls"] = []
        else:
            page_data["images"] = 0
            page_data["image_urls"] = []
        
        pages.append(page_data)
    
    return {
        "id": task_id,
        "pages": pages,
        "total_pages": len(web_results)
    }


@router.get("/history")
async def get_scraping_history(db: Session = Depends(get_db), user_id: int = 1):
    """Récupérer l'historique des scrapings"""
    try:
        tasks = db.query(ScrapingTask).filter(ScrapingTask.user_id == user_id).order_by(ScrapingTask.created_at.desc()).limit(20).all()
        
        return [
            {
                "id": task.id,
                "urls": task.urls,
                "date": task.created_at,
                "pagesScraped": task.pages_scraped,
                "status": task.status,
                "config": task.config
            }
            for task in tasks
        ]
    except Exception as e:
        logger.error(f"Erreur historique scraping: {e}")
        return []


@router.post("/analyze")
async def analyze_scraped_data(data: Dict[str, Any], db: Session = Depends(get_db)):
    """Analyser les données scrapées"""
    return {
        "summary": "Analyse des données scrapées complétée",
        "keyInsights": [
            "Données collectées avec succès",
            "Contenu textuel extrait",
            "Liens et images identifiés"
        ],
        "recommendations": [
            "Utilisez les données pour générer un rapport",
            "Exportez les résultats pour analyse"
        ],
        "opportunities": []
    }