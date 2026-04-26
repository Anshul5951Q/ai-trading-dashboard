from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routers import auth, portfolio, analysis, advisor, alerts, optimize
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database connection on startup
    await init_db()
    
    # Start background alert worker
    asyncio.create_task(alerts.check_alerts_loop())
    
    yield
    # Clean up on shutdown if needed

app = FastAPI(title="AI Trading Portfolio Analyzer", lifespan=lifespan)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(advisor.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(optimize.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
