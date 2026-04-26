import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { Bot, RefreshCw, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Recommendation {
  ticker: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
}

interface AdvisorData {
  summary: string;
  recommendations: Recommendation[];
}

export default function AIAdvisor() {
  const [data, setData] = useState<AdvisorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzePortfolio = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/advisor/');
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate AI advice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="h-5 w-5 text-accent" />;
      case 'SELL': return <TrendingDown className="h-5 w-5 text-danger" />;
      default: return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-accent bg-accent/10 border-accent/20';
      case 'SELL': return 'text-danger bg-danger/10 border-danger/20';
      default: return 'text-gray-300 bg-gray-800 border-gray-700';
    }
  };

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-lg mb-8 relative overflow-hidden">
      {/* Decorative gradient background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-lg border border-primary/20">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Portfolio Advisor</h2>
            <p className="text-sm text-gray-400">Real-time heuristic analysis based on market news and technicals.</p>
          </div>
        </div>
        
        <button 
          onClick={analyzePortfolio} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Analyzing...</>
          ) : (
            <><Bot className="h-4 w-4" /> Generate Advice</>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-3 text-danger mb-4">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
          <div className="p-5 bg-background/50 border border-border rounded-xl">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-primary" /> Portfolio Summary
            </h3>
            <p className="text-gray-300 leading-relaxed">{data.summary}</p>
          </div>

          {data.recommendations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.recommendations.map((rec, idx) => (
                <div key={idx} className="p-5 bg-background border border-border rounded-xl hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-lg">{rec.ticker}</h4>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border flex items-center gap-1 ${getActionColor(rec.action)}`}>
                      {getActionIcon(rec.action)} {rec.action}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{rec.reasoning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {!data && !loading && !error && (
        <div className="py-8 text-center border-2 border-dashed border-border rounded-xl">
          <Bot className="h-10 w-10 text-gray-500 mx-auto mb-3 opacity-50" />
          <p className="text-gray-500">Click the button above to generate a personalized AI action plan.</p>
        </div>
      )}
    </div>
  );
}
