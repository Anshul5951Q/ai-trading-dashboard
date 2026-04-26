from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from core.config import settings
from models.user import User
from models.portfolio import PortfolioItem, AIInsight
from models.alerts import Alert

# Patch to bypass beanie's issue with newer motor/pymongo versions
AsyncIOMotorClient.append_metadata = lambda self, *args, **kwargs: None

async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URI)

    db = client["ai_trading_portfolio"]   # ✅ FIXED

    await init_beanie(
        database=db,
        document_models=[
            User,
            PortfolioItem,
            AIInsight,
            Alert
        ]
    )