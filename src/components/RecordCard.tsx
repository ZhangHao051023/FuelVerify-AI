import React from 'react';
import { PetrolRecord } from '../types';
import { CheckCircle, AlertCircle, Clock, MapPin, Fuel, Gauge, DollarSign, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RecordCardProps {
  record: PetrolRecord;
  onClick?: () => void;
  onDelete?: () => void;
}

export const RecordCard: React.FC<RecordCardProps> = ({ record, onClick, onDelete }) => {
  const statusConfig = {
    verified: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    flagged: { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
    pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  };

  const { icon: StatusIcon, color, bg, border } = statusConfig[record.status];

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-md",
        bg, border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 cursor-pointer flex-1" onClick={onClick}>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <StatusIcon className={cn("h-4 w-4", color)} />
            <span className="capitalize">{record.status}</span>
            <span className="text-slate-300">•</span>
            <span>{format(new Date(record.date), 'MMM dd, yyyy')}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{record.stationName}</h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="text-xl font-bold text-slate-900">RM {record.amount.toFixed(2)}</div>
            <div className="text-sm text-slate-500">{record.liters.toFixed(2)} L • {record.type}</div>
          </div>
          {onDelete && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-100/50 rounded-lg transition-colors"
              title="Delete record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200/50 pt-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Fuel className="h-4 w-4 text-slate-400" />
          <span>{(record.amount / record.liters).toFixed(3)} / L</span>
        </div>
      </div>
    </div>
  );
};
