from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scaled.api.routes import health, customers, token_health, incidents, onboarding, telemetry

app = FastAPI(
    title="Scaled",
    description="AI-Native Scaled Customer Success Platform — powered by Claude",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://*.netlify.app"],
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(token_health.router, prefix="/api/token-health", tags=["Token Health Monitor"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incident Response"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["Onboarding Autopilot"])
app.include_router(telemetry.router, prefix="/api/telemetry", tags=["Telemetry & Plays"])
