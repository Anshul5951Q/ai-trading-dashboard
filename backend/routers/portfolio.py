from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models.portfolio import PortfolioItem
from models.user import User
from routers.auth import get_current_user
from schemas import PortfolioItemCreate, PortfolioItemResponse, PortfolioItemUpdate
from services.market_data import get_current_price
import requests
import yfinance as yf
import pandas as pd

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/", response_model=List[dict])
async def get_portfolio(current_user: User = Depends(get_current_user)):
    items = await PortfolioItem.find(PortfolioItem.user_id == current_user.id).to_list()
    
    # Enrich with live data
    enriched_items = []
    for item in items:
        current_price = get_current_price(item.ticker)
        current_value = current_price * item.quantity
        investment = item.buy_price * item.quantity
        profit_loss = current_value - investment
        
        # Backfill sector and beta if missing
        if not item.sector or item.beta is None:
            try:
                info = yf.Ticker(item.ticker).info
                item.sector = info.get("sector", "Unknown")
                item.beta = info.get("beta", 1.0)
                await item.save()
            except:
                pass
                
        item_dict = item.model_dump()
        item_dict["id"] = str(item.id)
        item_dict["user_id"] = str(item.user_id)
        item_dict["current_price"] = current_price
        item_dict["current_value"] = current_value
        item_dict["profit_loss"] = profit_loss
        enriched_items.append(item_dict)
        
    return enriched_items

@router.get("/history")
async def get_portfolio_history(current_user: User = Depends(get_current_user)):
    items = await PortfolioItem.find(PortfolioItem.user_id == current_user.id).to_list()
    if not items:
        return []
        
    tickers = [item.ticker for item in items]
    try:
        data = yf.download(tickers, period="1mo")
        # In multi-ticker downloads, column 'Close' exists. Single ticker just returns standard DataFrame
        if "Close" in data:
            data = data["Close"]
            
        if len(tickers) == 1:
            data = pd.DataFrame({tickers[0]: data})
            
        # Forward fill missing days (holidays)
        data = data.ffill().fillna(0)
        
        history_list = []
        for index, row in data.iterrows():
            date_str = index.strftime("%m/%d")
            total_value = 0
            for item in items:
                ticker = item.ticker
                if ticker in row and pd.notna(row[ticker]):
                    total_value += float(row[ticker]) * item.quantity
            history_list.append({"date": date_str, "value": total_value})
            
        return history_list
    except Exception as e:
        print(f"Error generating history: {e}")
        return []

@router.get("/search")
async def search_ticker(q: str):
    if not q:
        return []
    url = "https://query2.finance.yahoo.com/v1/finance/search"
    params = {"q": q, "quotesCount": 15, "newsCount": 0}
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        res = requests.get(url, params=params, headers=headers)
        data = res.json()
        results = []
        for quote in data.get("quotes", []):
            if quote.get("quoteType") in ["EQUITY", "ETF", "MUTUALFUND"]:
                results.append({
                    "symbol": quote.get("symbol"),
                    "name": quote.get("longname") or quote.get("shortname"),
                    "exchange": quote.get("exchDisp")
                })
        
        # Sort to prioritize Indian markets (NSE / BSE) since app is localized to INR
        results.sort(key=lambda x: 0 if str(x.get("exchange", "")).upper() in ["NSE", "BSE", "BOMBAY"] or str(x.get("symbol", "")).endswith(".NS") or str(x.get("symbol", "")).endswith(".BO") else 1)
        
        if len(results) > 0:
            return results[:5]
    except Exception as e:
        print(f"Yahoo Search API failed: {e}")
        
    # LOCAL FALLBACK IF YAHOO API IS BLOCKED OR DOWN
    # Hardcoded popular NSE stocks as a resilient autocomplete dictionary
    local_db = [
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "exchange": "NSE"},
        {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "exchange": "NSE"},
        {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "exchange": "NSE"},
        {"symbol": "INFY.NS", "name": "Infosys", "exchange": "NSE"},
        {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "exchange": "NSE"},
        {"symbol": "SBIN.NS", "name": "State Bank of India", "exchange": "NSE"},
        {"symbol": "IRFC.NS", "name": "Indian Railway Finance Corp", "exchange": "NSE"},
        {"symbol": "IREDA.NS", "name": "Indian Renewable Energy Dev", "exchange": "NSE"},
        {"symbol": "IRB.NS", "name": "IRB Infrastructure Developers", "exchange": "NSE"},
        {"symbol": "ZOMATO.NS", "name": "Zomato Ltd.", "exchange": "NSE"},
        {"symbol": "ITC.NS", "name": "ITC Limited", "exchange": "NSE"},
        {"symbol": "TATAMOTORS.NS", "name": "Tata Motors", "exchange": "NSE"},
        {"symbol": "SUZLON.NS", "name": "Suzlon Energy", "exchange": "NSE"},
        {"symbol": "NHPC.NS", "name": "NHPC Limited", "exchange": "NSE"},
        {"symbol": "JIOFIN.NS", "name": "Jio Financial Services", "exchange": "NSE"},
        {"symbol": "HAL.NS", "name": "Hindustan Aeronautics", "exchange": "NSE"},
        {"symbol": "RVNL.NS", "name": "Rail Vikas Nigam", "exchange": "NSE"},
        {"symbol": "ADANIENT.NS", "name": "Adani Enterprises", "exchange": "NSE"},
        {"symbol": "AXISBANK.NS", "name": "Axis Bank", "exchange": "NSE"},
        {"symbol": "WIPRO.NS", "name": "Wipro", "exchange": "NSE"}
    ]
    
    q_upper = q.upper()
    results = []
    for stock in local_db:
        if q_upper in stock["symbol"] or q_upper in stock["name"].upper():
            results.append(stock)
            
    return results[:5]

@router.post("/", response_model=PortfolioItemResponse)
async def add_portfolio_item(item: PortfolioItemCreate, current_user: User = Depends(get_current_user)):
    ticker = item.ticker.strip().upper()
    
    # Smart validation and fallback for Indian stocks
    price = get_current_price(ticker)
    if price == 0.0 and "." not in ticker:
        ticker_ns = f"{ticker}.NS"
        if get_current_price(ticker_ns) > 0.0:
            ticker = ticker_ns
            price = get_current_price(ticker)
            
    if price == 0.0:
        raise HTTPException(status_code=400, detail=f"Invalid ticker: {item.ticker}. No market data found.")
        
    sector = "Unknown"
    beta = 1.0
    try:
        info = yf.Ticker(ticker).info
        sector = info.get("sector", "Unknown")
        beta = info.get("beta", 1.0)
    except:
        pass
        
    new_item = PortfolioItem(
        user_id=current_user.id,
        ticker=ticker,
        quantity=item.quantity,
        buy_price=item.buy_price,
        sector=sector,
        beta=beta
    )
    await new_item.insert()
    
    response = new_item.model_dump()
    response["id"] = str(new_item.id)
    return response

@router.delete("/{item_id}")
async def delete_portfolio_item(item_id: str, current_user: User = Depends(get_current_user)):
    from beanie import PydanticObjectId
    item = await PortfolioItem.get(PydanticObjectId(item_id))
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")
    await item.delete()
    return {"status": "deleted"}
