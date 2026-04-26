from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from beanie import PydanticObjectId
from models.alerts import Alert
from models.user import User
from routers.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])

class AlertCreate(BaseModel):
    ticker: str
    condition: str  # "ABOVE" or "BELOW"
    price: float

@router.get("/")
async def get_alerts(current_user: User = Depends(get_current_user)):
    alerts = await Alert.find(Alert.user_id == current_user.id).to_list()
    result = []
    for alert in alerts:
        d = alert.model_dump()
        d["id"] = str(alert.id)
        d["user_id"] = str(alert.user_id)
        result.append(d)
    return result

@router.post("/")
async def create_alert(alert_data: AlertCreate, current_user: User = Depends(get_current_user)):
    new_alert = Alert(
        user_id=current_user.id,
        ticker=alert_data.ticker.upper(),
        condition=alert_data.condition.upper(),
        price=alert_data.price
    )
    await new_alert.insert()
    
    d = new_alert.model_dump()
    d["id"] = str(new_alert.id)
    d["user_id"] = str(new_alert.user_id)
    return d

@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, current_user: User = Depends(get_current_user)):
    alert = await Alert.get(PydanticObjectId(alert_id))
    if not alert or alert.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Alert not found")
    await alert.delete()
    return {"message": "Alert deleted"}

async def check_alerts_loop():
    import yfinance as yf
    import asyncio
    import time
    
    while True:
        try:
            # Get all active alerts
            active_alerts = await Alert.find(Alert.is_triggered == False).to_list()
            
            # Group by ticker to minimize yfinance calls
            tickers = set([a.ticker for a in active_alerts])
            
            prices = {}
            for t in tickers:
                try:
                    ticker = yf.Ticker(t)
                    prices[t] = float(ticker.fast_info.last_price)
                except:
                    continue
                    
            for alert in active_alerts:
                current_price = prices.get(alert.ticker)
                if current_price:
                    triggered = False
                    if alert.condition == "ABOVE" and current_price >= alert.price:
                        triggered = True
                    elif alert.condition == "BELOW" and current_price <= alert.price:
                        triggered = True
                        
                    if triggered:
                        alert.is_triggered = True
                        alert.triggered_at = time.time()
                        await alert.save()
        except Exception as e:
            print("Alert worker error:", e)
            
        await asyncio.sleep(60)  # Check every 60 seconds

