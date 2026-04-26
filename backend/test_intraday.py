import yfinance as yf
import pandas_ta as ta

stock = yf.Ticker("RELIANCE.NS")
df = stock.history(period="5d", interval="15m")
print("Intraday rows:", len(df))
if not df.empty:
    df.ta.rsi(length=14, append=True)
    df.ta.macd(fast=12, slow=26, signal=9, append=True)
    print("Columns:", df.columns.tolist())
    print("Last RSI:", df['RSI_14'].iloc[-1])
