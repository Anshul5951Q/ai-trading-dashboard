from fastapi import APIRouter, Depends
from models.user import User
from models.portfolio import PortfolioItem, AIInsight
from routers.auth import get_current_user
from routers.analysis import get_stock_analysis
from core.config import settings
import asyncio
import json
import time

CACHE_TTL = 300  # 5 minutes

try:
    from google import genai
    gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None
except ImportError:
    gemini_client = None

router = APIRouter(prefix="/advisor", tags=["advisor"])

gemini_lock = asyncio.Lock()

async def get_gemini_advice(ticker: str, rsi: float, macd: float, news_headlines: list) -> dict:
    if not gemini_client:
        return {"action": "HOLD", "reasoning": "Gemini API Key missing.", "sentiment_score": 0.5, "sentiment_label": "Neutral", "top_reasons": []}
        
    current_time = time.time()
    
    # Check MongoDB cache
    cached_insight = await AIInsight.find_one(AIInsight.ticker == ticker)
    if cached_insight and current_time - cached_insight.timestamp < CACHE_TTL:
        return {
            "action": cached_insight.action,
            "reasoning": cached_insight.reasoning,
            "sentiment_score": cached_insight.sentiment_score,
            "sentiment_label": cached_insight.sentiment_label,
            "top_reasons": cached_insight.top_reasons
        }
            
    news_text = "\n".join([f"- {news}" for news in news_headlines]) if news_headlines else "No recent news available."
    
    prompt = f"""
    You are an expert AI stock trading advisor. Analyze the following data for {ticker}:
    - Technicals: RSI is {rsi}, MACD is {macd}.
    - Recent News Headlines:
    {news_text}
    
    You must deeply analyze the context of the news against technical indicators.
    
    Return ONLY a valid JSON response in the exact format:
    {{
      "action": "BUY" | "SELL" | "HOLD", 
      "sentiment_score": a float between 0.0 (very bearish) and 1.0 (very bullish),
      "sentiment_label": "Bullish" | "Bearish" | "Neutral",
      "top_reasons": ["Reason 1", "Reason 2"],
      "reasoning": "A highly contextual 2-sentence explanation."
    }}
    """
    
    try:
        def call_gemini():
            return gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
        
        advice = None
        # QUEUE REQUESTS TO AVOID RATE LIMITS!
        async with gemini_lock:
            # Wait 3 seconds to guarantee we stay under 15 Requests Per Minute
            await asyncio.sleep(3)
            for attempt in range(3):
                try:
                    response = await asyncio.to_thread(call_gemini)
                    
                    # Clean markdown backticks if Gemini ignores mime_type
                    raw_text = response.text.strip()
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                        
                    advice = json.loads(raw_text.strip())
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < 2:
                        await asyncio.sleep(6)
                        continue
                    raise e
                
        if not advice:
            raise Exception("Failed after retries")
            
        # Ensure default values if Gemini misses them
        advice.setdefault("sentiment_score", 0.5)
        advice.setdefault("sentiment_label", "Neutral")
        advice.setdefault("top_reasons", [])
        
        # Save to DB
        if cached_insight:
            cached_insight.action = advice.get("action", "HOLD")
            cached_insight.reasoning = advice.get("reasoning", "")
            cached_insight.sentiment_score = float(advice["sentiment_score"])
            cached_insight.sentiment_label = str(advice["sentiment_label"])
            cached_insight.top_reasons = advice["top_reasons"]
            cached_insight.timestamp = current_time
            await cached_insight.save()
        else:
            new_insight = AIInsight(
                ticker=ticker,
                action=advice.get("action", "HOLD"),
                sentiment_score=float(advice["sentiment_score"]),
                sentiment_label=str(advice["sentiment_label"]),
                top_reasons=advice["top_reasons"],
                reasoning=advice.get("reasoning", ""),
                timestamp=current_time
            )
            await new_insight.insert()
            
        return advice
    except Exception as e:
        print(f"Gemini error for {ticker}:", e)
        error_str = str(e)
        if "429" in error_str:
            return {"action": "HOLD", "reasoning": "AI rate-limited (15 req/min). Please wait.", "sentiment_score": 0.5, "sentiment_label": "Neutral", "top_reasons": []}
        return {"action": "HOLD", "reasoning": f"API Error: {error_str[:100]}", "sentiment_score": 0.5, "sentiment_label": "Neutral", "top_reasons": []}

@router.get("/single/{ticker}")
async def get_single_stock_advice(ticker: str, current_user: User = Depends(get_current_user)):
    try:
        data = await get_stock_analysis(ticker)
        
        from routers.analysis import fetch_newsapi, fetch_yfinance_news
        news = fetch_newsapi(ticker)
        if not news:
            news = fetch_yfinance_news(ticker)
            
        rsi = data.get("indicators", {}).get("rsi", 50)
        macd = data.get("indicators", {}).get("macd", 0)
        
        advice = await get_gemini_advice(ticker, rsi, macd, news)
        return advice
    except Exception as e:
        print(f"Single advisor error: {e}")
        return {"action": "HOLD", "reasoning": "Could not analyze this stock right now."}

async def get_bulk_advice(portfolio_data: list) -> dict:
    """Sends a single request to Gemini to analyze the entire portfolio at once."""
    if not gemini_client:
        return {ticker: {"action": "HOLD", "reasoning": "Gemini API Key missing."} for ticker in [d["ticker"] for d in portfolio_data]}
        
    prompt = f"""
    You are an expert AI stock trading advisor. Analyze the following portfolio:
    {json.dumps(portfolio_data)}
    
    For each stock, provide a BUY/SELL/HOLD action, a sentiment score (0-1), and a 2-sentence reasoning.
    
    Return ONLY a valid JSON object where keys are ticker symbols:
    {{
      "TICKER": {{
        "action": "BUY" | "SELL" | "HOLD",
        "sentiment_score": float,
        "sentiment_label": "Bullish" | "Bearish" | "Neutral",
        "top_reasons": ["reason1", "reason2"],
        "reasoning": "explanation"
      }}
    }}
    """
    
    try:
        def call_gemini():
            return gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
        
        response = await asyncio.to_thread(call_gemini)
        
        # Clean markdown backticks if Gemini ignores mime_type
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        bulk_advice = json.loads(raw_text.strip())
        
        # Save each to DB cache
        current_time = time.time()
        for ticker, advice in bulk_advice.items():
            await AIInsight.find_one(AIInsight.ticker == ticker).update(
                {"$set": {
                    "action": advice.get("action", "HOLD"),
                    "sentiment_score": advice.get("sentiment_score", 0.5),
                    "sentiment_label": advice.get("sentiment_label", "Neutral"),
                    "top_reasons": advice.get("top_reasons", []),
                    "reasoning": advice.get("reasoning", ""),
                    "timestamp": current_time
                }},
                upsert=True
            )
        return bulk_advice
    except Exception as e:
        print("Bulk Gemini error:", e)
        return {}

async def get_portfolio_summary(recommendations: list) -> str:
    if not gemini_client:
        return "Gemini API key missing. Unable to generate summary."
        
    prompt = f"""
    You are an expert AI portfolio manager. Review these specific actions generated for the user's portfolio:
    {json.dumps(recommendations)}
    
    Write a 2-sentence highly professional portfolio summary advising the user on their overall strategy based on these actions. Be direct and insightful.
    """
    
    try:
        def call_gemini_summary():
            return gemini_client.models.generate_content(
                model='gemini-flash-lite-latest',
                contents=prompt
            )
            
        for attempt in range(3):
            try:
                response = await asyncio.to_thread(call_gemini_summary)
                return response.text.strip()
            except Exception as e:
                if "429" in str(e) and attempt < 2:
                    await asyncio.sleep(6)
                    continue
                raise e
    except Exception as e:
        print("Gemini summary error:", e)
        return "Your portfolio has been analyzed successfully."

@router.get("/")
async def get_portfolio_advice(current_user: User = Depends(get_current_user)):
    items = await PortfolioItem.find(PortfolioItem.user_id == current_user.id).to_list()
    
    if not items:
        return {"summary": "Portfolio is empty.", "recommendations": []}

    # 1. Gather all technical data first
    portfolio_tech_data = []
    for item in items:
        try:
            analysis = await get_stock_analysis(item.ticker)
            portfolio_tech_data.append({
                "ticker": item.ticker,
                "rsi": analysis["indicators"]["rsi"],
                "macd": analysis["indicators"]["macd_hist"]
            })
        except:
            continue

    # 2. Call Gemini ONCE for the entire portfolio
    bulk_advice = await get_bulk_advice(portfolio_tech_data)

    # 3. Format final response
    recommendations = []
    for ticker, advice in bulk_advice.items():
        advice["ticker"] = ticker
        recommendations.append(advice)

    summary = await get_portfolio_summary(recommendations)

    return {
        "summary": summary,
        "recommendations": recommendations
    }
