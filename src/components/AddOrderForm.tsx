import React, { useState } from 'react';
import { PlusCircle, User, Phone, MapPin, Barcode, AlertCircle, Plus, Trash2, DollarSign } from 'lucide-react';

interface AddOrderFormProps {
  onAddOrders: (name: string, phone: string, address: string, items: { code: string; price: number }[]) => void;
}

export default function AddOrderForm({ onAddOrders }: AddOrderFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState<{ code: string; price: string }[]>([{ code: '', price: '' }]);
  const [error, setError] = useState('');

  // زیادکردنی خانەیەکی نوێی کۆد و نرخ
  const addField = () => {
    setItems([...items, { code: '', price: '' }]);
  };

  // لادانی خانەیەکی دیاریکراو
  const removeField = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // گۆڕینی بەهای کۆدی کاڵاکان لەگەڵ پشتگیری جیاکردنەوەی خۆکاری چەندین کۆد لە کاتی کۆپی-پەیست
  const handleCodeChange = (index: number, value: string) => {
    if (value.includes('\n') || value.includes(',')) {
      const splitCodes = value
        .split(/[\n,]+/)
        .map((c) => c.trim())
        .filter((c) => c !== '');

      if (splitCodes.length > 1) {
        const newItems = [...items];
        const mappedItems = splitCodes.map((code) => ({ code, price: '' }));
        // دانانی یەکەم کۆد لە شوێنی خانەی ئێستا و جێگیرکردنی ئەوانی تر بەدوایدا
        newItems.splice(index, 1, ...mappedItems);
        setItems(newItems);
        return;
      }
    }

    const newItems = [...items];
    newItems[index].code = value;
    setItems(newItems);
  };

  // گۆڕینی نرخی کاڵا
  const handlePriceChange = (index: number, value: string) => {
    const newItems = [...items];
    // ڕێگەدان تەنها بە ژمارە
    const cleanValue = value.replace(/[^0-9]/g, '');
    newItems[index].price = cleanValue;
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    
    // فلتەرکردنی ئەو کاڵایانەی کە کۆدیان هەیە
    const validItems = items
      .map((item) => ({
        code: item.code.trim(),
        price: item.price ? parseInt(item.price, 10) : 0,
      }))
      .filter((item) => item.code !== '');

    if (!trimmedName) {
      setError('تکایە ناوی مشتەری بنووسە!');
      return;
    }
    if (validItems.length === 0) {
      setError('تکایە بەلایەنی کەمەوە کۆدێکی کاڵا بنووسە!');
      return;
    }

    onAddOrders(trimmedName, trimmedPhone, address.trim(), validItems);

    // سەرلەنوێ ڕێکخستنەوەی فۆرمەکە
    setName('');
    setPhone('');
    setAddress('');
    setItems([{ code: '', price: '' }]);
    setError('');
  };

  return (
    <div
      id="add-order-card"
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs mb-6 animate-fadeIn"
    >
      <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
          <PlusCircle className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">تۆمارکردنی داواکاریی نوێ</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ناوی مشتەری و ژمارەی مۆبایل لە تەنیشت یەکتر */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ناوی مشتەری */}
          <div className="space-y-1">
            <label htmlFor="input-name" className="block text-sm font-semibold text-slate-600">
              ناوی مشتەری <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                id="input-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="بۆ نموونە: سارا ئەحمەد"
                className="w-full pl-3 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-right"
                required
              />
            </div>
          </div>

          {/* ژمارەی مۆبایل */}
          <div className="space-y-1">
            <label htmlFor="input-phone" className="block text-sm font-semibold text-slate-600">
              ژمارەی مۆبایل <span className="text-slate-400 text-xs font-normal">(ئارەزوومەندانە)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                id="input-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0750xxxxxxx یان 0770xxxxxxx"
                className="w-full pl-3 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-right"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* ناونیشانی مشتەری */}
        <div className="space-y-1">
          <label htmlFor="input-address" className="block text-sm font-semibold text-slate-600">
            ناونیشانی مشتەری <span className="text-slate-400 text-xs font-normal">(ئارەزوومەندانە)</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </span>
            <input
              type="text"
              id="input-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="بۆ نموونە: هەولێر - بەختیاری"
              className="w-full pl-3 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-right"
            />
          </div>
        </div>

        {/* کۆدەکان و نرخەکان */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-slate-600">
              لیستی کاڵاکان (کۆد و نرخ) <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">
              دەتوانیت نرخ بۆ هەر کاڵایەک دیاری بکەیت
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto p-2 bg-slate-50/50 rounded-xl border border-slate-100">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-3xs">
                {/* خانەی کۆد */}
                <div className="relative flex-1 w-full">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Barcode className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={item.code}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    placeholder={
                      idx === 0
                        ? "کۆدی کاڵا، بەستەری شێین یان چەند کۆدێک لێرە دابنێ"
                        : `کۆدی کاڵای ${idx + 1}`
                    }
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-right"
                  />
                </div>

                {/* خانەی نرخ */}
                <div className="relative w-full sm:w-44">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </span>
                  <input
                    type="text"
                    value={item.price}
                    onChange={(e) => handlePriceChange(idx, e.target.value)}
                    placeholder="بهایی کاڵا (د.ع)"
                    className="w-full pl-12 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-right font-semibold"
                  />
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[10px] text-slate-400 font-bold">
                    د.ع
                  </span>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 w-full sm:w-auto flex items-center justify-center border border-slate-100 sm:border-0"
                    title="سڕینەوەی ئەم کاڵایە"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-1 text-xs">
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>زیادکردنی کاڵایەکی تر</span>
            </button>
            <span className="text-[10px] text-slate-400 italic">
              ڕێنمایی: بە کۆپی-پەیست کۆدەکان جیا دەکرێنەوە!
            </span>
          </div>
        </div>

        {/* پەیامی هەڵە */}
        {error && (
          <div
            id="form-error-message"
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* دوگمەی خەزنکردن */}
        <button
          type="submit"
          id="btn-submit-order"
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <span>خەزنکردنی هەموو داواکارییەکان</span>
        </button>
      </form>
    </div>
  );
}
