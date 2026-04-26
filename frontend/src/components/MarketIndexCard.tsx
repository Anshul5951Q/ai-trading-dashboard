import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import Chart from 'react-apexcharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketIndexCardProps {
  ticker: string;
  name: string;
}

export default function MarketIndexCard({ ticker, name }: MarketIndexCardProps) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchIndex = async () => {
      try {
        const response = await apiClient.get(`/analysis/index/${encodeURIComponent(ticker)}`);
        setData(response.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchIndex();
  }, [ticker]);

  if (!data) {
    return (
      <div className="bg-card p-6 rounded-xl border border-border shadow-lg h-40 animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading {name}...</span>
      </div>
    );
  }

  const isPositive = data.change >= 0;

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-lg flex flex-col justify-between h-40 hover:border-primary/30 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-400 font-medium">{name}</p>
          <h3 className="text-2xl font-bold mt-1">₹{data.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded ${isPositive ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {isPositive ? '+' : ''}{data.change_percent.toFixed(2)}%
        </div>
      </div>
      
      <div className="h-16 w-full -mx-2 mt-2">
        <Chart 
          options={{
            chart: { type: 'area', toolbar: { show: false }, background: 'transparent', sparkline: { enabled: true } },
            stroke: { curve: 'smooth', width: 2 },
            fill: {
              type: 'gradient',
              gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] }
            },
            colors: [isPositive ? '#10b981' : '#ef4444'],
            tooltip: { 
              theme: 'dark',
              fixed: { enabled: false }, 
              x: { show: false }, 
              y: { 
                formatter: (val) => `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                title: { formatter: () => '' } 
              }, 
              marker: { show: false } 
            }
          }}
          series={[{
            data: data.historical_data.map((d: any) => d.close)
          }]}
          type="area"
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
}
