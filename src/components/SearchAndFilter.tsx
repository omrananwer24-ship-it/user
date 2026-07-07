import React from 'react';
import { Search, X, Layers, Clock, CheckCircle2, Camera } from 'lucide-react';
import { OrderStatusFilter } from '../types';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: OrderStatusFilter;
  onStatusFilterChange: (filter: OrderStatusFilter) => void;
  ordersCount: {
    all: number;
    pending: number;
    arrived: number;
  };
  onCameraClick?: () => void;
}

export default function SearchAndFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  ordersCount,
  onCameraClick,
}: SearchAndFilterProps) {
  return (
    <div
      id="search-filter-card"
      className="bg-slate-100 border border-slate-200/60 rounded-2xl p-4 md:p-5 mb-6 space-y-4"
    >
      {/* بۆکسی گەڕان */}
      <div className="space-y-1">
        <label htmlFor="search-input" className="block text-sm font-semibold text-slate-700">
          🔍 گەڕانی خێرا
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            id="search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ناو، ژمارەی مۆبایل، یان کۆدی شێین بنووسە..."
            className="w-full pl-20 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 gap-2">
            {onCameraClick && (
              <button
                onClick={onCameraClick}
                type="button"
                className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                title="سکانی کۆدی SKU بە کامێرا"
              >
                <Camera className="w-5 h-5" />
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                id="btn-clear-search"
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg"
                title="پاککردنەوەی گەڕان"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* فلتەرکردنی دۆخ */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500 mr-1">فلتەرکردنی تەڵەبەکان:</span>
        <div id="status-filter-tabs" className="grid grid-cols-3 gap-1.5 bg-slate-200/60 p-1 rounded-xl">
          <button
            onClick={() => onStatusFilterChange('all')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>گشتی ({ordersCount.all})</span>
          </button>

          <button
            onClick={() => onStatusFilterChange('pending')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>چاوەڕوان ({ordersCount.pending})</span>
          </button>

          <button
            onClick={() => onStatusFilterChange('arrived')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'arrived'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>گەیشتووە ({ordersCount.arrived})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
