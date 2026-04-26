import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, Document
import pydantic

class MyDoc(Document):
    name: str

async def main():
    uri = "mongodb+srv://deshanshul_db_user:anshul2005@tradingapp.nwmu1ka.mongodb.net/?appName=TradingApp"
    client = AsyncIOMotorClient(uri)
    db = client["ai_trading_portfolio"]
    print("DB created:", db)
    await init_beanie(database=db, document_models=[MyDoc])
    print("Beanie init done")

asyncio.run(main())
