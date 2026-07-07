import React, { useState } from 'react';
import {
  User,
  Phone,
  MapPin,
  Barcode,
  Calendar,
  CheckCircle,
  Clock,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Edit2,
} from 'lucide-react';
import { Order, isSmartCodeMatch } from '../types';

interface OrderCardProps {
  order: Order;
  onToggleStatus: (id: string) => void;
  onDeleteOrder: (id: string) => void;
  onEditOrder: (id: string, code: string, price: number) => void;
  scannedCode?: string | null;
  searchQuery?: string;
}

export default function OrderCard({
  order,
  onToggleStatus,
  onDeleteOrder,
  onEditOrder,
  scannedCode,
  searchQuery,
}: OrderCardProps) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState(order.code);
  const [editPrice, setEditPrice] = useState(String(order.price || 0));

  const cleanQuery = searchQuery ? searchQuery.trim().toLowerCase() : '';
  const isQueryMatchCode = !!(
    cleanQuery &&
    (order.code.toLowerCase().includes(cleanQuery) || isSmartCodeMatch(order.code, cleanQuery))
  );
  const isScanned = !!(
    (scannedCode &&
      (order.code.trim().toLowerCase() === scannedCode.trim().toLowerCase() ||
        order.id === scannedCode)) ||
    isQueryMatchCode
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(order.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const isUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString('ku-IQ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      id={`order-card-${order.id}`}
      className={`bg-white border rounded-2xl p-4 md:p-5 shadow-xs relative transition-all duration-500 ${
        isScanned
          ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 scale-[1.01]'
          : order.status === 'arrived'
          ? 'border-emerald-200 bg-emerald-50/20 shadow-emerald-500/5'
          : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
      data-highlighted={isScanned ? "true" : "false"}
    >
      {/* هێڵی ڕەنگاوڕەنگی لای ڕاست (RTL) */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-2.5 rounded-r-2xl ${
          order.status === 'arrived' ? 'bg-emerald-500' : 'bg-amber-400'
        }`}
      />

      <div className="pr-4 space-y-4">
        {/* سەر دێڕ و دۆخی تەڵەب */}
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <h4 className="font-bold text-slate-800 text-base">{order.name}</h4>
              {isScanned && (
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-lg font-extrabold shrink-0 animate-bounce">
                  {isQueryMatchCode ? 'دۆزراوە' : 'سکانکراو'}
                </span>
              )}
            </div>

            {order.phone ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-500" dir="ltr">
                <a
                  href={`tel:${order.phone}`}
                  className="hover:text-blue-600 transition-colors flex items-center gap-1 font-mono"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{order.phone}</span>
                </a>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">بێ ژمارەی مۆبایل</span>
            )}

            {order.address && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{order.address}</span>
              </div>
            )}
          </div>

          {/* باج ی دۆخی تەڵەب */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1 ${
              order.status === 'arrived'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {order.status === 'arrived' ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>گەیشتووە</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>چاوەڕوانە</span>
              </>
            )}
          </span>
        </div>

        {isEditing ? (
          <div className="space-y-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl animate-fadeIn">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 block">دەستکاریکردنی کۆد:</label>
              <input
                type="text"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 block">دەستکاریکردنی بها (د.ع):</label>
              <input
                type="text"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  onEditOrder(order.id, editCode.trim(), parseInt(editPrice, 10) || 0);
                  setIsEditing(false);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-extrabold transition-colors cursor-pointer"
              >
                پاشەکەوتکردن
              </button>
              <button
                onClick={() => {
                  setEditCode(order.code);
                  setEditPrice(String(order.price || 0));
                  setIsEditing(false);
                }}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* کۆدی شێین یان لینک */}
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-hidden min-w-0 w-full">
                <Barcode className="w-4 h-4 text-slate-400 shrink-0" />
                {isUrl(order.code) ? (
                  <a
                    href={order.code}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline font-mono truncate flex items-center gap-1"
                    dir="ltr"
                  >
                    <span>{order.code}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-slate-700 font-mono select-all truncate">
                    {order.code}
                  </span>
                )}
              </div>

              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-all shrink-0 cursor-pointer"
                title="کۆپیکردنی کۆد"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* بهای کاڵا */}
            <div className="flex items-center justify-between text-xs font-bold border border-slate-100 bg-slate-50/40 p-2.5 rounded-xl">
              <span className="text-slate-500 font-semibold">بهایی کاڵا:</span>
              <span className="text-emerald-700 font-extrabold text-sm">
                {(order.price || 0).toLocaleString('en-US')} د.ع
              </span>
            </div>
          </>
        )}

        {/* بەروار و بەشی دوگمەکان */}
        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-50 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>تۆمارکراوە لە {formattedDate}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* دوگمەی گۆڕینی دۆخ */}
            <button
              onClick={() => onToggleStatus(order.id)}
              className={`py-1.5 px-3 rounded-lg font-bold cursor-pointer transition-all ${
                order.status === 'arrived'
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {order.status === 'arrived' ? 'بیکەرەوە چاوەڕوان' : 'گەیشت'}
            </button>

            {/* دوگمەی دەستکاریکردن */}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                title="دەستکاریکردنی تەڵەب"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* سڕینەوە */}
            {confirmDelete ? (
              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100">
                <button
                  onClick={() => onDeleteOrder(order.id)}
                  className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer text-[10px] font-bold"
                >
                  دڵنیام
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors cursor-pointer text-[10px]"
                >
                  نەخێر
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                title="سڕینەوەی تەڵەب"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
