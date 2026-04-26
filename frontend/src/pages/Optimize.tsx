import React, { useState, useEffect } from 'react';
import { Target, Activity, Zap, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { apiClient } from '../api/client';

export default function Optimize() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptimization = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/optimize/');
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setData(response.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to run optimization simulation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptimization();
  }, []);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-primary animate-pulse gap-4">
        <Target className="h-16 w-16" />
        <h2 className="text-xl font-bold">Running Monte Carlo Simulations...</h2>
        <p className="text-gray-400">Calculating Efficient Frontier via Modern Portfolio Theory.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-16 w-16 text-danger" />
        <h2 className="text-2xl font-bold text-white">Cannot Optimize Portfolio</h2>
        <p className="text-gray-400 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-lg">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Optimization Engine</h1>
            <p className="text-gray-400">Modern Portfolio Theory applied to your holdings.</p>
          </div>
        </div>
        <button 
          onClick={fetchOptimization}
          className="p-2 text-gray-400 hover:text-primary transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-5 w-5" /> Rerun Simulation
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Efficient Frontier Chart */}
          <div className="xl:col-span-2 bg-card border border-border rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> The Efficient Frontier
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Visualizing {data.scatter_data.length * 10} random portfolios. Finding the maximum Sharpe Ratio.
            </p>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    type="number" 
                    dataKey="volatility" 
                    name="Risk (Volatility)" 
                    unit="%" 
                    stroke="#888" 
                    domain={['auto', 'auto']}
                    label={{ value: 'Risk (Annualized Volatility %)', position: 'insideBottom', offset: -10, fill: '#888' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="return" 
                    name="Expected Return" 
                    unit="%" 
                    stroke="#888" 
                    domain={['auto', 'auto']}
                    label={{ value: 'Expected Return (Annualized %)', angle: -90, position: 'insideLeft', fill: '#888' }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#1a1f2c', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: any, name: any) => {
                      if (name === 'sharpe') return [value.toFixed(2), 'Sharpe Ratio'];
                      return [value.toFixed(2) + '%', name === 'return' ? 'Return' : 'Risk'];
                    }}
                  />
                  
                  {/* The random portfolios */}
                  <Scatter name="Portfolios" data={data.scatter_data} fill="#8884d8">
                    {data.scatter_data.map((entry: any, index: number) => {
                      // Color mapping based on Sharpe ratio
                      const maxSharpe = data.optimal_portfolio.sharpe;
                      const intensity = Math.max(0.1, entry.sharpe / maxSharpe);
                      return <Cell key={`cell-${index}`} fill={`rgba(59, 130, 246, ${intensity})`} />;
                    })}
                  </Scatter>
                  
                  {/* Current Portfolio Point */}
                  <Scatter 
                    name="Current" 
                    data={[data.current_portfolio]} 
                    fill="#ef4444" 
                    shape="star"
                    line={false}
                  />
                  
                  {/* Optimal Portfolio Point */}
                  <Scatter 
                    name="Optimal" 
                    data={[data.optimal_portfolio]} 
                    fill="#10b981" 
                    shape="star"
                    line={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500/50"></div>
                <span className="text-sm text-gray-400">Simulated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 text-danger">★</div>
                <span className="text-sm text-gray-400">Your Current Portfolio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 text-accent">★</div>
                <span className="text-sm text-gray-400">Max Sharpe (Optimal)</span>
              </div>
            </div>
          </div>

          {/* Sidebar Metrics and Actions */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" /> Portfolio Comparison
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 flex justify-between">
                    <span>Expected Return</span>
                    <span className="text-white font-bold">{data.current_portfolio.return.toFixed(2)}% <ArrowRight className="inline h-4 w-4 mx-1" /> <span className="text-accent">{data.optimal_portfolio.return.toFixed(2)}%</span></span>
                  </p>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-gray-400 flex justify-between">
                    <span>Risk (Volatility)</span>
                    <span className="text-white font-bold">{data.current_portfolio.volatility.toFixed(2)}% <ArrowRight className="inline h-4 w-4 mx-1" /> <span className="text-blue-400">{data.optimal_portfolio.volatility.toFixed(2)}%</span></span>
                  </p>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-gray-400 flex justify-between">
                    <span>Sharpe Ratio</span>
                    <span className="text-white font-bold">{data.current_portfolio.sharpe.toFixed(2)} <ArrowRight className="inline h-4 w-4 mx-1" /> <span className="text-accent">{data.optimal_portfolio.sharpe.toFixed(2)}</span></span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Required Rebalancing</h3>
              <p className="text-sm text-gray-400 mb-4">AI suggests the following trades to reach the optimal state:</p>
              
              {data.actions.length === 0 ? (
                <div className="text-center p-4 bg-background rounded-lg border border-border">
                  <p className="text-accent font-bold">Your portfolio is fully optimized!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.actions.map((action: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${action.action === 'BUY' ? 'bg-accent/20 text-accent' : 'bg-danger/20 text-danger'}`}>
                            {action.action}
                          </span>
                          <span className="font-bold text-white">{action.ticker}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Weight: {action.current_weight.toFixed(1)}% → {action.target_weight.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">{action.shares}</span>
                        <p className="text-xs text-gray-400">shares</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
