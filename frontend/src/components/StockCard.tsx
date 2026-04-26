import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import Chart from 'react-apexcharts';
import { TrendingUp, TrendingDown, Bot } from 'lucide-react';

interface StockCardProps {
  ticker: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  profitLoss: number;
}

export default function StockCard({ ticker, quantity, buyPrice, currentPrice, profitLoss }: StockCardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await apiClient.get(`/analysis/${ticker}`);
        setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [ticker]);

  const isProfitable = profitLoss >= 0;

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col h-full hover:shadow-primary/10 transition-shadow">
      <div className="p-5 border-b border-border flex justify-between items-start bg-card/50">
        <div>
          <h3 className="text-xl font-bold text-white">{ticker}</h3>
          <p className="text-sm text-gray-400">{quantity} shares @ ₹{buyPrice.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-white">₹{currentPrice.toFixed(2)}</p>
          <p className={`text-sm font-medium flex items-center justify-end gap-1 ${isProfitable ? 'text-accent' : 'text-danger'}`}>
            {isProfitable ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isProfitable ? '+' : ''}₹{profitLoss.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-6">
        {loading ? (
          <div className="h-32 flex items-center justify-center text-gray-500 animate-pulse">Loading AI insights...</div>
        ) : !data ? (
          <div className="h-32 flex items-center justify-center text-danger text-sm">Analysis unavailable</div>
        ) : (
          <>
            {/* Mini Chart */}
            <div className="h-32 w-full -mx-4 mt-2">
              <Chart 
                options={{
                  chart: { type: 'candlestick', toolbar: { show: false }, background: 'transparent', animations: { enabled: false }, sparkline: { enabled: true } },
                  grid: { show: false, padding: { top: 0, bottom: 0, left: 0, right: 0 } },
                  xaxis: { type: 'category', labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
                  yaxis: { show: false, tooltip: { enabled: false } },
                  plotOptions: { candlestick: { colors: { upward: '#10b981', downward: '#ef4444' }, wick: { useFillColor: true } } },
                  tooltip: { theme: 'dark', y: { formatter: (val) => `₹${val.toFixed(2)}` } }
                }}
                series={[{
                  data: data.historical_data.map((d: any) => ({
                    x: new Date(d.date).toLocaleString(),
                    y: [d.open, d.high, d.low, d.close]
                  }))
                }]}
                type="candlestick"
                height="100%"
                width="100%"
              />
            </div>

            {/* Insights Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <p className="text-xs text-gray-400 mb-1">RSI (14)</p>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-lg">{data.indicators.rsi?.toFixed(1) || 'N/A'}</span>
                  {data.indicators.rsi > 70 && <span className="text-[10px] w-fit px-2 py-0.5 rounded bg-danger/20 text-danger border border-danger/20">Overbought</span>}
                  {data.indicators.rsi < 30 && <span className="text-[10px] w-fit px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/20">Oversold</span>}
                  {data.indicators.rsi >= 30 && data.indicators.rsi <= 70 && <span className="text-[10px] w-fit px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">Neutral</span>}
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <p className="text-xs text-gray-400 mb-1">MACD Trend</p>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-lg">{data.indicators.macd?.toFixed(2) || 'N/A'}</span>
                  {data.indicators.macd_hist > 0 ? (
                    <span className="text-[10px] w-fit px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/20">Bullish</span>
                  ) : (
                    <span className="text-[10px] w-fit px-2 py-0.5 rounded bg-danger/20 text-danger border border-danger/20">Bearish</span>
                  )}
                </div>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
