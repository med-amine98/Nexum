try:
    from app.api import api_router
    logger.info("✅ All models and routers loaded successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
