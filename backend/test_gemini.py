import asyncio
from core.config import settings
from google import genai

async def test():
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    prompt = """
    You are an expert AI stock trading advisor. Analyze the following data for RELIANCE:
    - Technicals: RSI is 50, MACD is 1.2.
    - Recent News Headlines:
    - Reliance launching new AI product
    
    You must deeply analyze the context of the news against technical indicators.
    
    Return ONLY a valid JSON response in the exact format:
    {
      "action": "BUY", 
      "sentiment_score": 0.8,
      "sentiment_label": "Bullish",
      "top_reasons": ["Reason 1", "Reason 2"],
      "reasoning": "A highly contextual 2-sentence explanation."
    }
    """
    try:
        res = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        print("RAW TEXT:", res.text)
    except Exception as e:
        print("ERROR:", e)

asyncio.run(test())
