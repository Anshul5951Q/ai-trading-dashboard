from fastapi import APIRouter, HTTPException
import yfinance as yf
import pandas as pd
from utils.indicators import calculate_rsi, calculate_macd, calculate_sma, calculate_ema
import numpy as np
from core.config import settings
import requests

router = APIRouter(prefix="/analysis", tags=["analysis"])

def fetch_newsapi(ticker: str):
    if not settings.NEWSAPI_KEY:
        return []
    try:
        url = f"https://newsapi.org/v2/everything?q={ticker}&language=en&sortBy=publishedAt&apiKey={settings.NEWSAPI_KEY}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            articles = res.json().get("articles", [])
            return [article.get("title", "") + " " + article.get("description", "") for article in articles[:5]]
    except Exception as e:
        print(f"NewsAPI error: {e}")
    return []

def fetch_yfinance_news(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        news = stock.news
        return [item.get("title", "") for item in news[:5]]
    except:
        return []

@router.get("/index/{ticker}")
async def get_index_data(ticker: str):
    ticker = ticker.strip().upper()
    stock = yf.Ticker(ticker)
    df = stock.history(period="1d", interval="15m")
    
    if df.empty:
        raise HTTPException(status_code=404, detail="Index data not found")
        
    df = df.replace({np.nan: None}).reset_index()
    
    historical_data = []
    for _, row in df.iterrows():
        timestamp = int(row["Datetime"].timestamp() * 1000) if "Datetime" in row else int(row["Date"].timestamp() * 1000)
        historical_data.append({
            "date": timestamp,
            "open": row["Open"],
            "high": row["High"],
            "low": row["Low"],
            "close": row["Close"]
        })
        
    try:
        current_price = float(stock.fast_info.last_price)
        previous_close = float(stock.fast_info.previous_close)
    except Exception:
        current_price = float(df.iloc[-1]["Close"])
        previous_close = float(df.iloc[0]["Open"]) # Fallback

    change = current_price - previous_close
    change_percent = (change / previous_close) * 100 if previous_close else 0

    return {
        "ticker": ticker,
        "current_price": current_price,
        "change": change,
        "change_percent": change_percent,
        "historical_data": historical_data
    }

@router.get("/{ticker}")
async def get_stock_analysis(ticker: str):
    ticker = ticker.strip().upper()
    stock = yf.Ticker(ticker)
    df = stock.history(period="5d", interval="15m")
    
    if df.empty:
        raise HTTPException(status_code=404, detail="Stock data not found")
        
    # Calculate indicators manually
    df["SMA_20"] = calculate_sma(df["Close"], period=20)
    df["EMA_20"] = calculate_ema(df["Close"], period=20)
    df["RSI_14"] = calculate_rsi(df["Close"], period=14)
    macd, signal, hist = calculate_macd(df["Close"])
    df["MACD_12_26_9"] = macd
    df["MACDs_12_26_9"] = signal
    df["MACDh_12_26_9"] = hist
    
    # Fill NaNs with None for JSON serialization
    df = df.replace({np.nan: None})
    
    # Get latest values
    latest = df.iloc[-1]
    
    # Prepare historical data for charting (last 40 points = 1.5 intraday days)
    recent_df = df.tail(40).reset_index()
    historical_data = []
    for _, row in recent_df.iterrows():
        # yfinance intraday index is 'Datetime'
        # ApexCharts requires timestamp for x-axis in candlestick
        timestamp = int(row["Datetime"].timestamp() * 1000) if "Datetime" in row else int(row["Date"].timestamp() * 1000)
        
        historical_data.append({
            "date": timestamp,
            "open": row["Open"],
            "high": row["High"],
            "low": row["Low"],
            "close": row["Close"],
            "sma": row.get("SMA_20"),
            "ema": row.get("EMA_20")
        })
        
    # Fetch news
    news_texts = fetch_newsapi(ticker)
    if not news_texts:
        news_texts = fetch_yfinance_news(ticker)
        
    try:
        current_price = float(stock.fast_info.last_price)
    except Exception:
        current_price = float(latest["Close"])

    return {
        "ticker": ticker,
        "current_price": current_price,
        "indicators": {
            "rsi": rsi_val,
            "macd": latest.get("MACD_12_26_9"),
            "macd_signal": latest.get("MACDs_12_26_9"),
            "macd_hist": macd_hist_val,
            "sma_20": latest.get("SMA_20"),
            "ema_20": latest.get("EMA_20")
        },
        "historical_data": historical_data
    }
