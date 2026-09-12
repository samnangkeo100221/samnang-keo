import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Store,
  Clock,
  User,
  CreditCard,
  FileText,
  Receipt,
  QrCode,
  Building2,
  Phone,
  Calendar,
  Check,
  Copy,
} from 'lucide-react';
import { SaleItem } from '../types';
import { formatUSD, formatKHR } from '../services/storage';

interface ReceiptModalProps {
  sale: SaleItem | null;
  onClose: () => void;
  autoPrint?: boolean;
  initialFormat?: 'thermal' | 'a4';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  onClose,
  autoPrint = false,
  initialFormat = 'thermal',
}) => {
  const [templateFormat, setTemplateFormat] = useState<'thermal' | 'a4'>(initialFormat);
  const [copied, setCopied] = useState(false);

  // Synchronize initialFormat if provided
  useEffect(() => {
    if (initialFormat) {
      setTemplateFormat(initialFormat);
    }
  }, [initialFormat]);

  // Safe print invocation ensuring window focus
  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error('Print invocation error:', err);
    }
  };

  // Automatically trigger print if autoPrint is true
  useEffect(() => {
    if (sale && autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [sale, autoPrint]);

  if (!sale) return null;

  const paymentLabel =
    sale.paymentMethod === 'Cash'
      ? 'សាច់ប្រាក់ (Cash)'
      : sale.paymentMethod === 'KHQR'
      ? 'ស្កេន KHQR (Bank)'
      : 'ជំពាក់ (Credit)';

  const paymentBadgeColor =
    sale.paymentMethod === 'Cash'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : sale.paymentMethod === 'KHQR'
      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
      : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

  const isPaid = sale.paymentMethod !== 'Credit';

  const formattedDateTime = (() => {
    try {
      const d = new Date(sale.saleDate);
      if (isNaN(d.getTime())) return sale.saleDate;
      return d.toLocaleString('km-KH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return sale.saleDate;
    }
  })();

  const handleCopySummary = () => {
    const summary = `
=== វិក្កយបត្រ / INVOICE: ${sale.invoiceNo || 'N/A'} ===
កាលបរិច្ឆេទ: ${formattedDateTime}
អតិថិជន: ${sale.customerName || 'អតិថិជនទូទៅ'}
ទំនិញ: ${sale.productName} (${sale.productCode})
បរិមាណ: ${sale.quantity} ${sale.unit}
តម្លៃឯកតា: ${formatUSD(sale.salePriceUSD)} (${formatKHR(sale.salePriceKHR)})
សរុបទឹកប្រាក់: ${formatUSD(sale.totalSaleUSD)} (${formatKHR(sale.totalSaleKHR)})
វិធីទូទាត់: ${paymentLabel}
អត្រាប្ដូរប្រាក់: 1$ = ${sale.exchangeRate?.toLocaleString('km-KH') || '4,057'} ៛
ស្ថានភាព: ${isPaid ? 'បានទូទាត់រួច (PAID)' : 'ជំពាក់ (CREDIT)'}
    `.trim();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`receipt-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 overflow-y-auto ${
        templateFormat === 'a4' ? 'print-format-a4' : 'print-format-thermal'
      }`}
    >
      <div
        className={`w-full flex flex-col my-auto transition-all ${
          templateFormat === 'a4' ? 'max-w-3xl' : 'max-w-md'
        }`}
      >
        {/* =========================================================================
            SCREEN-ONLY CONTROLS & FORMAT TOGGLE BAR (Hidden in printout)
            ========================================================================= */}
        <div className="no-print bg-[#161920] border border-[#2D333E] rounded-2xl p-3 mb-3 shadow-xl flex flex-wrap items-center justify-between gap-2.5 text-xs text-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-1.5 text-slate-100">
                <span>ទម្រង់វិក្កយបត្រ</span>
                <span className="text-[11px] font-mono text-amber-400 font-semibold">
                  #{sale.invoiceNo}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                ជ្រើសរើសទំហំក្រដាសបោះពុម្ពសម្រាប់អតិថិជន
              </p>
            </div>
          </div>

          {/* Format Selector: Thermal (80mm) vs Standard A4 */}
          <div className="flex items-center bg-[#0F1115] p-1 rounded-xl border border-[#2D333E]">
            <button
              type="button"
              onClick={() => setTemplateFormat('thermal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                templateFormat === 'thermal'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#1C212B]'
              }`}
              title="បោះពុម្ពជាបង្កាន់ដៃកម្ដៅ POS 80mm"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>កម្ដៅ 80mm</span>
            </button>
            <button
              type="button"
              onClick={() => setTemplateFormat('a4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                templateFormat === 'a4'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#1C212B]'
              }`}
              title="បោះពុម្ពជាវិក្កយបត្រផ្លូវការ A4"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>វិក្កយបត្រ A4</span>
            </button>
          </div>

          {/* Action buttons on screen */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 rounded-xl border border-[#2D333E] bg-[#1C212B] hover:bg-[#252C3A] text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="ចម្លងព័ត៌មានវិក្កយបត្រ"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">បានចម្លង</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>ចម្លង</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold shadow-md shadow-blue-950/40 transition-colors cursor-pointer text-xs"
              title="ចុចដើម្បីបោះពុម្ព (Ctrl + P)"
            >
              <Printer className="h-4 w-4" />
              <span>បោះពុម្ព (Print)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-[#252C3A] transition-colors cursor-pointer"
              title="បិទផ្ផ្ទាំង"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            TEMPLATE 1: 80MM THERMAL RECEIPT (បង្កាន់ដៃកម្ដៅ 80mm)
            ========================================================================= */}
        {templateFormat === 'thermal' && (
          <div
            id="printable-receipt"
            className="printable-receipt print-format-thermal bg-[#161920] border border-[#2D333E] rounded-2xl p-5 shadow-2xl text-slate-200 text-xs font-sans max-h-[80vh] overflow-y-auto"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-[#2D333E] space-y-1">
              <div className="inline-flex p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mb-1 border border-emerald-500/20 no-print">
                <Store className="h-5 w-5" />
              </div>
              <h2 className="text-base font-black text-white tracking-wider uppercase">
                ហាងលក់ទំនិញទូទៅ POS STORE
              </h2>
              <p className="text-[11px] text-slate-400">
                វិក្កយបត្របង់ប្រាក់ / PAYMENT RECEIPT
              </p>
              <p className="text-[10px] text-slate-400 font-sans">
                រាជធានីភ្នំពេញ • ទូរស័ព្ទ៖ 012 345 678 / 098 765 432
              </p>
            </div>

            {/* Receipt Identification & Metadata */}
            <div className="py-2.5 border-b border-dashed border-[#2D333E] space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">លេខវិក្កយបត្រ (Inv #):</span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {sale.invoiceNo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">កាលបរិច្ឆេទ (Date):</span>
                <span className="text-slate-300 font-mono">{formattedDateTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">អតិថិជន (Customer):</span>
                <span className="font-semibold text-white">
                  {sale.customerName || 'អតិថិជនទូទៅ'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">វិធីទូទាត់ (Payment):</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${paymentBadgeColor}`}>
                  {paymentLabel}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">បេឡា (Cashier):</span>
                <span className="font-mono text-slate-300">POS-01</span>
              </div>
            </div>

            {/* Items Breakdown Table */}
            <div className="py-3 border-b border-dashed border-[#2D333E] space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase pb-1 flex justify-between border-b border-[#2D333E]/50">
                <span>មុខទំនិញ (Item)</span>
                <span className="text-right">សរុប (Total)</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-bold text-white flex justify-between">
                    <span className="leading-snug">{sale.productName}</span>
                    <span className="font-mono text-emerald-400 font-bold ml-2 shrink-0">
                      {formatUSD(sale.totalSaleUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-0.5">
                    <span>
                      ID: {sale.productCode} • {sale.quantity} {sale.unit} × {formatUSD(sale.salePriceUSD)}
                    </span>
                    <span className="text-emerald-300 font-medium">
                      {formatKHR(sale.totalSaleKHR)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    (តម្លៃរាយ៖ {formatKHR(sale.salePriceKHR)} / {sale.unit})
                  </div>
                </div>

                {sale.notes && (
                  <div className="text-[10px] text-slate-400 bg-[#0F1115] p-2 rounded-lg border border-[#2D333E]/60 italic mt-1">
                    សម្គាល់៖ {sale.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Totals & Exchange Rate */}
            <div className="py-3 border-b border-dashed border-[#2D333E] space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-400 text-xs">អត្រាប្ដូរប្រាក់ (Rate):</span>
                <span className="font-mono text-xs text-slate-300">
                  1 USD = {sale.exchangeRate?.toLocaleString('km-KH') || '4,057'} KHR
                </span>
              </div>

              <div className="pt-1.5 border-t border-[#2D333E]/40 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-200">សរុបជាដុល្លារ ($):</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {formatUSD(sale.totalSaleUSD)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-200">សរុបជារៀល (៛):</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {formatKHR(sale.totalSaleKHR)}
                  </span>
                </div>
              </div>

              {/* Status Stamp */}
              <div className="mt-2 text-center py-1.5 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                {isPaid ? '✓ PAID / បានទូទាត់រួច' : '⚠ CREDIT / ជំពាក់'}
              </div>
            </div>

            {/* Footer / Customer Terms */}
            <div className="pt-3 text-center space-y-1.5 text-[10px] text-slate-400">
              <p className="font-bold text-white text-xs">
                សូមអរគុណចំពោះការគាំទ្រ!
              </p>
              <p className="text-[9px] text-slate-400 leading-normal">
                ទំនិញទិញរួចមិនអាចប្តូរជាសាច់ប្រាក់វិញបានទេ<br />
                Goods sold are not returnable for cash
              </p>
              <div className="pt-1 font-mono tracking-widest text-[10px] text-slate-400">
                * {sale.invoiceNo} *
              </div>
              <div className="text-[8px] text-slate-500 pt-0.5">
                Printed on: {new Date().toLocaleString('km-KH')}
              </div>
            </div>

            {/* Screen-only Close Button in modal footer */}
            <div className="no-print pt-4 border-t border-[#2D333E] flex gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-[#1C212B] hover:bg-[#252C3A] text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                បិទផ្ទាំង
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>បោះពុម្ព</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            TEMPLATE 2: PROFESSIONAL A4 INVOICE (វិក្កយបត្រ A4 ស្តង់ដារ)
            ========================================================================= */}
        {templateFormat === 'a4' && (
          <div
            id="printable-receipt"
            className="printable-receipt print-format-a4 bg-[#161920] border border-[#2D333E] rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-200 font-sans max-h-[85vh] overflow-y-auto"
          >
            {/* A4 Letterhead: Store Logo + Official Heading */}
            <div className="pb-6 border-b-2 border-slate-700 flex flex-col sm:flex-row justify-between items-start gap-4">
              {/* Left Brand Identity */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md border border-blue-400/40">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                      ហាងលក់ទំនិញទូទៅ POS STORE
                    </h1>
                    <p className="text-xs text-slate-400 tracking-wider uppercase font-semibold">
                      Cambodia Smart Retail & POS Management
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-0.5 pt-1.5 pl-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>អាសយដ្ឋាន៖ រាជធានីភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>ទូរស័ព្ទ៖ 012 345 678 / 098 765 432 • Telegram: @pos_store</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    លេខអត្តសញ្ញាណកម្មសារពើពន្ធ (VAT TIN): K005-902103482
                  </div>
                </div>
              </div>

              {/* Right: Invoice Type, Number & Status */}
              <div className="sm:text-right w-full sm:w-auto bg-[#0F1115] sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-[#2D333E]">
                <div className="inline-block px-3 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider mb-2">
                  TAX INVOICE / វិក្កយបត្រ
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-white tracking-wide">
                  {sale.invoiceNo}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  កាលបរិច្ឆេទ៖ {formattedDateTime}
                </div>
                <div className="mt-2 flex sm:justify-end">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                      isPaid
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isPaid ? 'PAID / បានទូទាត់' : 'UNPAID / ជំពាក់'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To & Transaction Particulars Box */}
            <div className="my-5 p-4 rounded-xl bg-[#0F1115] border border-[#2D333E] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  អតិថិជន / Billed To:
                </span>
                <div className="font-bold text-white text-sm">
                  {sale.customerName || 'អតិថិជនទូទៅ'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">អតិថិជនទូទៅ / Walk-in Customer</div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  វិធីទូទាត់ / Payment:
                </span>
                <div className="font-semibold text-emerald-400">
                  {paymentLabel}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">គិតជាដុល្លារ ($) និងរៀល (៛)</div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  អត្រាប្ដូរប្រាក់ / Rate:
                </span>
                <div className="font-mono font-bold text-slate-200">
                  1 USD = {sale.exchangeRate?.toLocaleString('km-KH') || '4,057'} KHR
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">អត្រាផ្លូវការធនាគារអេស៊ីលីដា</div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  អ្នកចេញវិក្កយបត្រ / Issued By:
                </span>
                <div className="font-mono font-semibold text-slate-200">
                  CASHIER-01
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">ប្រព័ន្ធគ្រប់គ្រងការលក់ POS</div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-x-auto rounded-xl border border-[#2D333E]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#12151B] border-b border-[#2D333E] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 text-center w-12">ល.រ</th>
                    <th className="py-3 px-3 w-28">លេខកូដ (ID)</th>
                    <th className="py-3 px-4">បរិយាយមុខទំនិញ (Description)</th>
                    <th className="py-3 px-3">ប្រភេទ</th>
                    <th className="py-3 px-3 text-center w-24">បរិមាណ</th>
                    <th className="py-3 px-4 text-right w-36">តម្លៃឯកតា ($ & ៛)</th>
                    <th className="py-3 px-4 text-right w-40">សរុប ($ & ៛)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D333E]/60 text-slate-200">
                  <tr className="hover:bg-[#1C212B]/40 transition-colors">
                    <td className="py-3.5 px-3 text-center font-mono text-slate-400 font-bold">
                      01
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-amber-400">
                      {sale.productCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{sale.productName}</div>
                      {sale.notes && (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">
                          សម្គាល់៖ {sale.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {sale.category || 'ទូទៅ'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-white">
                      {sale.quantity} {sale.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="font-semibold text-slate-100">
                        {formatUSD(sale.salePriceUSD)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatKHR(sale.salePriceKHR)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="font-bold text-emerald-400 text-sm">
                        {formatUSD(sale.totalSaleUSD)}
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-300/90">
                        {formatKHR(sale.totalSaleKHR)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Calculations & Grand Total Section */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Left Column: Terms, Payment Instructions & Notes */}
              <div className="md:col-span-7 space-y-3">
                <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#2D333E] text-xs text-slate-300 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>លក្ខខណ្ឌនៃការទិញ-លក់ (Terms & Conditions):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>ទំនិញដែលបានទិញរួច មិនអាចប្តូរជាសាច់ប្រាក់វិញបានទេ (Goods sold are non-refundable).</li>
                    <li>សូមពិនិត្យមុខទំនិញ បរិមាណ និងចំនួនទឹកប្រាក់មុនពេលចាកចេញពីហាង។</li>
                    <li>វិក្កយបត្រនេះជាភស្តុតាងផ្លូវការនៃការទិញទំនិញ (Official proof of purchase).</li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Grand Totals Summary */}
              <div className="md:col-span-5 p-4 rounded-xl bg-[#0F1115] border border-[#2D333E] space-y-2.5 text-xs">
                <div className="flex justify-between items-baseline text-slate-400">
                  <span>សរុបរង (Subtotal USD):</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatUSD(sale.totalSaleUSD)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-slate-400">
                  <span>សរុបរង (Subtotal KHR):</span>
                  <span className="font-mono font-bold text-white">
                    {formatKHR(sale.totalSaleKHR)}
                  </span>
                </div>

                <div className="pt-2 border-t-2 border-[#2D333E] space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-black text-sm text-white">សរុបត្រូវបង់ ($):</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {formatUSD(sale.totalSaleUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-black text-xs text-slate-300">សរុបត្រូវបង់ (៛):</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {formatKHR(sale.totalSaleKHR)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2D333E]/60 flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>ទឹកប្រាក់បានទូទាត់៖</span>
                  <span className="text-emerald-400 font-bold">
                    {isPaid ? formatUSD(sale.totalSaleUSD) : '$0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="mt-8 pt-6 border-t border-slate-700 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-12">
                <div className="font-bold text-white">
                  ហត្ថលេខា និងឈ្មោះអ្នកទិញ<br />
                  <span className="font-normal text-[11px] text-slate-400">
                    Customer&apos;s Signature
                  </span>
                </div>
                <div className="border-b border-dashed border-slate-600 w-48 mx-auto"></div>
                <div className="text-[11px] text-slate-400 font-medium">
                  កាលបរិច្ឆេទ / Date: _____ / _____ / ________
                </div>
              </div>

              <div className="space-y-12">
                <div className="font-bold text-white">
                  ហត្ថលេខា និងឈ្មោះអ្នកលក់ / បេឡា<br />
                  <span className="font-normal text-[11px] text-slate-400">
                    Authorized Signature & Stamp
                  </span>
                </div>
                <div className="border-b border-dashed border-slate-600 w-48 mx-auto"></div>
                <div className="text-[11px] text-slate-400 font-medium">
                  កាលបរិច្ឆេទ / Date: _____ / _____ / ________
                </div>
              </div>
            </div>

            {/* Screen-only Modal Footer */}
            <div className="no-print pt-6 border-t border-[#2D333E] flex justify-between items-center gap-3 mt-4">
              <span className="text-xs text-slate-400">
                វិក្កយបត្រផ្លូវការសម្រាប់ចេញជូនអតិថិជន A4 Print Template
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#1C212B] hover:bg-[#252C3A] text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  បិទផ្ទាំង
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-950/40"
                >
                  <Printer className="h-4 w-4" />
                  <span>បោះពុម្ពវិក្កយបត្រ A4</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
