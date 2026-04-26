from beanie import Document
from pydantic import Field
from typing import Optional
from beanie import PydanticObjectId

class PortfolioItem(Document):
    user_id: PydanticObjectId
    ticker: str
    quantity: float
    buy_price: float
    sector: Optional[str] = None
    beta: Optional[float] = None
    
    class Settings:
        name = "portfolio_items"

class AIInsight(Document):
    ticker: str
    action: str
    sentiment_score: float
    sentiment_label: str
    top_reasons: list[str]
    reasoning: str
    timestamp: float
    
    class Settings:
        name = "ai_insights"
