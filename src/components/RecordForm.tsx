import React, { useState, useEffect } from 'react';
import { PetrolRecord, Zone, RegionalFuelPrices } from '../types';
import { X, Save, Calendar, MapPin, Gauge, Fuel, DollarSign, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface RecordFormProps {
  initialData?: Partial<PetrolRecord>;
  onSave: (data: PetrolRecord) => void;
  onCancel: () => void;
  zone: Zone;
  fuelPrices: RegionalFuelPrices;
  currentMonthUsage: number;
}

export const RecordForm: React.FC<RecordFormProps> = ({ initialData, onSave, onCancel, zone, fuelPrices, currentMonthUsage }) => {
  const [formData, setFormData] = useState<Partial<PetrolRecord>>(() => {
    const base = {
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      liters: 0,
      stationName: '',
      type: 'RON95' as const,
      ...initialData,
    };
    return {
      ...base,
      amount: isNaN(Number(base.amount)) ? 0 : Number(base.amount),
      liters: isNaN(Number(base.liters)) ? 0 : Number(base.liters),
    };
  });

  const calculateAmount = (liters: number, type: 'RON95' | 'RON97' | 'Diesel') => {
    const prices = fuelPrices[zone];
    if (type === 'RON95') {
      const limit = prices.RON95_SubsidyLimit;
      const remainingSubsidy = Math.max(0, limit - currentMonthUsage);
      
      if (liters <= remainingSubsidy) {
        return parseFloat((liters * prices.RON95).toFixed(2));
      } else {
        const subsidizedLiters = remainingSubsidy;
        const marketLiters = liters - remainingSubsidy;
        return parseFloat((subsidizedLiters * prices.RON95 + marketLiters * prices.RON95_Market).toFixed(2));
      }
    } else {
      const pricePerLiter = prices[type] || 0;
      return parseFloat((liters * pricePerLiter).toFixed(2));
    }
  };

  const handleLitersChange = (liters: number) => {
    const val = isNaN(liters) ? 0 : liters;
    const amount = calculateAmount(val, formData.type as any);
    setFormData({ ...formData, liters: val, amount });
  };

  const handleTypeChange = (type: 'RON95' | 'RON97' | 'Diesel') => {
    const currentLiters = formData.liters || 0;
    const amount = calculateAmount(currentLiters, type);
    setFormData({ ...formData, type, amount });
  };

  // Recalculate amount if zone, fuelPrices, or usage change
  useEffect(() => {
    const currentLiters = formData.liters || 0;
    const amount = calculateAmount(currentLiters, formData.type as any);
    setFormData(prev => ({ ...prev, amount }));
  }, [zone, fuelPrices, currentMonthUsage, formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      ...formData,
    } as PetrolRecord);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            Date
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            Station Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Petronas KLCC"
            value={formData.stationName}
            onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Tag className="h-4 w-4 text-slate-400" />
            Fuel Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value as any)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          >
            <option value="RON95">RON 95 (RM {fuelPrices[zone].RON95.toFixed(2)}/L)</option>
            <option value="RON97">RON 97 (RM {fuelPrices[zone].RON97.toFixed(2)}/L)</option>
            <option value="Diesel">Diesel (RM {fuelPrices[zone].Diesel.toFixed(2)}/L)</option>
          </select>
          {formData.type === 'RON95' && (
            <div className="mt-2 rounded-lg bg-indigo-50 p-3 text-xs text-indigo-700 border border-indigo-100">
              <div className="flex justify-between mb-1">
                <span>Monthly Subsidy Limit:</span>
                <span className="font-bold">{fuelPrices[zone].RON95_SubsidyLimit} L</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Used this month:</span>
                <span className="font-bold">{currentMonthUsage.toFixed(2)} L</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining subsidy:</span>
                <span className="font-bold">{Math.max(0, fuelPrices[zone].RON95_SubsidyLimit - currentMonthUsage).toFixed(2)} L</span>
              </div>
              {formData.liters! > Math.max(0, fuelPrices[zone].RON95_SubsidyLimit - currentMonthUsage) && (
                <p className="mt-2 text-amber-600 font-medium">
                  Note: { (formData.liters! - Math.max(0, fuelPrices[zone].RON95_SubsidyLimit - currentMonthUsage)).toFixed(2) } L will be charged at market price (RM {fuelPrices[zone].RON95_Market.toFixed(2)}/L)
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Fuel className="h-4 w-4 text-slate-400" />
            Liters
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.liters}
            onChange={(e) => handleLitersChange(parseFloat(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-slate-400" />
            Amount (RM) - Auto Calculated
          </label>
          <input
            type="number"
            step="0.01"
            required
            readOnly
            value={formData.amount}
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
        >
          <Save className="h-4 w-4" />
          Save Record
        </button>
      </div>
    </form>
  );
};
