import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  FileText, 
  ShieldCheck, 
  History, 
  TrendingUp, 
  Download, 
  Search,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  DollarSign,
  Fuel,
  X,
  BarChart3,
  MapPin,
  Tag
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { PetrolRecord, Zone } from './types';
import { RecordCard } from './components/RecordCard';
import { UploadModal } from './components/UploadModal';
import { RecordForm } from './components/RecordForm';
import { verifyUsage } from './services/gemini';
import { FUEL_PRICES as INITIAL_FUEL_PRICES } from './constants';
import { fetchLatestFuelPrices, RegionalFuelPrices } from './services/fuelPriceService';

import { downloadReport } from './services/reportService';

export default function App() {
  const [records, setRecords] = useState<PetrolRecord[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<PetrolRecord> | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'records' | 'analytics' | 'settings' | 'reports'>('dashboard');
  const [fuelPrices, setFuelPrices] = useState<RegionalFuelPrices>(INITIAL_FUEL_PRICES);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [priceUpdateError, setPriceUpdateError] = useState<string | null>(null);
  const [zone, setZone] = useState<Zone>(() => {
    const saved = localStorage.getItem('fuel_zone');
    return (saved as Zone) || 'West Malaysia';
  });

  useEffect(() => {
    localStorage.setItem('fuel_zone', zone);
  }, [zone]);

  useEffect(() => {
    const updatePrices = async () => {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setPriceUpdateError("Gemini API Key is missing. Please configure it in your deployment environment (VITE_GEMINI_API_KEY).");
        return;
      }
      setIsUpdatingPrices(true);
      setPriceUpdateError(null);
      try {
        const latest = await fetchLatestFuelPrices();
        if (latest) {
          setFuelPrices(latest);
        } else {
          setPriceUpdateError("Failed to fetch latest prices. Using default rates.");
        }
      } catch (err) {
        console.error("Price update error:", err);
        setPriceUpdateError("API Error: Please check your Gemini API key configuration.");
      } finally {
        setIsUpdatingPrices(false);
      }
    };
    updatePrices();
  }, []);

  const handleAddRecord = async (newRecord: PetrolRecord) => {
    setIsFormOpen(false);
    setExtractedData(null);
    
    // Add to list as pending
    const recordWithPending = { ...newRecord, status: 'pending' as const };
    setRecords(prev => [recordWithPending, ...prev]);

    // Start AI verification
    setIsVerifying(true);
    try {
      const result = await verifyUsage(recordWithPending, records);
      setRecords(prev => prev.map(r => 
        r.id === recordWithPending.id 
          ? { ...r, status: result.status, verificationNotes: result.notes } 
          : r
      ));
    } catch (err) {
      console.error("Verification failed", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExtractionSuccess = (data: Partial<PetrolRecord>) => {
    setIsUploadModalOpen(false);
    setExtractedData(data);
    setIsFormOpen(true);
  };

  const stats = {
    totalSpent: records.reduce((acc, r) => acc + r.amount, 0),
    totalLiters: records.reduce((acc, r) => acc + r.liters, 0),
    verifiedCount: records.filter(r => r.status === 'verified').length,
    flaggedCount: records.filter(r => r.status === 'flagged').length,
  };

  const currentMonthRON95Usage = records
    .filter(r => {
      const recordDate = new Date(r.date);
      const now = new Date();
      return r.type === 'RON95' && 
             recordDate.getMonth() === now.getMonth() && 
             recordDate.getFullYear() === now.getFullYear();
    })
    .reduce((acc, r) => acc + r.liters, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 p-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-bold tracking-tight">FuelVerify AI</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
          TC
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col p-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">FuelVerify AI</span>
          </div>

          <nav className="flex-1 space-y-1">
            <NavItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={currentView === 'dashboard'} 
              onClick={() => setCurrentView('dashboard')}
            />
            <NavItem 
              icon={History} 
              label="Records" 
              active={currentView === 'records'} 
              onClick={() => setCurrentView('records')}
            />
            <NavItem 
              icon={TrendingUp} 
              label="Analytics" 
              active={currentView === 'analytics'} 
              onClick={() => setCurrentView('analytics')}
            />
            <NavItem 
              icon={FileText} 
              label="Reports" 
              active={currentView === 'reports'}
              onClick={() => setCurrentView('reports')}
            />
            <NavItem 
              icon={Settings} 
              label="Settings" 
              active={currentView === 'settings'}
              onClick={() => setCurrentView('settings')}
            />
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                TC
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold">Terry Chow</p>
                <p className="truncate text-xs text-slate-500">terry@fuelverify.ai</p>
              </div>
              <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-slate-200 bg-white/80 p-2 backdrop-blur-md lg:hidden">
        <MobileNavItem 
          icon={LayoutDashboard} 
          active={currentView === 'dashboard'} 
          onClick={() => setCurrentView('dashboard')}
          label="Home"
        />
        <MobileNavItem 
          icon={History} 
          active={currentView === 'records'} 
          onClick={() => setCurrentView('records')}
          label="Records"
        />
        <MobileNavItem 
          icon={TrendingUp} 
          active={currentView === 'analytics'} 
          onClick={() => setCurrentView('analytics')}
          label="Stats"
        />
        <MobileNavItem 
          icon={FileText} 
          active={currentView === 'reports'} 
          onClick={() => setCurrentView('reports')}
          label="Reports"
        />
        <MobileNavItem 
          icon={Settings} 
          active={currentView === 'settings'} 
          onClick={() => setCurrentView('settings')}
          label="Settings"
        />
      </nav>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 lg:text-3xl">
              {currentView === 'dashboard' && 'Petrol Usage Dashboard'}
              {currentView === 'records' && 'Fuel Records'}
              {currentView === 'analytics' && 'Usage Analytics'}
              {currentView === 'reports' && 'Verification Reports'}
              {currentView === 'settings' && 'Settings'}
            </h1>
            <p className="text-slate-500">Pre-verification layer for government submissions</p>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Add New Record
          </button>
        </header>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Spent" value={`RM ${stats.totalSpent.toFixed(2)}`} icon={DollarSign} color="indigo" />
          <StatCard label="Total Liters" value={`${stats.totalLiters.toFixed(2)} L`} icon={Fuel} color="emerald" />
          <StatCard label="Verified" value={stats.verifiedCount} icon={CheckCircle2} color="teal" />
          <StatCard label="Flagged" value={stats.flaggedCount} icon={AlertTriangle} color="rose" />
        </div>

        {/* Dynamic View Content */}
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                      <Tag className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">RON95 Subsidy Tracker</h3>
                      <p className="text-sm text-slate-500">Monthly limit: {fuelPrices[zone].RON95_SubsidyLimit} L</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-600">Usage this month</span>
                      <span className="font-bold text-slate-900">{currentMonthRON95Usage.toFixed(2)} / {fuelPrices[zone].RON95_SubsidyLimit} L</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          (currentMonthRON95Usage / fuelPrices[zone].RON95_SubsidyLimit) > 0.9 ? 'bg-rose-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, (currentMonthRON95Usage / fuelPrices[zone].RON95_SubsidyLimit) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      {currentMonthRON95Usage >= fuelPrices[zone].RON95_SubsidyLimit 
                        ? 'Subsidy limit reached. Market price applies to additional RON95.' 
                        : `${(fuelPrices[zone].RON95_SubsidyLimit - currentMonthRON95Usage).toFixed(2)} L remaining at subsidized price.`}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Verification Status</h3>
                      <p className="text-sm text-slate-500">AI-driven audit summary</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                      <span className="text-sm font-medium">Auto-Verified</span>
                      <span className="font-bold text-emerald-600">{stats.verifiedCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                      <span className="text-sm font-medium">Flagged for Review</span>
                      <span className="font-bold text-rose-600">{stats.flaggedCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                      <span className="text-sm font-medium">Pending Processing</span>
                      <span className="font-bold text-slate-400">{records.filter(r => r.status === 'pending').length}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Quick Insights</h3>
                      <p className="text-sm text-slate-500">Usage trends at a glance</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <BarChart3 className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Go to Analytics for detailed charts</p>
                    <button 
                      onClick={() => setCurrentView('analytics')}
                      className="mt-4 text-sm font-bold text-indigo-600 hover:underline"
                    >
                      View Analytics
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-indigo-600 p-8 text-white shadow-xl shadow-indigo-100">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Current Location: {zone}</h3>
                    <p className="text-indigo-100 text-sm mt-1">Fuel prices are calculated based on your selected zone.</p>
                  </div>
                  <button 
                    onClick={() => setCurrentView('settings')}
                    className="rounded-xl bg-white/20 px-6 py-3 text-sm font-bold backdrop-blur-md transition-all hover:bg-white/30"
                  >
                    Change Zone
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl space-y-6"
            >
              <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900">Regional Settings</h3>
                  <p className="text-slate-500 text-sm">Select your location to ensure accurate fuel price calculations.</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Source: <a href="https://www.google.com/search?q=fuel+price+malaysia" target="_blank" rel="noopener" className="text-indigo-500 hover:underline">Google Search (Latest Fuel Prices)</a>
                  </p>
                  {priceUpdateError && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <p>{priceUpdateError}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-700">Select Zone</label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {(['West Malaysia', 'East Malaysia'] as Zone[]).map((z) => (
                      <button
                        key={z}
                        onClick={() => setZone(z)}
                        className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-6 text-left transition-all ${
                          zone === z
                            ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-500/10'
                            : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className={`rounded-xl p-2 ${zone === z ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          <MapPin className="h-5 w-5" />
                        </div>
                        <span className={`font-bold ${zone === z ? 'text-indigo-900' : 'text-slate-700'}`}>{z}</span>
                        <div className="mt-2 space-y-1 w-full">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>RON95 (Subsidized)</span>
                            <span className="font-mono">RM {fuelPrices[z].RON95.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>RON95 (Market)</span>
                            <span className="font-mono">RM {fuelPrices[z].RON95_Market.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>RON97</span>
                            <span className="font-mono">RM {fuelPrices[z].RON97.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Diesel</span>
                            <span className="font-mono">RM {fuelPrices[z].Diesel.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-indigo-600 mt-2 pt-2 border-t border-slate-200">
                            <span>Monthly Subsidy</span>
                            <span>{fuelPrices[z].RON95_SubsidyLimit} L</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-amber-50 p-4 border border-amber-100 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Changing your zone will update the auto-calculation for all <strong>new</strong> records. Existing records will keep their original amounts.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'records' && (
            <motion.div
              key="records"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">All Records</h2>
                <div className="flex items-center gap-2">
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search stations..." 
                      className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => downloadReport(records, zone)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Export Report
                  </button>
                </div>
              </div>

              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 rounded-full bg-slate-50 p-6 text-slate-300">
                    <FileText className="h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No records yet</h3>
                  <p className="max-w-xs text-sm text-slate-500">
                    Start by adding your first petrol receipt to verify your usage.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {records.map((record) => (
                      <motion.div
                        key={record.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <RecordCard record={record} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
                <div className="mb-8">
                  <h3 className="text-lg font-bold">Fuel Consumption Trend</h3>
                  <p className="text-sm text-slate-500">Liters recorded over time</p>
                </div>
                <div className="h-[400px] w-full">
                  {records.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            padding: '12px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="liters" 
                          stroke="#4f46e5" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorLiters)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      No data available for charting
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold mb-4">Liters per Fuel Type</h3>
                  <div className="space-y-4">
                    {['RON95', 'RON97', 'Diesel'].map(type => {
                      const total = records.filter(r => r.type === type).reduce((acc, r) => acc + r.liters, 0);
                      const percentage = stats.totalLiters > 0 ? (total / stats.totalLiters) * 100 : 0;
                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{type}</span>
                            <span className="text-slate-500">{total.toFixed(2)} L ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Verification Explanations</h3>
                    <p className="text-slate-500 text-sm">Detailed AI analysis for each record submission.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => downloadReport(records, zone)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                    <button 
                      onClick={() => {
                        alert("To save to Google Drive, please download the PDF first and then upload it to your Drive. A direct integration is coming soon!");
                        downloadReport(records, zone);
                      }}
                      className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-all"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Save to Drive
                    </button>
                  </div>
                </div>

                {records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 rounded-full bg-slate-50 p-6 text-slate-300">
                      <FileText className="h-12 w-12" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No records to report</h3>
                    <p className="max-w-xs text-sm text-slate-500">
                      Add records to see AI verification explanations here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {records.map((record) => (
                      <div key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 transition-all hover:bg-slate-50">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                                record.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                record.status === 'flagged' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {record.status}
                              </span>
                              <span className="text-sm font-medium text-slate-500">{record.date}</span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900">{record.stationName}</h4>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> RM {record.amount.toFixed(2)}</span>
                              <span className="flex items-center gap-1"><Fuel className="h-4 w-4" /> {record.liters.toFixed(2)} L</span>
                              <span className="flex items-center gap-1"><Tag className="h-4 w-4" /> {record.type}</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 max-w-md rounded-xl bg-white p-4 shadow-sm border border-slate-100">
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <ShieldCheck className="h-3 w-3" />
                              AI Verification Explanation
                            </h5>
                            {record.verificationNotes && record.verificationNotes.length > 0 ? (
                              <ul className="space-y-2">
                                {record.verificationNotes.map((note, i) => (
                                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                    <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                                      record.status === 'verified' ? 'bg-emerald-400' :
                                      record.status === 'flagged' ? 'bg-rose-400' :
                                      'bg-amber-400'
                                    }`} />
                                    {note}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm italic text-slate-400">
                                {record.status === 'pending' ? 'Verification in progress...' : 'No detailed notes available.'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleExtractionSuccess}
      />

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full h-full sm:h-auto max-w-2xl overflow-y-auto sm:rounded-3xl bg-white shadow-2xl"
            >
              <div className="p-6 sm:p-8">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Verify Record Details</h2>
                    <p className="text-slate-500 text-sm">Review the extracted information before saving.</p>
                  </div>
                  <button onClick={() => setIsFormOpen(false)} className="rounded-full p-2 hover:bg-slate-100 text-slate-400">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <RecordForm 
                  initialData={extractedData || {}} 
                  onSave={handleAddRecord}
                  onCancel={() => setIsFormOpen(false)}
                  zone={zone}
                  fuelPrices={fuelPrices}
                  currentMonthUsage={currentMonthRON95Usage}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button */}
      <button 
        onClick={() => setIsUploadModalOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-300 transition-all hover:bg-indigo-700 active:scale-90 lg:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Verification Overlay */}
      <AnimatePresence>
        {isVerifying && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-4 rounded-2xl bg-slate-900 p-4 text-white shadow-2xl"
          >
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            <div className="text-sm">
              <p className="font-bold">AI Verification in progress</p>
              <p className="text-slate-400 text-xs">Applying government policy rules...</p>
            </div>
          </motion.div>
        )}

        {isUpdatingPrices && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 right-8 z-50 flex items-center gap-4 rounded-2xl bg-indigo-900 p-4 text-white shadow-2xl"
          >
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            <div className="text-sm">
              <p className="font-bold">Updating Fuel Prices</p>
              <p className="text-slate-400 text-xs">Fetching latest market rates via Gemini...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active?: boolean,
  onClick?: () => void
}) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
        active 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        {label}
      </div>
      {active && <ChevronRight className="h-4 w-4" />}
    </button>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-2xl p-3 ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}

function MobileNavItem({ 
  icon: Icon, 
  active = false, 
  onClick,
  label
}: { 
  icon: any, 
  active?: boolean,
  onClick: () => void,
  label: string
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 transition-all ${
        active ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      <Icon className={`h-6 w-6 ${active ? 'scale-110' : ''}`} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="h-1 w-1 rounded-full bg-indigo-600"
        />
      )}
    </button>
  );
}
