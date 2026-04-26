from fastapi import APIRouter, Depends
from models.portfolio import PortfolioItem
from models.user import User
from routers.auth import get_current_user
import yfinance as yf
import pandas as pd
import numpy as np

router = APIRouter(prefix="/optimize", tags=["optimize"])

@router.get("/")
async def get_portfolio_optimization(current_user: User = Depends(get_current_user)):
    items = await PortfolioItem.find(PortfolioItem.user_id == current_user.id).to_list()
    
    if len(items) < 2:
        return {"error": "Need at least 2 stocks in the portfolio to run optimization."}

    tickers = [item.ticker for item in items]
    
    # Download 1 year of historical data
    data = yf.download(tickers, period="1y", interval="1d")["Close"]
    
    # Handle single ticker edge cases (though we checked len >= 2)
    if isinstance(data, pd.Series):
        data = pd.DataFrame(data)
        
    data = data.dropna(axis=1, how="all").ffill().bfill()
    valid_tickers = list(data.columns)
    
    if len(valid_tickers) < 2:
        return {"error": "Insufficient historical data for your portfolio assets."}
        
    # Calculate daily log returns
    returns = np.log(data / data.shift(1)).dropna()
    
    # Annualized expected returns and covariance matrix
    mean_returns = returns.mean() * 252
    cov_matrix = returns.cov() * 252
    
    # Current Portfolio Weightings
    current_prices = data.iloc[-1].to_dict()
    portfolio_value = sum([item.quantity * current_prices.get(item.ticker, item.buy_price) for item in items if item.ticker in valid_tickers])
    
    current_weights = []
    for t in valid_tickers:
        item = next((i for i in items if i.ticker == t), None)
        if item:
            weight = (item.quantity * current_prices.get(t, item.buy_price)) / portfolio_value
        else:
            weight = 0
        current_weights.append(weight)
        
    current_weights = np.array(current_weights)
    current_return = np.sum(mean_returns * current_weights)
    current_volatility = np.sqrt(np.dot(current_weights.T, np.dot(cov_matrix, current_weights)))
    
    # Monte Carlo Simulation
    num_portfolios = 2000
    results = np.zeros((3, num_portfolios))
    weights_record = []
    
    for i in range(num_portfolios):
        weights = np.random.random(len(valid_tickers))
        weights /= np.sum(weights)
        weights_record.append(weights)
        
        portfolio_return = np.sum(mean_returns * weights)
        portfolio_std_dev = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        
        results[0,i] = portfolio_return
        results[1,i] = portfolio_std_dev
        results[2,i] = portfolio_return / portfolio_std_dev  # Sharpe ratio (assuming risk_free_rate = 0)
        
    # Find Optimal Portfolio (Max Sharpe Ratio)
    max_sharpe_idx = np.argmax(results[2])
    optimal_weights = weights_record[max_sharpe_idx]
    optimal_return = results[0, max_sharpe_idx]
    optimal_volatility = results[1, max_sharpe_idx]
    
    # Prepare scatter data for frontend
    scatter_data = []
    # Thin out the points to prevent frontend lag (send ~200 points)
    step = max(1, num_portfolios // 200)
    for i in range(0, num_portfolios, step):
        scatter_data.append({
            "volatility": float(results[1, i] * 100),
            "return": float(results[0, i] * 100),
            "sharpe": float(results[2, i])
        })
        
    # Rebalancing Actions
    actions = []
    for idx, ticker in enumerate(valid_tickers):
        target_weight = optimal_weights[idx]
        current_weight = current_weights[idx]
        
        target_value = portfolio_value * target_weight
        current_item = next((i for i in items if i.ticker == ticker), None)
        
        current_qty = current_item.quantity if current_item else 0
        target_qty = target_value / current_prices[ticker]
        
        diff_qty = target_qty - current_qty
        
        if abs(diff_qty) > 0.1: # Only suggest meaningful actions
            actions.append({
                "ticker": ticker,
                "action": "BUY" if diff_qty > 0 else "SELL",
                "shares": round(abs(diff_qty), 2),
                "current_weight": float(current_weight * 100),
                "target_weight": float(target_weight * 100)
            })
            
    return {
        "current_portfolio": {
            "return": float(current_return * 100),
            "volatility": float(current_volatility * 100),
            "sharpe": float(current_return / current_volatility) if current_volatility > 0 else 0
        },
        "optimal_portfolio": {
            "return": float(optimal_return * 100),
            "volatility": float(optimal_volatility * 100),
            "sharpe": float(results[2, max_sharpe_idx])
        },
        "scatter_data": scatter_data,
        "actions": actions
    }
