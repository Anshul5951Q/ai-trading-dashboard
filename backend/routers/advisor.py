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
                model='gemini-flash-lite-latest',
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
        
        response = await asyncio.to_thread(call_gemini)
        bulk_advice = json.loads(response.text)
        
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
