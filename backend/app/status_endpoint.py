from fastapi import FastAPI

def register_status_endpoint(app: FastAPI):
    @app.get(
