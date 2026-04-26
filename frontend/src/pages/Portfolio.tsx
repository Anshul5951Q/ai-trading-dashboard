import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import StockCard from '../components/StockCard';

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (ticker.length >= 2) {
        searchTicker(ticker);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [ticker]);

  const searchTicker = async (q: string) => {
    try {
      const response = await apiClient.get(`/portfolio/search?q=${q}`);
      const exactMatch = response.data.find((item: any) => item.symbol === q.toUpperCase());
      if (!exactMatch) {
        setSearchResults(response.data);
        setShowDropdown(response.data.length > 0);
      } else {
        setShowDropdown(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await apiClient.get('/portfolio/');
      setPortfolio(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !buyPrice) return;
    try {
      await apiClient.post('/portfolio/', {
        ticker,
        quantity: parseFloat(quantity),
        buy_price: parseFloat(buyPrice)
      });
      setTicker('');
      setQuantity('');
      setBuyPrice('');
      fetchPortfolio();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.detail || "Failed to add stock.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/portfolio/${id}`);
      fetchPortfolio();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/20 rounded-lg">
          <Briefcase className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Portfolio Holdings</h1>
          <p className="text-gray-400">Manage your individual stock positions and analytics.</p>
        </div>
      </div>
      
      {/* Portfolio Table & Add Form */}
      <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg font-semibold">Your Holdings</h3>
          <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-3 w-full md:w-auto relative">
            <div className="relative flex-1 md:w-48">
              <input
                type="text" placeholder="Search Ticker" required
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full uppercase"
                value={ticker} onChange={e => {setTicker(e.target.value); setShowDropdown(true);}}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              />
              {showDropdown && (
                <div className="absolute z-50 mt-1 w-full sm:w-64 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <div 
                      key={idx} 
                      className="px-4 py-2 hover:bg-primary/20 cursor-pointer flex justify-between items-center text-sm border-b border-border last:border-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setTicker(result.symbol);
                        setShowDropdown(false);
                      }}
                    >
                      <div>
                        <p className="font-bold text-white">{result.symbol}</p>
                        <p className="text-xs text-gray-400 truncate w-32">{result.name}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-background rounded text-gray-400">{result.exchange}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              type="number" placeholder="Qty" step="any" required
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent flex-1 md:w-24"
              value={quantity} onChange={e => setQuantity(e.target.value)}
            />
            <input
              type="number" placeholder="Buy Price" step="any" required
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent flex-1 md:w-32"
              value={buyPrice} onChange={e => setBuyPrice(e.target.value)}
            />
            <button type="submit" className="bg-primary hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-card/50 text-gray-400 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Asset</th>
                <th className="px-6 py-4 font-medium text-right">Quantity</th>
                <th className="px-6 py-4 font-medium text-right">Avg. Cost</th>
                <th className="px-6 py-4 font-medium text-right">Current Price</th>
                <th className="px-6 py-4 font-medium text-right">Total Value</th>
                <th className="px-6 py-4 font-medium text-right">P/L</th>
                <th className="px-6 py-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {portfolio.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{item.ticker}</td>
                  <td className="px-6 py-4 text-right text-gray-300">{item.quantity}</td>
                  <td className="px-6 py-4 text-right text-gray-300">₹{item.buy_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-medium">₹{item.current_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-medium">₹{item.current_value.toFixed(2)}</td>
                  <td className={`px-6 py-4 text-right font-medium ${item.profit_loss >= 0 ? 'text-accent' : 'text-danger'}`}>
                    {item.profit_loss >= 0 ? '+' : ''}₹{item.profit_loss.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleDelete(item.id)} className="text-gray-500 hover:text-danger transition-colors p-2 rounded-full hover:bg-danger/10 inline-flex">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {portfolio.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Your portfolio is empty. Add a stock to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Cards Grid */}
      {portfolio.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-border/50">
          {portfolio.map((item) => (
            <StockCard 
              key={item.id}
              ticker={item.ticker}
              quantity={item.quantity}
              buyPrice={item.buy_price}
              currentPrice={item.current_price}
              profitLoss={item.profit_loss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
