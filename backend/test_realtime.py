import yfinance as yf

ticker = "RELIANCE.NS"
stock = yf.Ticker(ticker)

# Approach 1
data = stock.history(period="1d")
print("History 1d Close:", float(data['Close'].iloc[-1]) if not data.empty else None)

# Approach 2
print("Fast Info Last Price:", stock.fast_info.last_price)

# Approach 3
try:
    print("Info currentPrice:", stock.info.get("currentPrice"))
except Exception as e:
    print("Info error:", e)
