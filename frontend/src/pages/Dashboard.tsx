import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { LogOut, Plus, Trash2, TrendingUp, DollarSign, Activity, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MarketIndexCard from '../components/MarketIndexCard';
import AIAdvisor from '../components/AIAdvisor';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await apiClient.get('/portfolio/');
      
      const historyResponse = await apiClient.get('/portfolio/history');
      setPortfolioHistory(historyResponse.data);
      setPortfolio(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = portfolio.reduce((acc, item) => acc + item.current_value, 0);
  const totalInvestment = portfolio.reduce((acc, item) => acc + (item.buy_price * item.quantity), 0);
  const totalPL = totalValue - totalInvestment;
  const plPercentage = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;
  
  const weightedBeta = totalValue > 0 
    ? portfolio.reduce((acc, item) => acc + ((item.beta || 1.0) * item.current_value), 0) / totalValue 
    : 1.0;

  let riskLabel = "Moderate";
  let riskColor = "text-yellow-500 bg-yellow-500/10";
  if (weightedBeta > 1.2) {
      riskLabel = "High Risk";
      riskColor = "text-danger bg-danger/10";
  } else if (weightedBeta < 0.8) {
      riskLabel = "Low Risk";
      riskColor = "text-accent bg-accent/10";
  }

  const sectorMap = portfolio.reduce((acc, item) => {
    const sector = item.sector || 'Unknown';
    if (!acc[sector]) acc[sector] = 0;
    acc[sector] += item.current_value;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Calculate if the 30-day trend is positive or negative for the gradient color
  const isHistoryPositive = portfolioHistory.length >= 2 
    ? portfolioHistory[portfolioHistory.length - 1].value >= portfolioHistory[0].value 
    : totalPL >= 0;

  const chartColor = isHistoryPositive ? '#10b981' : '#ef4444';

  return (
    <div className="space-y-8 fade-in">
        {/* Market Indices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MarketIndexCard ticker="^NSEI" name="NIFTY 50" />
          <MarketIndexCard ticker="^BSESN" name="SENSEX" />
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Portfolio Value</p>
                <h3 className="text-3xl font-bold">₹{totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${totalPL >= 0 ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'}`}>
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Profit / Loss</p>
                <h3 className={`text-3xl font-bold ${totalPL >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {totalPL >= 0 ? '+' : ''}₹{totalPL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
             <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${plPercentage >= 0 ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'}`}>
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Return on Investment</p>
                <h3 className={`text-3xl font-bold ${plPercentage >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {plPercentage >= 0 ? '+' : ''}{plPercentage.toFixed(2)}%
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
             <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${riskColor}`}>
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Portfolio Risk (Beta: {weightedBeta.toFixed(2)})</p>
                <h3 className={`text-3xl font-bold ${riskColor.split(' ')[0]}`}>
                  {riskLabel}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* AI Advisor Section */}
        <AIAdvisor />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border shadow-lg">
            <h3 className="text-lg font-semibold mb-6">Portfolio Growth (Last 30 Days)</h3>
            <div className="h-[300px] w-full">
              {portfolioHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioHistory}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={20}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                      domain={['auto', 'auto']}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                      itemStyle={{ color: chartColor, fontWeight: 'bold' }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Value']}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={chartColor} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                  Not enough historical data. Add valid stocks to see growth.
                </div>
              )}
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
             <h3 className="text-lg font-semibold mb-6">Asset Allocation</h3>
             {portfolio.length > 0 ? (
               <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(value: any) => `₹${value.toFixed(2)}`}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
               </div>
             ) : (
               <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No assets to allocate.
               </div>
             )}
          </div>
        </div>
      </div>
  );
}
