import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Edit2,
} from 'lucide-react';
import { Order, isSmartCodeMatch } from '../types';

interface CustomerGroupCardProps {
  customerName: string;
  customerPhone: string;
  groupOrders: Order[];
  onToggleStatus: (id: string) => void;
  onDeleteOrder: (id: string) => void;
  onEditOrder: (id: string, code: string, price: number) => void;
  scannedCode?: string | null;
  searchQuery?: string;
}

export default function CustomerGroupCard({
  customerName,
  customerPhone,
  groupOrders,
  onToggleStatus,
  onDeleteOrder,
  onEditOrder,
  scannedCode,
  searchQuery,
}: CustomerGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [editingPrice, setEditingPrice] = useState('');

  const cleanQuery = searchQuery ? searchQuery.trim().toLowerCase() : '';
  const hasScannedItem = !!(
    (scannedCode &&
      groupOrders.some(
        (o) =>
          o.code.trim().toLowerCase() === scannedCode.trim().toLowerCase() ||
          o.id === scannedCode
      )) ||
    (cleanQuery &&
      groupOrders.some((o) => o.code.toLowerCase().includes(cleanQuery) || isSmartCodeMatch(o.code, cleanQuery)))
  );

  useEffect(() => {
    if (hasScannedItem) {
      setIsExpanded(true);
    }
  }, [hasScannedItem]);

  const handleCopyAllCodes = async () => {
    try {
      const allCodes = groupOrders.map((o) => o.code).join('\n');
      await navigator.clipboard.writeText(allCodes);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy all codes: ', err);
    }
  };

  const totalItems = groupOrders.length;
  const customerAddress = groupOrders.find((o) => o.address)?.address;
  const arrivedItems = groupOrders.filter((o) => o.status === 'arrived').length;
  const pendingItems = groupOrders.filter((o) => o.status === 'pending').length;

  const totalPrice = groupOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const arrivedPrice = groupOrders.filter((o) => o.status === 'arrived').reduce((sum, o) => sum + (o.price || 0), 0);
  const pendingPrice = groupOrders.filter((o) => o.status === 'pending').reduce((sum, o) => sum + (o.price || 0), 0);

  const formatPrice = (num: number) => {
    return num.toLocaleString('en-US') + ' د.ع';
  };

  const handleCopy = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
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

  return (
    <div
      id={`customer-group-${customerName.replace(/\s+/g, '-')}`}
      className={`bg-white border rounded-3xl overflow-hidden shadow-xs transition-all duration-500 hover:shadow-md ${
        hasScannedItem
          ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 scale-[1.01]'
          : 'border-slate-100 hover:border-slate-200/80'
      }`}
      data-highlighted={hasScannedItem ? "true" : "false"}
    >
      {/* هێدەر ی گرووپی کڕیار */}
      <div className="bg-slate-50/80 border-b border-slate-100 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {customerName.charAt(0)}
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
              <User className="w-4.5 h-4.5 text-slate-500" />
              <span>{customerName}</span>
            </h4>
            
            {customerPhone ? (
              <div className="flex items-center gap-2 text-xs text-slate-500" dir="ltr">
                <a
                  href={`tel:${customerPhone}`}
                  className="hover:text-blue-600 transition-colors flex items-center gap-1 font-mono"
                  title="پەیوەندیکردن"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customerPhone}</span>
                </a>
                <span className="text-slate-300">•</span>
                <a
                  href={`https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:underline text-[10px] font-bold"
                >
                  واتسئەپ
                </a>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">بێ ژمارەی مۆبایل</span>
            )}

            {customerAddress && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[250px]">{customerAddress}</span>
              </div>
            )}

            <button
              onClick={handleCopyAllCodes}
              className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all duration-200 cursor-pointer ${
                copiedAll
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/40'
              }`}
              title="کۆپیکردنی سەرجەم کۆدەکان پێکەوە"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'کۆپیکرا!' : 'کۆپیکردنی گشت کۆدەکان'}</span>
            </button>
          </div>
        </div>

        {/* دۆخ و کورتەی سەرژمێری کڕیار */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between sm:justify-end gap-3.5 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* لایەنی ژمارەی تەڵەبەکان */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="bg-slate-200/80 px-2 py-0.5 rounded-md font-bold text-slate-700">
                {totalItems} کاڵا
              </span>
              {pendingItems > 0 && (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">
                  {pendingItems} چاوەڕوان
                </span>
              )}
              {arrivedItems > 0 && (
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                  {arrivedItems} گەیشتووە
                </span>
              )}
            </div>

            {/* لایەنی کۆی گشتی پارە */}
            <div className="flex flex-col items-end border-r border-slate-200 pr-2 mr-1">
              <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-lg font-extrabold shadow-3xs">
                کۆی گشتی: {formatPrice(totalPrice)}
              </span>
              {totalPrice > 0 && (arrivedPrice > 0 || pendingPrice > 0) && (
                <div className="flex gap-1.5 text-[9px] text-slate-400 font-bold mt-0.5">
                  {arrivedPrice > 0 && <span className="text-emerald-600">گەیشتووە: {formatPrice(arrivedPrice)}</span>}
                  {arrivedPrice > 0 && pendingPrice > 0 && <span>•</span>}
                  {pendingPrice > 0 && <span className="text-amber-600">ماوە: {formatPrice(pendingPrice)}</span>}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-slate-200/60 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer self-center sm:self-auto"
            title={isExpanded ? 'کۆکردنەوەی لیست' : 'پیشاندانی لیست'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* لیستی کاڵاکانی ئەم کڕیارە بە درێژکراوەیی */}
      {isExpanded && (
        <div className="divide-y divide-slate-100 p-4 bg-white">
          {groupOrders.map((order) => {
            const formattedDate = new Date(order.createdAt).toLocaleDateString('ku-IQ', {
              month: 'short',
              day: 'numeric',
            });

            const isEditingThis = editingId === order.id;
            const isQueryMatchCode = !!(
              cleanQuery &&
              (order.code.toLowerCase().includes(cleanQuery) || isSmartCodeMatch(order.code, cleanQuery))
            );
            const isScannedRow = !!(
              (scannedCode &&
                (order.code.trim().toLowerCase() === scannedCode.trim().toLowerCase() ||
                  order.id === scannedCode)) ||
              isQueryMatchCode
            );

            return (
              <div
                key={order.id}
                id={`item-row-${order.id}`}
                className={`py-3.5 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all duration-700 ${
                  isScannedRow
                    ? 'bg-emerald-500/10 border-y border-emerald-500/30 px-3.5 rounded-2xl scale-[1.01] shadow-xs'
                    : order.status === 'arrived' ? 'bg-emerald-500/2' : ''
                }`}
              >
                {/* کۆد و بەرواری کاڵا */}
                {isEditingThis ? (
                  <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 bg-slate-50 border border-slate-200/60 p-2 rounded-xl w-full animate-fadeIn">
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={editingCode}
                        onChange={(e) => setEditingCode(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500/50 text-right"
                        dir="ltr"
                        placeholder="کۆدی نوێ بنووسە"
                      />
                    </div>
                    <div className="w-full sm:w-32">
                      <input
                        type="text"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500/50 text-right"
                        placeholder="نرخ بنووسە"
                      />
                    </div>
                    <div className="flex gap-1 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        onClick={() => {
                          onEditOrder(order.id, editingCode.trim(), parseInt(editingPrice, 10) || 0);
                          setEditingId(null);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors"
                      >
                        خەزنکردن
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        لادان
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isScannedRow ? 'bg-emerald-600 animate-ping' : order.status === 'arrived' ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                      />
                      
                      <div className={`border px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 max-w-xs md:max-w-md w-full transition-all duration-500 ${
                        isScannedRow
                          ? 'bg-emerald-100/60 border-emerald-300 text-emerald-900 font-extrabold'
                          : 'bg-slate-50 border-slate-100/60'
                      }`}>
                        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                          <Barcode className={`w-3.5 h-3.5 shrink-0 ${isScannedRow ? 'text-emerald-600' : 'text-slate-400'}`} />
                          {isUrl(order.code) ? (
                            <a
                              href={order.code}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline font-mono truncate flex items-center gap-1"
                              dir="ltr"
                            >
                              <span>بەستەر</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-xs font-semibold font-mono select-all truncate">
                              {order.code}
                            </span>
                          )}
                          {isScannedRow && (
                            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md font-bold tracking-tight shrink-0 animate-bounce">
                              {isQueryMatchCode ? 'دۆزراوە' : 'سکانکراو'}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopy(order.id, order.code)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-all shrink-0 cursor-pointer"
                          title="کۆپیکردن"
                        >
                          {copiedId === order.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/50 px-2 py-1 rounded-lg shrink-0">
                        {formatPrice(order.price || 0)}
                      </span>

                      <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>
                )}

                {/* کۆنتڕۆڵ و دوگمەکانی گۆڕینی دۆخ و سڕینەوە */}
                <div className="flex items-center justify-between md:justify-end gap-3 mt-1 md:mt-0">
                  {/* دۆخی کاڵاکە */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                      order.status === 'arrived'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {order.status === 'arrived' ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>گەیشتووە</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>چاوەڕوانە</span>
                      </>
                    )}
                  </span>

                  {/* بەشی کردەکان */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleStatus(order.id)}
                      className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        order.status === 'arrived'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      {order.status === 'arrived' ? 'کردنەوە بە چاوەڕوان' : 'گەیشت'}
                    </button>

                    {/* دوگمەی دەستکاریکردن */}
                    {!isEditingThis && (
                      <button
                        onClick={() => {
                          setEditingId(order.id);
                          setEditingCode(order.code);
                          setEditingPrice(String(order.price || 0));
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                        title="دەستکاریکردنی تەڵەب"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* دڵنیابوونەوەی سڕینەوەی کاڵا */}
                    {confirmDeleteId === order.id ? (
                      <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100">
                        <button
                          onClick={() => onDeleteOrder(order.id)}
                          className="px-1.5 py-0.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer text-[9px] font-bold"
                        >
                          بەڵێ
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors cursor-pointer text-[9px]"
                        >
                          نەخێر
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(order.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="سڕینەوەی کاڵا"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
