import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

# Patch the class to bypass beanie's issue with pymongo >= 4.7
AsyncIOMotorClient.append_metadata = lambda self, *args, **kwargs: None

async def main():
    uri = "mongodb+srv://deshanshul_db_user:anshul2005@tradingapp.nwmu1ka.mongodb.net/?appName=TradingApp"
    client = AsyncIOMotorClient(uri)
    db = client["ai_trading_portfolio"]
    print("Type of db.client:", type(db.client))
    try:
        db.client.append_metadata({})
        print("Success!")
    except Exception as e:
        print("Error calling append_metadata:", repr(e))

asyncio.run(main())
