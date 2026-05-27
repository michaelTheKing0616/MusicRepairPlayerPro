"""API package"""
from fastapi import APIRouter
from app.api.routes import auth, upload, transform, jobs, presets, experience, users, integrations
from app.api.routes import recommendations
from app.core.config import settings

api_router = APIRouter(prefix=settings.API_V1_PREFIX)

# Include routers
api_router.include_router(auth.router)
api_router.include_router(upload.router)
api_router.include_router(transform.router)
api_router.include_router(jobs.router)
api_router.include_router(presets.router)
api_router.include_router(experience.router)
api_router.include_router(users.router)
api_router.include_router(integrations.router)
api_router.include_router(recommendations.router)


