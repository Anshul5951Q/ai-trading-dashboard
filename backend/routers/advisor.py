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
                model='gemini-flash-lite-latest',
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
        
        advice = None
        for attempt in range(3):
            try:
                response = await asyncio.to_thread(call_gemini)
                advice = json.loads(response.text)
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
        return {"action": "HOLD", "reasoning": "Failed to generate AI advice.", "sentiment_score": 0.5, "sentiment_label": "Neutral", "top_reasons": []}

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
        return {
            "summary": "Your portfolio is empty. Add some stocks to get personalized AI advice!",
            "recommendations": []
        }

    recommendations = []
    
    for item in items:
        try:
            analysis = await get_stock_analysis(item.ticker)
            
            # Use the AI recommendation natively generated by the updated analysis endpoint
            advice = analysis.get("ai_recommendation", {"action": "HOLD", "reasoning": "Data unavailable."})
            
            advice["ticker"] = item.ticker
            recommendations.append(advice)
            
        except Exception as e:
            print(f"Failed to analyze {item.ticker}: {e}")
            continue

    summary = await get_portfolio_summary(recommendations)

    return {
        "summary": summary,
        "recommendations": recommendations
    }
