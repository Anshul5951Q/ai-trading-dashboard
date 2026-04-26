import yfinance as yf

def get_current_price(ticker: str) -> float:
    try:
        stock = yf.Ticker(ticker.strip().upper())
        return float(stock.fast_info.last_price)
    except Exception:
        return 0.0

def get_stock_info(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        return stock.info
    except Exception:
        return {}
