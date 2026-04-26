from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class PortfolioItemCreate(BaseModel):
    ticker: str
    quantity: float
    buy_price: float

class PortfolioItemUpdate(BaseModel):
    quantity: Optional[float] = None
    buy_price: Optional[float] = None

class PortfolioItemResponse(PortfolioItemCreate):
    id: str
    sector: Optional[str] = None
    beta: Optional[float] = None
    
    class Config:
        from_attributes = True
