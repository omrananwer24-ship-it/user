import React, { useState, useMemo } from 'react';
import {
  Calendar,
  FileText,
  User,
  Phone,
  Barcode,
  CheckCircle,
  Clock,
  Copy,
  Check,
  Share2,
  TrendingUp,
  Printer,
  ChevronDown,
  X,
} from 'lucide-react';
import { Order } from '../types';

interface MonthlyReportsProps {
  orders: Order[];
  activeView?: 'reports' | 'invoice';
}

export default function MonthlyReports({ orders, activeView = 'reports' }: MonthlyReportsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [statementCustomer, setStatementCustomer] = useState<string | null>(null);
  const [copiedStatement, setCopiedStatement] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // دەرهێنانی گشت مانگەکانی تەڵەبەکان بە شێوازی داینامیکی
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    orders.forEach((o) => {
      const date = new Date(o.createdAt);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        // ناو دەنێین بەپێی مانگی فەرمی
        const monthIndex = date.getMonth();
        const monthNames = [
          'کانوونی دووەم (1)', 'شوبات (2)', 'ئازار (3)', 'نیسان (4)',
          'ئایار (5)', 'حوزەیران (6)', 'تەممووز (7)', 'ئاب (8)',
          'ئەیلوول (9)', 'تشرینی یەکەم (10)', 'تشرینی دووەم (11)', 'کانوونی یەکەم (12)'
        ];
        const monthStr = `${monthNames[monthIndex]} - ${year}`;
        monthsSet.add(monthStr);
      }
    });

    const monthsArr = Array.from(monthsSet).sort();
    // ئەگەر مانگی پێشتر دیاری نەکرابوو، یەکەم مانگی نوێترین دادەنێین
    if (monthsArr.length > 0 && !selectedMonth) {
      // پێشنیارکردنی نوێترین مانگ لە سەرەوە
      setSelectedMonth(monthsArr[monthsArr.length - 1]);
    }
    return monthsArr;
  }, [orders]);

  // گۆڕینی دۆخی هەڵبژاردنی مانگ ئەگەر لیستی مانگەکان نوێبووەوە
  const activeMonth = selectedMonth || availableMonths[availableMonths.length - 1] || '';

  // فلتەرکردنی تەڵەبەکانی تایبەت بەو مانگەی کە هەڵبژێردراوە
  const monthlyOrders = useMemo(() => {
    if (!activeMonth) return [];
    return orders.filter((o) => {
      const date = new Date(o.createdAt);
      if (isNaN(date.getTime())) return false;
      const monthNames = [
        'کانوونی دووەم (1)', 'شوبات (2)', 'ئازار (3)', 'نیسان (4)',
        'ئایار (5)', 'حوزەیران (6)', 'تەممووز (7)', 'ئاب (8)',
        'ئەیلوول (9)', 'تشرینی یەکەم (10)', 'تشرینی دووەم (11)', 'کانوونی یەکەم (12)'
      ];
      const monthStr = `${monthNames[date.getMonth()]} - ${date.getFullYear()}`;
      return monthStr === activeMonth;
    });
  }, [orders, activeMonth]);

  // ئامارەکانی مانگی هەڵبژێردراو
  const stats = useMemo(() => {
    const totalCount = monthlyOrders.length;
    const arrivedCount = monthlyOrders.filter((o) => o.status === 'arrived').length;
    const pendingCount = monthlyOrders.filter((o) => o.status === 'pending').length;

    const totalPrice = monthlyOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const arrivedPrice = monthlyOrders.filter((o) => o.status === 'arrived').reduce((sum, o) => sum + (o.price || 0), 0);
    const pendingPrice = monthlyOrders.filter((o) => o.status === 'pending').reduce((sum, o) => sum + (o.price || 0), 0);

    return {
      totalCount,
      arrivedCount,
      pendingCount,
      totalPrice,
      arrivedPrice,
      pendingPrice,
    };
  }, [monthlyOrders]);

  // کۆکردنەوەی تەڵەبەکان بەپێی کڕیار بۆ کشف حساب لەو مانگەدا
  const customersSummary = useMemo(() => {
    const summaryMap: {
      [key: string]: {
        name: string;
        phone: string;
        items: Order[];
        totalPrice: number;
        arrivedPrice: number;
        pendingPrice: number;
        arrivedCount: number;
        pendingCount: number;
      };
    } = {};

    monthlyOrders.forEach((o) => {
      const key = o.name.trim().toLowerCase();
      if (!summaryMap[key]) {
        summaryMap[key] = {
          name: o.name,
          phone: o.phone || '',
          items: [],
          totalPrice: 0,
          arrivedPrice: 0,
          pendingPrice: 0,
          arrivedCount: 0,
          pendingCount: 0,
        };
      }
      summaryMap[key].items.push(o);
      summaryMap[key].totalPrice += o.price || 0;
      if (o.status === 'arrived') {
        summaryMap[key].arrivedPrice += o.price || 0;
        summaryMap[key].arrivedCount += 1;
      } else {
        summaryMap[key].pendingPrice += o.price || 0;
        summaryMap[key].pendingCount += 1;
      }
    });

    return Object.values(summaryMap).sort((a, b) => b.totalPrice - a.totalPrice);
  }, [monthlyOrders]);

  // فلتەرکردنی کڕیارەکان بەپێی گەڕانی ناو یان مۆبایل
  const filteredCustomersSummary = useMemo(() => {
    if (!customerSearchQuery.trim()) return customersSummary;
    const q = customerSearchQuery.trim().toLowerCase();
    return customersSummary.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customersSummary, customerSearchQuery]);

  // تەڵەبەکانی ئەو کڕیارەی کە کشف حسابی بۆ دەکرێت
  const activeCustomerStatement = useMemo(() => {
    if (!statementCustomer) return null;
    const key = statementCustomer.trim().toLowerCase();
    const customerGroup = customersSummary.find((c) => c.name.trim().toLowerCase() === key);
    return customerGroup || null;
  }, [customersSummary, statementCustomer]);

  // کۆپیکردنی دەقی کشف حساب بۆ واتسئەپ یان بەرنامەکانی تر
  const handleCopyStatement = () => {
    if (!activeCustomerStatement) return;
    const c = activeCustomerStatement;

    let itemsText = '';
    c.items.forEach((item, index) => {
      const dateFormatted = new Date(item.createdAt).toLocaleDateString('ku-IQ', {
        month: 'short',
        day: 'numeric',
      });
      const statusStr = item.status === 'arrived' ? '✅ گەیشتووە' : '⏳ لە ڕێدایە';
      const cleanCode = item.code.startsWith('http') ? 'بەستەری کاڵا' : item.code;
      itemsText += `${index + 1}. کۆد: ${cleanCode} (${dateFormatted}) - ${statusStr} - نرخ: ${(item.price || 0).toLocaleString()} د.ع\n`;
    });

    const text = `📋 *کشف حسابی داواکارییەکانی شێین*
👤 *بۆ کڕیار:* ${c.name}
📅 *بۆ مانگی:* ${activeMonth}
📱 *مۆبایل:* ${c.phone || 'تۆمار نەکراوە'}

*لیستی کاڵاکان:*
${itemsText}
----------------------------------
📦 *سەرجەم کاڵاکان:* ${c.items.length} دانە
💰 *کۆی گشتی گشت تەڵەبەکان:* ${c.totalPrice.toLocaleString()} د.ع

🟢 *پارەی کاڵا گەیشتووەکان:* ${c.arrivedPrice.toLocaleString()} د.ع (${c.arrivedCount} کاڵا)
🟡 *پارەی کاڵا ماوەکان (لە ڕێگایە):* ${c.pendingPrice.toLocaleString()} د.ع (${c.pendingCount} کاڵا)

_سوپاس بۆ متمانەتان و کڕینتان لەگەڵمان 🌸_`;

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedStatement(true);
        setTimeout(() => setCopiedStatement(false), 2500);
      })
      .catch((err) => console.error('Failed to copy statement:', err));
  };

  // هێنانی نیشاندانی مانگ
  const formatPrice = (num: number) => {
    return num.toLocaleString('en-US') + ' د.ع';
  };

  if (availableMonths.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center max-w-md mx-auto my-6 space-y-3">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
          <FileText className="w-8 h-8" />
        </div>
        <h4 className="text-base font-bold text-slate-800">هیچ کشف حسابێک بەردەست نییە</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          دوای تۆمارکردنی تەڵەبەکان بە نرخەکانیان، لێرە بە شێوازی خۆکار ڕاپۆرت و کشف حسابی مانگانەت بۆ دروست دەبێت!
        </p>
      </div>
    );
  }

  const isInvoiceMode = activeView === 'invoice';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* سێکتەری مانگ و ناونیشانی بەش */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              {isInvoiceMode ? <FileText className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </div>
            <h3 className="text-lg font-bold">{isInvoiceMode ? 'کشف حسابی کڕیاران' : 'ڕاپۆرتی مانگانە و حسابات'}</h3>
          </div>
          <p className="text-[11px] text-slate-300">
            {isInvoiceMode 
              ? 'دەرهێنان، کۆپیکردن و گەڕانی خێرا بۆ کشف حسابی کڕیارەکان بەپێی مانگ' 
              : 'کۆنترۆڵی حساباتی گشتی، کاڵا گەیشتووەکان و ماوەکان'}
          </p>
        </div>

        {/* هەڵبژاردنی مانگی ڕاپۆرت */}
        <div className="relative shrink-0 w-full md:w-64">
          <label className="block text-[10px] text-slate-400 font-bold mb-1 mr-1">
            دیاریکردنی مانگی دارایی
          </label>
          <div className="relative">
            <select
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 cursor-pointer appearance-none text-right"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* مۆدی ڕاپۆرتی مانگانە */}
      {!isInvoiceMode ? (
        <>
          {/* ئامارەکانی تایبەت بەم مانگە */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* کۆی تەڵەبەکان */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">کۆی سەرجەم تەڵەبەکان</span>
              <span className="text-xl font-extrabold text-slate-800 mt-2">{stats.totalCount} کاڵا</span>
              <span className="text-xs font-bold text-blue-600 mt-1">
                بە بەهای {formatPrice(stats.totalPrice)}
              </span>
            </div>

            {/* کۆی گەیشتووەکان */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-wider">کاڵا گەیشتووەکان (وەرگیراو)</span>
              <span className="text-xl font-extrabold text-emerald-700 mt-2">{stats.arrivedCount} کاڵا</span>
              <span className="text-xs font-bold text-emerald-600 mt-1">
                بە بەهای {formatPrice(stats.arrivedPrice)}
              </span>
            </div>

            {/* کۆی ماوەکان */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex flex-col justify-between shadow-3xs">
              <span className="text-[10px] text-amber-600/80 font-bold uppercase tracking-wider">کاڵا ماوەکان (لە ڕێدایە)</span>
              <span className="text-xl font-extrabold text-amber-700 mt-2">{stats.pendingCount} کاڵا</span>
              <span className="text-xs font-bold text-amber-600 mt-1">
                بە بەهای {formatPrice(stats.pendingPrice)}
              </span>
            </div>
          </div>

          {/* لیستی سەرجەم داواکارییەکانی ئەم مانگە بۆ گشتی */}
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <FileText className="w-4.5 h-4.5 text-slate-500" />
                <span>گشت داواکارییەکانی ئەم مانگە ({monthlyOrders.length} کاڵا)</span>
              </h4>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[350px]">
              {monthlyOrders.map((item, index) => (
                <div key={item.id} className="p-3 bg-white hover:bg-slate-50/40 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 truncate block text-xs">
                        {item.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 block" dir="ltr">
                        {item.code.startsWith('http') ? 'بەستەری کاڵا' : item.code}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                      item.status === 'arrived' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status === 'arrived' ? 'گەیشتووە' : 'لە ڕێدایە'}
                    </span>
                    <span className="font-extrabold text-slate-700 min-w-[70px] text-left">
                      {formatPrice(item.price || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* بەشی گەڕان بۆ کڕیارەکان لە مۆدی کشف حساب */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-3xs space-y-2">
            <label className="block text-xs font-extrabold text-slate-700 mr-1">🔍 گەڕانی خێرا بەدوای کڕیاردا</label>
            <input
              type="text"
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              placeholder="ناوی کڕیار یان ژمارەی مۆبایل بنووسە..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all text-right font-medium"
            />
          </div>

          {/* خشتەی حساباتی کڕیاران لەم مانگەدا */}
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <FileText className="w-4.5 h-4.5 text-slate-500" />
                <span>حساباتی کڕیاران لەم مانگەدا ({filteredCustomersSummary.length} کڕیار)</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-bold italic">ریزکراون بەپێی بەهای حساب</span>
            </div>

            {/* لیستی کڕیارەکان بە خشتە */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/40 text-slate-500 font-bold border-b border-slate-100">
                    <th className="p-3.5 pr-5">ناوی کڕیار</th>
                    <th className="p-3.5 text-center">بڕی کاڵا</th>
                    <th className="p-3.5 text-center">گەیشتووە (وەرگیراو)</th>
                    <th className="p-3.5 text-center">ماوە (چاوەڕوان)</th>
                    <th className="p-3.5">کۆی گشتی حساب</th>
                    <th className="p-3.5 text-center">کشف حساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCustomersSummary.map((c) => (
                <tr key={c.name} className="hover:bg-slate-50/50 transition-colors">
                  {/* ناو و ژمارەی مۆبایل */}
                  <td className="p-3.5 pr-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">{c.name}</span>
                        {c.phone && <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{c.phone}</span>}
                      </div>
                    </div>
                  </td>
                  
                  {/* بڕی کاڵاکان */}
                  <td className="p-3.5 text-center font-bold text-slate-700">
                    {c.items.length} دانە
                  </td>

                  {/* بڕی گەیشتوو */}
                  <td className="p-3.5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-emerald-600 font-bold">{formatPrice(c.arrivedPrice)}</span>
                      <span className="text-[9px] text-slate-400 font-semibold">({c.arrivedCount} کاڵا)</span>
                    </div>
                  </td>

                  {/* بڕی چاوەڕوان */}
                  <td className="p-3.5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-amber-600 font-bold">{formatPrice(c.pendingPrice)}</span>
                      <span className="text-[9px] text-slate-400 font-semibold">({c.pendingCount} کاڵا)</span>
                    </div>
                  </td>

                  {/* کۆی گشتی بە پۆڵیشی تایبەت */}
                  <td className="p-3.5 font-extrabold text-blue-600 text-sm">
                    {formatPrice(c.totalPrice)}
                  </td>

                  {/* دوگمەی کشف حساب */}
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setStatementCustomer(c.name)}
                      className="py-1.5 px-3.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-[11px] font-bold transition-all shadow-3xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>کشف حساب</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

      {/* مۆداڵی کشف حسابی کڕیاری دیاریکراو (Kashf Hisab Modal) */}
      {activeCustomerStatement && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-right">
            {/* هێدەری مۆداڵ */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h4 className="font-extrabold text-sm md:text-base">کشف حسابی کڕیار</h4>
                  <p className="text-[10px] text-slate-300 font-medium">سەیرکردن، کۆپیکردن و حساباتی فەرمی</p>
                </div>
              </div>
              <button
                onClick={() => setStatementCustomer(null)}
                className="p-1.5 bg-slate-800 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* لاشەی مۆداڵ (کشف حسابەکە) */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* زانیاری کڕیار */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">کڕیاری بەڕێز</span>
                    <h5 className="font-extrabold text-slate-800 text-base">{activeCustomerStatement.name}</h5>
                  </div>
                  {activeCustomerStatement.phone && (
                    <div className="text-left font-mono">
                      <span className="text-[10px] text-slate-400 font-bold block">مۆبایل</span>
                      <span className="text-xs text-slate-600">{activeCustomerStatement.phone}</span>
                    </div>
                  )}
                </div>
                <div className="h-[1px] bg-slate-200/80 my-2" />
                <div className="flex justify-between text-xs text-slate-500 font-bold">
                  <span>مانگی دارایی: {activeMonth}</span>
                  <span>کۆی گشتی داواکاری: {activeCustomerStatement.items.length} کاڵا</span>
                </div>
              </div>

              {/* خشتەی کاڵاکان بۆ چاپ */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold pr-1">تفسیلی داواکارییەکان</span>
                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {activeCustomerStatement.items.map((item, index) => (
                    <div key={item.id} className="p-3 bg-white hover:bg-slate-50/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-slate-700 truncate block text-[11px] max-w-[200px]" dir="ltr">
                            {item.code.startsWith('http') ? 'بەستەری شێین (شیین)' : item.code}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {new Date(item.createdAt).toLocaleDateString('ku-IQ', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* نرخ و دۆخی گەیشتن */}
                      <div className="flex items-center gap-3">
                        {/* دۆخی گەیشتن */}
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 shrink-0 ${
                          item.status === 'arrived'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status === 'arrived' ? 'گەیشتووە' : 'چاوەڕوانە'}
                        </span>
                        {/* نرخ */}
                        <span className="font-extrabold text-slate-800 min-w-[70px] text-left">
                          {formatPrice(item.price || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* کۆتایی و ئەنجامی حیساب */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span>پارەی کاڵا گەیشتووەکان:</span>
                  <span className="text-emerald-400 font-extrabold">{formatPrice(activeCustomerStatement.arrivedPrice)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span>پارەی کاڵا ماوەکان (چاوەڕوان):</span>
                  <span className="text-amber-400 font-extrabold">{formatPrice(activeCustomerStatement.pendingPrice)}</span>
                </div>
                <div className="h-[1px] bg-slate-800 my-1" />
                <div className="flex justify-between items-center text-sm font-extrabold">
                  <span>کۆی گشتی گشت پارەکە:</span>
                  <span className="text-blue-400 text-base font-extrabold">{formatPrice(activeCustomerStatement.totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* دوگمەکانی خوارەوەی مۆداڵ */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              {/* کۆپیکردن بۆ واتسئەپ */}
              <button
                onClick={handleCopyStatement}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {copiedStatement ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>کۆپی کرا! دەتوانیت ئێستا پەیستی بکەیت</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>کۆپیکردن بۆ واتسئەپ (کشف حساب)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => window.print()}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>چاپکردن (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
