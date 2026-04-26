import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Plus, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [ticker, setTicker] = useState('');
  const [condition, setCondition] = useState('ABOVE');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    try {
      const response = await apiClient.get('/alerts/');
      setAlerts(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll every 30 seconds for trigger updates
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !price) return;
    
    setSubmitting(true);
    try {
      await apiClient.post('/alerts/', {
        ticker,
        condition,
        price: parseFloat(price)
      });
      setTicker('');
      setPrice('');
      fetchAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await apiClient.delete(`/alerts/${id}`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/20 rounded-lg">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Smart Alerts</h1>
          <p className="text-gray-400">Set price targets and stop-losses to monitor your portfolio.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Alert Form */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 sticky top-24">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> New Alert
            </h3>
            
            <form onSubmit={handleAddAlert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Ticker Symbol</label>
                <input
                  type="text"
                  required
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. RELIANCE.NS"
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Condition</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition('ABOVE')}
                    className={`p-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      condition === 'ABOVE' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-background border border-border text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <ArrowUpCircle className="h-4 w-4" /> Above
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('BELOW')}
                    className={`p-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      condition === 'BELOW' ? 'bg-danger/20 text-danger border border-danger/30' : 'bg-background border border-border text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <ArrowDownCircle className="h-4 w-4" /> Below
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Target Price</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90 text-background font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-6"
              >
                {submitting ? 'Creating...' : 'Create Alert'}
              </button>
            </form>
          </div>
        </div>

        {/* Alerts List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-white mb-4">Your Active Alerts</h3>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-card/50 rounded-xl border border-border"></div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-border rounded-xl text-center text-gray-400 flex flex-col items-center">
              <Bell className="h-12 w-12 mb-3 text-border" />
              <p>You have no active alerts.</p>
              <p className="text-sm">Create one to get notified of price movements.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`bg-card border rounded-xl p-5 shadow-lg flex items-center justify-between transition-all ${
                  alert.is_triggered ? 'border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : 'border-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    alert.is_triggered ? 'bg-primary text-background animate-pulse' : 'bg-background text-gray-400'
                  }`}>
                    {alert.is_triggered ? <BellRing className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-white">{alert.ticker}</h4>
                      {alert.is_triggered && (
                        <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded font-bold uppercase">
                          Triggered
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 mt-1 flex items-center gap-1.5">
                      {alert.condition === 'ABOVE' ? (
                        <><ArrowUpCircle className="h-4 w-4 text-accent" /> Price rises above</>
                      ) : (
                        <><ArrowDownCircle className="h-4 w-4 text-danger" /> Price falls below</>
                      )}
                      <span className="font-bold text-white ml-1">₹{alert.price.toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-2 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                  title="Delete Alert"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
