import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  Receipt,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { ExchangeRateConfig } from '../types';

interface AcledaRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRate: ExchangeRateConfig;
  onSelectRate: (
    newBuyRate: number,
    newSellRate: number
  ) => void;
}

export const AcledaRateModal: React.FC<AcledaRateModalProps> = ({
  isOpen,
  onClose,
  currentRate,
  onSelectRate,
}) => {
  const [customBuyRate, setCustomBuyRate] = useState<string>(
    (currentRate.buyRate || 4000).toString()
  );
  const [customSellRate, setCustomSellRate] = useState<string>(
    (currentRate.sellRate || 4100).toString()
  );

  useEffect(() => {
    setCustomBuyRate((currentRate.buyRate || 4000).toString());
    setCustomSellRate((currentRate.sellRate || 4100).toString());
  }, [currentRate]);

  if (!isOpen) return null;

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const b = parseFloat(customBuyRate);
    const s = parseFloat(customSellRate);
    if (!isNaN(b) && b > 0 && !isNaN(s) && s > 0) {
      onSelectRate(b, s);
      onClose();
    }
  };

  const activeBuy = currentRate.buyRate || 4000;
  const activeSell = currentRate.sellRate || 4100;
  const spread = activeSell - activeBuy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        id="acleda-rate-modal"
        className="w-full max-w-lg rounded-2xl bg-[#161920] border border-blue-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#0C3464] via-[#103D72] to-[#161920] border-b border-blue-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A2548] border border-blue-400 text-blue-300 font-extrabold text-sm shadow-md">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">
                  កំណត់អត្រាប្ដូរប្រាក់ (Exchange Rate)
                </h3>
              </div>
              <p className="text-xs text-blue-200/80">
                កំណត់អត្រាទិញ និងអត្រាលក់ដាច់ដោយឡែកពីគ្នា (USD / KHR)
              </p>
            </div>
          </div>
          <button
            id="btn-close-acleda-modal"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Active Dual Rate Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Buy Rate Card */}
            <div className="p-3.5 rounded-xl bg-blue-950/25 border border-blue-500/40 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-blue-300 flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  អត្រាទិញចូល (Buy Rate)
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                  ពេលទិញ
                </span>
              </div>
              <div className="text-lg font-black text-blue-400 font-mono">
                1$ = {activeBuy.toLocaleString('km-KH')} ៛
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                តម្លៃដុល្លារថ្លៃដើម × អត្រាទិញ = ថ្លៃដើមជារៀល
              </p>
            </div>

            {/* Sell Rate Card */}
            <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/40 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                  <Receipt className="h-3 w-3" />
                  អត្រាលក់ចេញ (Sell Rate)
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  ពេលលក់
                </span>
              </div>
              <div className="text-lg font-black text-emerald-400 font-mono">
                1$ = {activeSell.toLocaleString('km-KH')} ៛
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                តម្លៃដុល្លារលក់ × អត្រាលក់ = តម្លៃលក់ជារៀល
              </p>
            </div>
          </div>

          {/* Quick Explanation Banner */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#1C212B] border border-[#2D333E] text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ArrowRightLeft className="h-4 w-4 text-blue-400 shrink-0" />
              <span>
                គម្លាតអត្រា (FX Spread)៖ <strong className="text-blue-400 font-mono">+{spread} ៛</strong> / 1$
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              ប្រាក់ចំណេញ (៛) = ប្រាក់លក់ (៛) - ថ្លៃដើម (៛)
            </span>
          </div>

          {/* Custom Buy & Sell Rates Form */}
          <form
            onSubmit={handleApplyCustom}
            className="p-3.5 rounded-xl border border-blue-500/30 bg-[#161920] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                កំណត់អត្រាដោយដៃ (Custom Buy & Sell Rates):
              </span>
              <span className="text-[10px] text-slate-400">1 USD = ? KHR</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Custom Buy Rate Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-blue-300 flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  អត្រាទិញ (Buy Rate)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1000"
                    max="10000"
                    step="1"
                    value={customBuyRate}
                    onChange={(e) => setCustomBuyRate(e.target.value)}
                    placeholder="4000"
                    className="w-full rounded-xl border border-blue-500/30 bg-[#0F1115] px-3 py-2 text-xs font-mono font-bold text-white focus:border-blue-400 outline-hidden"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-blue-400">៛</span>
                </div>
              </div>

              {/* Custom Sell Rate Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                  <Receipt className="h-3 w-3" />
                  អត្រាលក់ (Sell Rate)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1000"
                    max="10000"
                    step="1"
                    value={customSellRate}
                    onChange={(e) => setCustomSellRate(e.target.value)}
                    placeholder="4100"
                    className="w-full rounded-xl border border-emerald-500/30 bg-[#0F1115] px-3 py-2 text-xs font-mono font-bold text-white focus:border-emerald-400 outline-hidden"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-emerald-400">៛</span>
                </div>
              </div>
            </div>

            <button
              id="btn-save-custom-dual-rate"
              type="submit"
              className="w-full rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 text-xs shadow-md transition-all cursor-pointer"
            >
              រក្សាទុកអត្រាប្ដូរប្រាក់
            </button>
          </form>
          
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-950/20 border border-blue-900/40 text-[11px] text-blue-300">
            <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              ពេលទិញទំនិញចូល តម្លៃដុល្លារនឹងគុណអត្រាទិញដើម្បីរកថ្លៃដើមជារៀល ហើយពេលលក់ចេញ តម្លៃដុល្លារនឹងគុណអត្រាលក់ដើម្បីរកតម្លៃលក់ និងប្រាក់ចំណេញជារៀល។
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111317] border-t border-[#2D333E] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1C212B] hover:text-white border border-[#2D333E] transition-colors cursor-pointer"
          >
            បិទ
          </button>
        </div>
      </div>
    </div>
  );
};

