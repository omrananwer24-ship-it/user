import React from 'react';
import { Package, Clock, CheckCircle2 } from 'lucide-react';
import { Order } from '../types';

interface OrderStatsProps {
  orders: Order[];
}

export default function OrderStats({ orders }: OrderStatsProps) {
  const total = orders.length;
  const pending = orders.filter((o) => o.status === 'pending').length;
  const arrived = orders.filter((o) => o.status === 'arrived').length;

  const totalPrice = orders.reduce((sum, o) => sum + (o.price || 0), 0);
  const pendingPrice = orders.filter((o) => o.status === 'pending').reduce((sum, o) => sum + (o.price || 0), 0);
  const arrivedPrice = orders.filter((o) => o.status === 'arrived').reduce((sum, o) => sum + (o.price || 0), 0);

  return (
    <div id="stats-container" className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
      {/* کارتتۆی گشتی */}
      <div
        id="stat-total"
        className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs transition-transform hover:scale-[1.02]"
      >
        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl mb-2">
          <Package className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <span className="text-[10px] md:text-xs text-slate-500 font-bold">بڕی گشتی</span>
        <span className="text-lg md:text-xl font-bold text-slate-800 mt-1">{total} دانە</span>
        <span className="text-[10px] md:text-xs font-bold text-blue-600 mt-1 bg-blue-50 px-2 py-0.5 rounded-md">
          {totalPrice.toLocaleString('en-US')} د.ع
        </span>
      </div>

      {/* کارتتۆی چاوەڕوان */}
      <div
        id="stat-pending"
        className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs transition-transform hover:scale-[1.02]"
      >
        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl mb-2">
          <Clock className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
        </div>
        <span className="text-[10px] md:text-xs text-slate-500 font-bold">لە ڕێگایە / چاوەڕوان</span>
        <span className="text-lg md:text-xl font-bold text-amber-600 mt-1">{pending} دانە</span>
        <span className="text-[10px] md:text-xs font-bold text-amber-600 mt-1 bg-amber-50 px-2 py-0.5 rounded-md">
          {pendingPrice.toLocaleString('en-US')} د.ع
        </span>
      </div>

      {/* کارتتۆی گەیشتوو */}
      <div
        id="stat-arrived"
        className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs transition-transform hover:scale-[1.02]"
      >
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl mb-2">
          <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <span className="text-[10px] md:text-xs text-slate-500 font-bold">گەیشتووە / وەرگیراو</span>
        <span className="text-lg md:text-xl font-bold text-emerald-600 mt-1">{arrived} دانە</span>
        <span className="text-[10px] md:text-xs font-bold text-emerald-700 mt-1 bg-emerald-50 px-2 py-0.5 rounded-md">
          {arrivedPrice.toLocaleString('en-US')} د.ع
        </span>
      </div>
    </div>
  );
}
