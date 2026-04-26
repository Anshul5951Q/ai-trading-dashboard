import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    uri = "mongodb+srv://deshanshul_db_user:anshul2005@tradingapp.nwmu1ka.mongodb.net/?appName=TradingApp"
    client = AsyncIOMotorClient(uri)
    db = client["ai_trading_portfolio"]
    
    users = await db.users.count_documents({})
    portfolios = await db.portfolio_items.count_documents({})
    
    print(f"Users found: {users}")
    print(f"Portfolio items found: {portfolios}")
    
    databases = await client.list_database_names()
    print("All databases in this cluster:", databases)

asyncio.run(check_db())
