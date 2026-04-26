import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Minus, Bot, Newspaper } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Insights() {
  const [insights, setInsights] = useState<any[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await apiClient.get('/advisor/');
        setSummary(response.data.summary);
        setInsights(response.data.recommendations || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  const overallSentiment = insights.reduce((acc, curr) => acc + (curr.sentiment_score || 0.5), 0) / (insights.length || 1);

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/20 rounded-lg">
          <Lightbulb className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Market Insights</h1>
          <p className="text-gray-400">Deep AI analysis of market news and sentiment for your portfolio.</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-primary animate-pulse gap-4">
          <Bot className="h-12 w-12" />
          <p>Gemini AI is analyzing millions of news points...</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-border rounded-xl text-center text-gray-400">
          Add stocks to your portfolio to generate AI insights.
        </div>
      ) : (
        <>
          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-primary/10 to-blue-500/5 border border-primary/20 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-primary" /> Executive AI Summary
            </h3>
            <p className="text-gray-300 leading-relaxed text-lg">{summary}</p>
            
            <div className="mt-6 flex items-center gap-4 border-t border-primary/10 pt-4">
              <p className="text-sm text-gray-400">Overall Portfolio Sentiment:</p>
              <div className="w-64 h-3 bg-gray-800 rounded-full overflow-hidden relative">
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                    overallSentiment > 0.6 ? 'bg-accent' : overallSentiment < 0.4 ? 'bg-danger' : 'bg-blue-400'
                  }`}
                  style={{ width: `${overallSentiment * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold">{(overallSentiment * 100).toFixed(0)} / 100</span>
            </div>
          </div>

          {/* Deep Dives */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-card border border-border rounded-xl shadow-lg p-6 hover:border-primary/30 transition-colors flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{insight.ticker}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                        insight.action === 'BUY' ? 'bg-accent/20 text-accent border border-accent/20' :
                        insight.action === 'SELL' ? 'bg-danger/20 text-danger border border-danger/20' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                      }`}>
                        {insight.action}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Newspaper className="h-3 w-3" /> Sentiment: {insight.sentiment_label || 'Neutral'}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${
                    (insight.sentiment_score || 0.5) > 0.6 ? 'bg-accent/10 text-accent' : 
                    (insight.sentiment_score || 0.5) < 0.4 ? 'bg-danger/10 text-danger' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {(insight.sentiment_score || 0.5) > 0.6 ? <TrendingUp className="h-6 w-6" /> : 
                     (insight.sentiment_score || 0.5) < 0.4 ? <TrendingDown className="h-6 w-6" /> : <Minus className="h-6 w-6" />}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                    <p className="text-sm text-gray-300 leading-relaxed italic">
                      "{insight.reasoning}"
                    </p>
                  </div>
                  
                  {insight.top_reasons && insight.top_reasons.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Key Drivers</h4>
                      <ul className="space-y-2">
                        {insight.top_reasons.map((reason: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
