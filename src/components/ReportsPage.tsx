import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Filter,
  Package,
  Search,
  Receipt,
  Printer,
  Trash2,
  CheckCircle2,
  Building2,
  ShoppingBag,
} from 'lucide-react';
import { Product, PurchaseItem, SaleItem, ExchangeRateConfig } from '../types';
import { formatUSD, formatKHR } from '../services/storage';
import { SalesTrendProfitChart } from './SalesTrendProfitChart';
import { MonthlyProfitTrendChart } from './MonthlyProfitTrendChart';
import { ReceiptModal } from './ReceiptModal';

interface ReportsPageProps {
  products: Product[];
  purchases: PurchaseItem[];
  sales: SaleItem[];
  exchangeRate: ExchangeRateConfig;
  onOpenSheetModal: () => void;
  onDeleteSale?: (saleId: string) => void;
  onDeletePurchase?: (purchaseId: string) => void;
  initialTab?: 'overview' | 'sales' | 'purchases' | 'products';
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  products,
  purchases,
  sales,
  exchangeRate,
  onOpenSheetModal,
  onDeleteSale,
  onDeletePurchase,
  initialTab = 'overview',
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'sales' | 'purchases' | 'products'>(
    initialTab
  );
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Searches for tables
  const [salesSearch, setSalesSearch] = useState('');
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState<'all' | 'Cash' | 'KHQR' | 'Credit'>('all');

  // Receipt modal state
  const [selectedReceipt, setSelectedReceipt] = useState<SaleItem | null>(null);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);

  // Calculate Date Filtering
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = now.toISOString().slice(0, 7);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStr = oneWeekAgo.toISOString().slice(0, 10);

  const filterByDate = (dateString: string) => {
    const itemDate = dateString.slice(0, 10);
    if (dateFilter === 'today') {
      return itemDate === todayStr;
    }
    if (dateFilter === 'week') {
      return itemDate >= weekAgoStr && itemDate <= todayStr;
    }
    if (dateFilter === 'month') {
      return itemDate.startsWith(currentMonthStr);
    }
    if (dateFilter === 'custom' && startDate && endDate) {
      return itemDate >= startDate && itemDate <= endDate;
    }
    return true; // 'all'
  };

  const filteredPurchases = purchases.filter((p) => {
    const dateMatch = filterByDate(p.purchaseDate);
    const searchMatch =
      !purchasesSearch ||
      p.productName.toLowerCase().includes(purchasesSearch.toLowerCase()) ||
      p.productCode.toLowerCase().includes(purchasesSearch.toLowerCase()) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(purchasesSearch.toLowerCase())) ||
      (p.invoiceNo && p.invoiceNo.toLowerCase().includes(purchasesSearch.toLowerCase()));
    return dateMatch && searchMatch;
  });

  const filteredSales = sales.filter((s) => {
    const dateMatch = filterByDate(s.saleDate);
    const searchMatch =
      !salesSearch ||
      s.productName.toLowerCase().includes(salesSearch.toLowerCase()) ||
      s.productCode.toLowerCase().includes(salesSearch.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(salesSearch.toLowerCase())) ||
      (s.invoiceNo && s.invoiceNo.toLowerCase().includes(salesSearch.toLowerCase()));
    const paymentMatch = salesPaymentFilter === 'all' || s.paymentMethod === salesPaymentFilter;
    return dateMatch && searchMatch && paymentMatch;
  });

  // 1. Total Purchases Metrics
  const totalPurchasesUSD = filteredPurchases.reduce((sum, p) => sum + p.totalUSD, 0);
  const totalPurchasesKHR = filteredPurchases.reduce((sum, p) => sum + p.totalKHR, 0);
  const totalPurchasedQty = filteredPurchases.reduce((sum, p) => sum + p.quantity, 0);

  // 2. Total Sales Metrics
  const totalSalesUSD = filteredSales.reduce((sum, s) => sum + s.totalSaleUSD, 0);
  const totalSalesKHR = filteredSales.reduce((sum, s) => sum + s.totalSaleKHR, 0);
  const totalSoldQty = filteredSales.reduce((sum, s) => sum + s.quantity, 0);

  // 3. Total Cost of Goods Sold (COGS)
  const totalCOGSUSD = filteredSales.reduce((sum, s) => sum + s.totalCostUSD, 0);
  const totalCOGSKHR = filteredSales.reduce((sum, s) => sum + s.totalCostKHR, 0);

  // 4. Net Profit = Sales - COGS
  const totalProfitUSD = filteredSales.reduce((sum, s) => sum + s.profitUSD, 0);
  const totalProfitKHR = filteredSales.reduce((sum, s) => sum + s.profitKHR, 0);
  const overallMarginPercent =
    totalSalesUSD > 0 ? ((totalProfitUSD / totalSalesUSD) * 100).toFixed(1) : '0';

  // 5. Current Inventory Total Valuation (at cost)
  const inventoryValueUSD = products.reduce(
    (sum, p) => sum + p.stockQuantity * p.costPriceUSD,
    0
  );
  const inventoryValueKHR = products.reduce(
    (sum, p) => sum + p.stockQuantity * p.costPriceKHR,
    0
  );
  const totalStockItems = products.reduce((sum, p) => sum + p.stockQuantity, 0);

  // Profit breakdown by product
  interface ProductProfitReport {
    productCode: string;
    productName: string;
    unit: string;
    quantitySold: number;
    totalRevenueUSD: number;
    totalRevenueKHR: number;
    totalCostUSD: number;
    totalCostKHR: number;
    profitUSD: number;
    profitKHR: number;
  }

  const productProfitMap = new Map<string, ProductProfitReport>();

  filteredSales.forEach((s) => {
    const key = s.productCode || s.productName;
    const existing = productProfitMap.get(key);
    if (existing) {
      existing.quantitySold += s.quantity;
      existing.totalRevenueUSD += s.totalSaleUSD;
      existing.totalRevenueKHR += s.totalSaleKHR;
      existing.totalCostUSD += s.totalCostUSD;
      existing.totalCostKHR += s.totalCostKHR;
      existing.profitUSD += s.profitUSD;
      existing.profitKHR += s.profitKHR;
    } else {
      productProfitMap.set(key, {
        productCode: s.productCode,
        productName: s.productName,
        unit: s.unit,
        quantitySold: s.quantity,
        totalRevenueUSD: s.totalSaleUSD,
        totalRevenueKHR: s.totalSaleKHR,
        totalCostUSD: s.totalCostUSD,
        totalCostKHR: s.totalCostKHR,
        profitUSD: s.profitUSD,
        profitKHR: s.profitKHR,
      });
    }
  });

  const productProfitList = Array.from(productProfitMap.values()).sort(
    (a, b) => b.profitUSD - a.profitUSD
  );

  // Low stock items
  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.minStockAlert);

  return (
    <div className="space-y-3.5">
      {/* REPORT SUB-TABS (Overview, Sales, Purchases, Products) & Google Sheet Sync */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2D333E] pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            id="report-tab-overview"
            type="button"
            onClick={() => setActiveReportTab('overview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeReportTab === 'overview'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-[#161920] text-slate-300 hover:text-white border border-[#2D333E]'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-purple-300" />
            <span>១. សង្ខេប & ក្រាហ្វិក</span>
          </button>

          <button
            id="report-tab-sales"
            type="button"
            onClick={() => setActiveReportTab('sales')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeReportTab === 'sales'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-[#161920] text-slate-300 hover:text-white border border-[#2D333E]'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-300" />
            <span>២. លក់ចេញ ({filteredSales.length})</span>
          </button>

          <button
            id="report-tab-purchases"
            type="button"
            onClick={() => setActiveReportTab('purchases')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeReportTab === 'purchases'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-[#161920] text-slate-300 hover:text-white border border-[#2D333E]'
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5 text-blue-300" />
            <span>៣. ទិញចូល ({filteredPurchases.length})</span>
          </button>

          <button
            id="report-tab-products"
            type="button"
            onClick={() => setActiveReportTab('products')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeReportTab === 'products'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[#161920] text-slate-300 hover:text-white border border-[#2D333E]'
            }`}
          >
            <Package className="h-3.5 w-3.5 text-amber-300" />
            <span>៤. ចំណេញតាមទំនិញ ({productProfitList.length})</span>
          </button>
        </div>

        <button
          id="btn-report-open-sheet"
          type="button"
          onClick={onOpenSheetModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-all shrink-0 cursor-pointer ml-auto"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>រក្សាទុកទៅ Google Sheet</span>
        </button>
      </div>

      {/* GLOBAL DATE FILTER BAR */}
      <div className="bg-[#161920] p-2.5 rounded-xl border border-[#2D333E] shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 shrink-0">
          <Filter className="h-3.5 w-3.5 text-purple-400" />
          <span>ចម្រោះកាលបរិច្ឆេទ៖</span>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#12151B] p-0.5 border border-[#2D333E]">
          <button
            type="button"
            onClick={() => setDateFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ទាំងអស់ ({sales.length})
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('today')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ថ្ងៃនេះ
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('week')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              dateFilter === 'week'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ៧ថ្ងៃចុងក្រោយ
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('month')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              dateFilter === 'month'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ខែនេះ
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('custom')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              dateFilter === 'custom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ជ្រើសរើសថ្ងៃ
          </button>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 text-xs text-slate-300 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px]">ពី៖</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-[#2D333E] bg-[#0F1115] text-white px-2 py-0.5 text-xs outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px]">ដល់៖</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-[#2D333E] bg-[#0F1115] text-white px-2 py-0.5 text-xs outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* CORE 5 SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 1. TOTAL PURCHASES */}
        <div className="rounded-xl border border-[#2D333E] bg-[#161920] p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400">១. សរុបទិញចូលស្តុក</span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1.5 text-lg font-black text-blue-400 font-mono">
            {formatUSD(totalPurchasesUSD)}
          </div>
          <div className="text-xs font-bold text-blue-300 font-mono">
            {formatKHR(totalPurchasesKHR)}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 border-t border-[#2D333E] pt-1 flex justify-between">
            <span>{filteredPurchases.length} កំណត់ត្រា</span>
            <span>{totalPurchasedQty.toLocaleString('km-KH')} ឯកតា</span>
          </p>
        </div>

        {/* 2. TOTAL SALES REVENUE */}
        <div className="rounded-xl border border-[#2D333E] bg-[#161920] p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">២. សរុបចំណូលលក់</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1.5 text-lg font-black text-emerald-400 font-mono">
            {formatUSD(totalSalesUSD)}
          </div>
          <div className="text-xs font-bold text-emerald-300 font-mono">
            {formatKHR(totalSalesKHR)}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 border-t border-[#2D333E] pt-1 flex justify-between">
            <span>{filteredSales.length} វិក្កយបត្រ</span>
            <span>{totalSoldQty.toLocaleString('km-KH')} ឯកតា</span>
          </p>
        </div>

        {/* 3. NET PROFIT */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-300">
              ៣. ប្រាក់ចំណេញសុទ្ធ
            </span>
            <span className="rounded-md bg-blue-500/20 border border-blue-500/40 px-1.5 py-0.2 text-[10px] font-black text-blue-300 font-mono">
              Margin: {overallMarginPercent}%
            </span>
          </div>
          <div className="mt-1.5 text-lg font-black text-blue-400 font-mono">
            +{formatUSD(totalProfitUSD)}
          </div>
          <div className="text-xs font-black text-blue-300 font-mono">
            +{formatKHR(totalProfitKHR)}
          </div>
          <p className="mt-1.5 text-[10px] text-blue-300/80 border-t border-blue-500/20 pt-1 truncate">
            ចំណូល ({formatUSD(totalSalesUSD)}) - ថ្លៃដើម ({formatUSD(totalCOGSUSD)})
          </p>
        </div>

        {/* 4. TOTAL COGS & INVENTORY */}
        <div className="rounded-xl border border-[#2D333E] bg-[#161920] p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">៤. ថ្លៃដើម & ស្តុកបច្ចុប្បន្ន</span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-lg font-black text-amber-400 font-mono">
              {formatUSD(totalCOGSUSD)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              ស្តុក៖ {formatUSD(inventoryValueUSD)}
            </span>
          </div>
          <div className="text-xs font-bold text-amber-300 font-mono">
            {formatKHR(totalCOGSKHR)}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 border-t border-[#2D333E] pt-1 flex justify-between">
            <span>ថ្លៃដើមទំនិញបានលក់</span>
            <span>ស្តុកនៅសល់ {totalStockItems.toLocaleString('km-KH')}</span>
          </p>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW & 30-DAY RECHARTS VISUALIZATION
      ========================================================================= */}
      {activeReportTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 30-DAY RECHARTS VISUALIZATION */}
          <SalesTrendProfitChart sales={sales} exchangeRate={exchangeRate} />

          {/* MONTHLY RECHARTS VISUALIZATION */}
          <MonthlyProfitTrendChart sales={sales} />

          {/* LOW STOCK ALERTS */}
          {lowStockProducts.length > 0 && (
            <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <AlertTriangle className="h-4 w-4" />
                <span>ការដាស់តឿន៖ មានទំនិញចំនួន {lowStockProducts.length} ជិតអស់ពីស្តុក</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStockProducts.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#12151B] border border-amber-800/40 px-2.5 py-1 text-xs text-amber-200"
                  >
                    <span>{p.name}</span>
                    <span className="font-bold text-rose-400">({p.stockQuantity} {p.unit})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: SALES REPORT (របាយការណ៍លក់ចេញ)
      ========================================================================= */}
      {activeReportTab === 'sales' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Sales Report Filter Header */}
          <div className="flex flex-col sm:flex-row gap-3 bg-[#161920] p-4 rounded-2xl border border-[#2D333E] shadow-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                placeholder="ស្វែងរកតាមទំនិញ, លេខវិក្កយបត្រ, អតិថិជន..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[#0F1115] border border-[#2D333E] text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden font-sans"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-medium">វិធីទូទាត់៖</span>
              <select
                value={salesPaymentFilter}
                onChange={(e) => setSalesPaymentFilter(e.target.value as any)}
                className="rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-emerald-500 outline-hidden font-medium"
              >
                <option value="all">ទាំងអស់</option>
                <option value="Cash">សាច់ប្រាក់ (Cash)</option>
                <option value="KHQR">ស្កេន KHQR (Bank)</option>
                <option value="Credit">ជំពាក់ (Credit)</option>
              </select>
            </div>
          </div>

          {/* Sales Transactions Table */}
          <div className="bg-[#161920] rounded-2xl border border-[#2D333E] shadow-lg overflow-hidden">
            <div className="p-4 border-b border-[#2D333E] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                  <span>តារាងប្រតិបត្តិការលក់ចេញលម្អិត</span>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                    {filteredSales.length} វិក្កយបត្រ
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ចំណូលសរុប៖ {formatUSD(totalSalesUSD)} ({formatKHR(totalSalesKHR)}) • ចំណេញសុទ្ធ៖ +{formatUSD(totalProfitUSD)} (+{formatKHR(totalProfitKHR)})
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#12151B] border-b border-[#2D333E] text-slate-400 font-semibold">
                    <th className="py-3 px-4">កាលបរិច្ឆេទ & វិក្កយបត្រ</th>
                    <th className="py-3 px-4">ទំនិញ</th>
                    <th className="py-3 px-4 text-center">បរិមាណ</th>
                    <th className="py-3 px-4 text-right">តម្លៃលក់សរុប ($ & ៛)</th>
                    <th className="py-3 px-4 text-right">ថ្លៃដើម ($ & ៛)</th>
                    <th className="py-3 px-4 text-right">ចំណេញសុទ្ធ ($ & ៛)</th>
                    <th className="py-3 px-4">អតិថិជន & ទូទាត់</th>
                    <th className="py-3 px-4 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D333E]/50 text-slate-300">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-40 text-emerald-400" />
                        <p className="text-xs">មិនមានទិន្នន័យការលក់តាមលក្ខខណ្ឌចម្រោះនេះទេ</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s, index) => {
                      const profitMargin =
                        s.totalSaleUSD > 0
                          ? ((s.profitUSD / s.totalSaleUSD) * 100).toFixed(1)
                          : '0';
                      return (
                        <tr
                          key={`${s.id}-${index}`}
                          className="hover:bg-[#1C212B]/70 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white font-mono">
                              {s.invoiceNo}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {s.saleDate.replace('T', ' ')}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{s.productName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {s.productCode}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-black text-white bg-[#0F1115] px-2.5 py-1 rounded-lg border border-[#2D333E] font-mono">
                              {s.quantity} {s.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-emerald-400 font-mono">
                              {formatUSD(s.totalSaleUSD)}
                            </div>
                            <div className="text-[11px] font-medium text-emerald-300/90 font-mono">
                              {formatKHR(s.totalSaleKHR)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-medium text-slate-400 font-mono">
                              {formatUSD(s.totalCostUSD)}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {formatKHR(s.totalCostKHR)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-blue-400 font-mono">
                              +{formatUSD(s.profitUSD)}
                            </div>
                            <div className="text-[11px] font-bold text-blue-300 font-mono">
                              +{formatKHR(s.profitKHR)}
                            </div>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              ({profitMargin}%)
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-white font-medium">{s.customerName}</div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0F1115] border border-[#2D333E] text-slate-300 font-mono">
                              {s.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReceipt(s);
                                  setAutoPrintReceipt(true);
                                }}
                                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                title="បោះពុម្ពវិក្កយបត្រ (Print)"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReceipt(s);
                                  setAutoPrintReceipt(false);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-500/10 rounded-lg transition-colors cursor-pointer"
                                title="មើលវិក្កយបត្រ (View)"
                              >
                                <Receipt className="h-4 w-4" />
                              </button>
                              {onDeleteSale && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteSale(s.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="លុបការលក់"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PURCHASES REPORT (របាយការណ៍ទិញចូល)
      ========================================================================= */}
      {activeReportTab === 'purchases' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Purchases Search Filter */}
          <div className="bg-[#161920] p-4 rounded-2xl border border-[#2D333E] shadow-lg">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={purchasesSearch}
                onChange={(e) => setPurchasesSearch(e.target.value)}
                placeholder="ស្វែងរកតាមទំនិញ, លេខវិក្កយបត្រទិញ, អ្នកផ្គត់ផ្គង់..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[#0F1115] border border-[#2D333E] text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden font-sans"
              />
            </div>
          </div>

          {/* Purchases Transactions Table */}
          <div className="bg-[#161920] rounded-2xl border border-[#2D333E] shadow-lg overflow-hidden">
            <div className="p-4 border-b border-[#2D333E] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-blue-400" />
                  <span>តារាងប្រតិបត្តិការទិញចូលស្តុកលម្អិត</span>
                  <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-mono">
                    {filteredPurchases.length} កំណត់ត្រា
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  សរុបទិញចូល៖ {formatUSD(totalPurchasesUSD)} ({formatKHR(totalPurchasesKHR)}) • ចំនួនទិញសរុប៖ {totalPurchasedQty.toLocaleString('km-KH')} ឯកតា
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#12151B] border-b border-[#2D333E] text-slate-400 font-semibold">
                    <th className="py-3 px-4">កាលបរិច្ឆេទ & វិក្កយបត្រ</th>
                    <th className="py-3 px-4">ទំនិញ</th>
                    <th className="py-3 px-4 text-center">ចំនួនទិញចូល</th>
                    <th className="py-3 px-4 text-right">តម្លៃឯកតា ($ & ៛)</th>
                    <th className="py-3 px-4 text-right">សរុបទិញ ($ & ៛)</th>
                    <th className="py-3 px-4 text-center">អត្រាប្ដូរប្រាក់</th>
                    <th className="py-3 px-4">អ្នកផ្គត់ផ្គង់</th>
                    <th className="py-3 px-4 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D333E]/50 text-slate-300">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <ArrowDownLeft className="mx-auto h-8 w-8 mb-2 opacity-40 text-blue-400" />
                        <p className="text-xs">មិនមានទិន្នន័យទិញចូលតាមលក្ខខណ្ឌចម្រោះនេះទេ</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((pc, index) => (
                      <tr
                        key={`${pc.id}-${index}`}
                        className="hover:bg-[#1C212B]/70 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white font-mono">
                            {pc.invoiceNo || 'N/A'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {pc.purchaseDate.replace('T', ' ')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{pc.productName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {pc.productCode}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-black text-white bg-[#0F1115] px-2.5 py-1 rounded-lg border border-[#2D333E] font-mono">
                            +{pc.quantity} {pc.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-blue-400 font-mono">
                            {formatUSD(pc.costPriceUSD)}
                          </div>
                          <div className="text-[11px] font-bold text-blue-300 font-mono">
                            {formatKHR(pc.costPriceKHR)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-black text-white font-mono">
                            {formatUSD(pc.totalUSD)}
                          </div>
                          <div className="text-[11px] font-bold text-blue-300 font-mono">
                            {formatKHR(pc.totalKHR)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#12151B] border border-[#2D333E] text-slate-300">
                            1$ = {pc.exchangeRate.toLocaleString('km-KH')} ៛
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                            <span>{pc.supplierName || '---'}</span>
                          </div>
                          {pc.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              {pc.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {onDeletePurchase && (
                            <button
                              type="button"
                              onClick={() => onDeletePurchase(pc.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="លុបការទិញចូល"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PRODUCT PROFITABILITY BREAKDOWN TABLE
      ========================================================================= */}
      {activeReportTab === 'products' && (
        <div className="bg-[#161920] rounded-2xl border border-[#2D333E] shadow-lg overflow-hidden animate-in fade-in duration-150">
          <div className="p-4 border-b border-[#2D333E] flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span>ចំណាត់ថ្នាក់ប្រាក់ចំណេញតាមមុខទំនិញ (Product Profitability)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                បង្ហាញទំនិញដែលរកចំណេញបានច្រើនជាងគេ ផ្អែកលើការលក់ដែលបានចម្រោះ
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#12151B] border-b border-[#2D333E] text-slate-400 font-semibold">
                  <th className="py-3 px-4">ល.រ</th>
                  <th className="py-3 px-4">ទំនិញ</th>
                  <th className="py-3 px-4 text-center">ចំនួនលក់ដាច់</th>
                  <th className="py-3 px-4 text-right">ចំណូលលក់ ($ & ៛)</th>
                  <th className="py-3 px-4 text-right">ថ្លៃដើម ($ & ៛)</th>
                  <th className="py-3 px-4 text-right">ប្រាក់ចំណេញសុទ្ធ ($ & ៛)</th>
                  <th className="py-3 px-4 text-center">អត្រាចំណេញ (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D333E]/50 text-slate-300">
                {productProfitList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      មិនទាន់មានទិន្នន័យលក់សម្រាប់គណនាប្រាក់ចំណេញតាមមុខទំនិញនៅឡើយទេ
                    </td>
                  </tr>
                ) : (
                  productProfitList.map((item, idx) => {
                    const margin =
                      item.totalRevenueUSD > 0
                        ? ((item.profitUSD / item.totalRevenueUSD) * 100).toFixed(1)
                        : '0';
                    return (
                      <tr key={item.productCode} className="hover:bg-[#1C212B]/70">
                        <td className="py-3 px-4 font-bold text-slate-500">#{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{item.productName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.productCode}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-white font-mono">
                            {item.quantitySold} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-emerald-400 font-mono">
                            {formatUSD(item.totalRevenueUSD)}
                          </div>
                          <div className="text-[11px] text-emerald-300/80 font-mono">
                            {formatKHR(item.totalRevenueKHR)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-slate-400 font-mono">
                            {formatUSD(item.totalCostUSD)}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {formatKHR(item.totalCostKHR)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-black text-blue-400 font-mono">
                            +{formatUSD(item.profitUSD)}
                          </div>
                          <div className="text-[11px] font-bold text-blue-300 font-mono">
                            +{formatKHR(item.profitKHR)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptModal
        sale={selectedReceipt}
        onClose={() => {
          setSelectedReceipt(null);
          setAutoPrintReceipt(false);
        }}
        autoPrint={autoPrintReceipt}
      />
    </div>
  );
};
