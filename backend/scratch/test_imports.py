try:
    logger.info("Attempting to import app.main...")
    import app.main
    logger.info("SUCCESS: app.main imported without exceptions!")
except Exception as e:
    logger.info("FAILED to import app.main!")
    import traceback
    traceback.print_exc()
