import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownLeft,
  Search,
  Plus,
  Trash2,
  Calendar,
  Building2,
  DollarSign,
  Package,
  Receipt,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Filter,
  X,
  Image as ImageIcon,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { Product, SaleItem, ExchangeRateConfig } from '../types';
import { formatUSD, formatKHR, convertUSDtoKHR, convertKHRtoUSD } from '../services/storage';
import { ProductThumbnail } from './ProductThumbnail';

interface SalesPageProps {
  products: Product[];
  sales: SaleItem[];
  exchangeRate: ExchangeRateConfig;
  onAddSale: (sale: Omit<SaleItem, 'id' | 'createdAt'>) => void;
  onDeleteSale: (saleId: string) => void;
  onNavigateToReports?: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  products,
  sales,
  exchangeRate,
  onAddSale,
  onDeleteSale,
  onNavigateToReports,
}) => {
  // Filter states:
  // ១. ដោយ id (យកពីជួរ B:B)
  // ២. ដោយប្រភេទ (យកពីជួរ A:A)
  const [filterTab, setFilterTab] = useState<'id' | 'category'>('category');
  const [selectedId, setSelectedId] = useState('ទាំងអស់ (All)');
  const [selectedCategory, setSelectedCategory] = useState('ទាំងអស់ (All)');
  const [showFilters, setShowFilters] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Form states for active sale
  const [selectedProductId, setSelectedProductId] = useState('');
  const [activeInput, setActiveInput] = useState<'quantity' | 'unitCostUSD' | 'unitCostKHR' | null>('quantity');
  const [quantity, setQuantity] = useState('10');
  const [unitCostUSD, setUnitCostUSD] = useState('');
  const [unitCostKHR, setUnitCostKHR] = useState('');
  const [customRate, setCustomRate] = useState((exchangeRate.buyRate || 4043).toString());
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(`PO-${Date.now().toString().slice(-6)}`);
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Unique id labels extracted strictly from Column B:B of products (Google Sheet) - sorted ascending (small to large / A-Z)
  const uniqueIds: string[] = Array.from<string>(
    new Set<string>(
      products
        .map((p) => p.code?.trim())
        .filter((c): c is string => Boolean(c && c !== '' && c !== 'ទាំងអស់ (All)'))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  // Unique ផ្នែក (# Part) extracted strictly from Column E:E of products (Google Sheet) - sorted ascending
  const uniqueCategories: string[] = Array.from<string>(
    new Set<string>(
      products
        .map((p) => p.category?.trim())
        .filter((c): c is string => Boolean(c && c !== '' && c !== 'ទាំងអស់ (All)'))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  // Initialize selected product on mount or when products change
  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      const first = products[0];
      setSelectedProductId(first.id);
      setUnitCostUSD(first.costPriceUSD.toString());
      setUnitCostKHR(first.costPriceKHR.toString());
    }
  }, [products, selectedProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    setFormError(null);
    setProductSearch('');
    setSelectedCategory('ទាំងអស់ (All)');
    setSelectedId('ទាំងអស់ (All)');
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      const activeRate = parseFloat(customRate) || exchangeRate.buyRate || 4043;
      setUnitCostUSD(prod.costPriceUSD.toString());
      setUnitCostKHR(
        (prod.costPriceKHR || convertUSDtoKHR(prod.costPriceUSD, activeRate)).toString()
      );
    }
  };

  const handleNumpadClick = (val: string) => {
    if (!activeInput) return;

    const updateValue = (currentVal: string) => {
      if (val === 'clear') return '';
      if (val === 'delete') return currentVal.slice(0, -1);
      if (val === '.' && currentVal.includes('.')) return currentVal;
      return currentVal + val;
    };

    if (activeInput === 'quantity') {
      setQuantity(prev => updateValue(prev));
    } else if (activeInput === 'unitCostUSD') {
      const newVal = updateValue(unitCostUSD);
      handleCostUSDChange(newVal);
    } else if (activeInput === 'unitCostKHR') {
      const newVal = updateValue(unitCostKHR);
      handleCostKHRChange(newVal);
    }
  };

  const handleCostUSDChange = (val: string) => {
    setUnitCostUSD(val);
    const num = parseFloat(val);
    const rate = parseFloat(customRate) || exchangeRate.buyRate || 4043;
    if (!isNaN(num) && num >= 0) {
      // ពេលទិញ៖ គុណនឹងអត្រាទិញ
      setUnitCostKHR(convertUSDtoKHR(num, rate).toString());
    } else {
      setUnitCostKHR('');
    }
  };

  const handleCostKHRChange = (val: string) => {
    setUnitCostKHR(val);
    const num = parseFloat(val);
    const rate = parseFloat(customRate) || exchangeRate.buyRate || 4043;
    if (!isNaN(num) && num >= 0) {
      setUnitCostUSD(convertKHRtoUSD(num, rate).toString());
    } else {
      setUnitCostUSD('');
    }
  };

  const handleRateChange = (val: string) => {
    setCustomRate(val);
    const rateNum = parseFloat(val);
    const usdNum = parseFloat(unitCostUSD);
    if (!isNaN(rateNum) && rateNum > 0 && !isNaN(usdNum)) {
      setUnitCostKHR(convertUSDtoKHR(usdNum, rateNum).toString());
    }
  };

  // Live calculations
  const currentRate = parseFloat(customRate) || exchangeRate.buyRate || 4043;


  const qtyNum = parseFloat(quantity) || 0;
  const saleUSDNum = parseFloat(unitCostUSD) || 0;
  const saleKHRNum = parseFloat(unitCostKHR) || 0;

  const totalSaleUSD = saleUSDNum * qtyNum;
  const totalSaleKHR = saleKHRNum * qtyNum;
  
  const costUSDNum = selectedProduct ? selectedProduct.costPriceUSD : 0;
  const costKHRNum = selectedProduct ? (selectedProduct.costPriceKHR || costUSDNum * currentRate) : 0;
  const totalCostUSD = costUSDNum * qtyNum;
  const totalCostKHR = costKHRNum * qtyNum;
  const profitUSD = totalSaleUSD - totalCostUSD;
  const profitKHR = totalSaleKHR - totalCostKHR;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!selectedProduct) {
      setFormError('សូមជ្រើសរើសទំនិញដែលត្រូវលក់');
      return;
    }

    if (qtyNum <= 0) {
      setFormError('ចំនួនលក់ត្រូវតែធំជាង ០');
      return;
    }

    if (saleKHRNum <= 0 && saleUSDNum <= 0) {
      setFormError('តម្លៃលក់ជាប្រាក់រៀល ឬដុល្លារត្រូវតែធំជាង ០');
      return;
    }

    // @ts-ignore
    onAddSale({
      saleDate,
      productId: selectedProduct.id,
      productCode: selectedProduct.code,
      productName: selectedProduct.name,
      category: selectedProduct.category,
      imageUrl: selectedProduct.imageUrl,
      unit: selectedProduct.unit,
      quantity: qtyNum,
      salePriceUSD: saleUSDNum,
      salePriceKHR: saleKHRNum,
      costPriceUSD: costUSDNum,
      costPriceKHR: costKHRNum,
      totalSaleUSD,
      totalSaleKHR,
      totalCostUSD,
      totalCostKHR,
      profitUSD,
      profitKHR,
      exchangeRate: currentRate,
      customerName: supplierName.trim(),
      paymentMethod: 'Cash',
      invoiceNo: invoiceNo.trim(),
      notes: notes.trim(),
    });


    setSuccessMessage(
      `បានកត់ត្រាលក់ចេញ "${selectedProduct.name}" ចំនួន +${qtyNum} ${selectedProduct.unit} ដោយជោគជ័យ!`
    );

    // Reset invoice and quantity for next sale
    setInvoiceNo(`PO-${Date.now().toString().slice(-6)}`);
    setQuantity('10');
    setNotes('');

    // Clear success message after 4 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Today's sales
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((p) => p.saleDate.startsWith(todayStr));
  const todayTotalUSD = todaySales.reduce((sum, p) => sum + p.totalUSD, 0);
  const todayTotalKHR = todaySales.reduce((sum, p) => sum + p.totalKHR, 0);
  const todayTotalQty = todaySales.reduce((sum, p) => sum + p.quantity, 0);

  const handleSwitchTab = (tab: 'id' | 'category') => {
    setFilterTab(tab);
    if (tab === 'id') {
      setSelectedCategory('ទាំងអស់ (All)');
    } else {
      setSelectedId('ទាំងអស់ (All)');
    }
  };

  const handleSelectId = (idVal: string) => {
    if (selectedId === idVal || idVal === 'ទាំងអស់ (All)') {
      setSelectedId('ទាំងអស់ (All)');
    } else {
      setSelectedId(idVal);
    }
  };

  const handleSelectCategory = (catVal: string) => {
    if (selectedCategory === catVal || catVal === 'ទាំងអស់ (All)') {
      setSelectedCategory('ទាំងអស់ (All)');
      setSelectedId('ទាំងអស់ (All)');
    } else {
      setSelectedCategory(catVal);
      setSelectedId('ទាំងអស់ (All)');
    }
  };

  // Unique IDs derived from products in the selected category (from Column B:B) - sorted ascending (small to large / A-Z)
  const categoryIds: string[] = Array.from<string>(
    new Set<string>(
      products
        .filter(
          (p) =>
            selectedCategory === 'ទាំងអស់ (All)' ||
            (p.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
        )
        .map((p) => p.code?.trim())
        .filter((code): code is string => Boolean(code && code !== '' && code !== 'ទាំងអស់ (All)'))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const categoryProductsCount = products.filter(
    (p) =>
      selectedCategory === 'ទាំងអស់ (All)' ||
      (p.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
  ).length;

  // Filter products by Search, and active filterTab (id ពីជួរ B:B ឬ ប្រភេទ ពីជួរ A:A)
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      productSearch === '' ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ទាំងអស់ (All)' ||
      (p.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase();

    const matchesId =
      selectedId === 'ទាំងអស់ (All)' ||
      (p.code || '').trim().toLowerCase() === selectedId.trim().toLowerCase();

    return matchesSearch && matchesCategory && matchesId;
  });

  // បញ្ជីបង្ហាញទំនិញ៖ លាតឲ្យអស់ (កំពស់) តាមចំនួនជាក់ស្ដែង ក្រោយចុចរើសរួច លាក់
  const productsToDisplay = filteredProducts;

  const shouldShowProducts =
    selectedCategory !== 'ទាំងអស់ (All)' || selectedId !== 'ទាំងអស់ (All)' || productSearch !== '';

  const topSellingProducts = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const statsMap = new Map<
      string,
      { productId: string; productCode: string; productName: string; imageUrl?: string; totalSold: number }
    >();

    sales.forEach(s => {
      const existing = statsMap.get(s.productId);
      if (existing) {
        existing.totalSold += s.quantity;
      } else {
        statsMap.set(s.productId, {
          productId: s.productId,
          productCode: s.productCode,
          productName: s.productName,
          imageUrl: s.imageUrl,
          totalSold: s.quantity,
        });
      }
    });

    const sorted = Array.from(statsMap.values()).sort((a, b) => b.totalSold - a.totalSold);
    return sorted.slice(0, 15).map(item => {
      const liveProd = products.find(p => p.id === item.productId);
      return {
        ...item,
        imageUrl: liveProd?.imageUrl || item.imageUrl,
      };
    });
  }, [sales, products]);

  return (
    <div className="space-y-3">
      {/* Today Quick Stats Bar - Compact Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-[#2D333E] bg-[#161920] px-3 py-2 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">លក់ចេញថ្ងៃនេះ ($)</span>
            <div className="text-base sm:text-lg font-bold text-blue-400 font-mono leading-tight">
              {formatUSD(todayTotalUSD)}
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono bg-[#0F1115] px-2 py-0.5 rounded-md border border-[#2D333E]">
            {todaySales.length} កំណត់ត្រា
          </span>
        </div>

        <div className="rounded-xl border border-[#2D333E] bg-[#161920] px-3 py-2 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-400 font-medium">លក់ចេញថ្ងៃនេះ (៛)</span>
            <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono leading-tight">
              {formatKHR(todayTotalKHR)}
            </div>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {currentRate} ៛/$
          </span>
        </div>

        <div className="rounded-xl border border-[#2D333E] bg-[#161920] px-3 py-2 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">បរិមាណចូលថ្ងៃនេះ</span>
            <div className="text-base sm:text-lg font-bold text-white font-mono leading-tight">
              +{todayTotalQty.toLocaleString('km-KH')}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 bg-[#0F1115] px-2 py-0.5 rounded-md border border-[#2D333E]">
            ឯកតាស្តុក
          </span>
        </div>
      </div>

      {/* ផ្ទាំងតម្រង & ស្វែងរក (បង្រួមក្នុង 1 ប្លុកតែមួយ មិនឱ្យបែកជួរច្រើនជួរដេក) */}
      <div className="flex flex-col gap-2 bg-[#12151B] p-2.5 rounded-xl border border-[#2D333E] shadow-xs">
        {/* ជួរទី ១: ស្វែងរកទំនិញ + ប៊ូតុងបើក/លាក់តម្រង + តម្រងសកម្ម */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              id="search-sale-products"
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខកូដទំនិញ (id)..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-[#161920] border border-[#2D333E] text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden font-sans"
            />
            {productSearch && (
              <button
                type="button"
                onClick={() => setProductSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* ប៊ូតុង បើក/លាក់តម្រងប្រភេទ និង id (លាក់សិនបើមិនទាន់ប្រើ) */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
              showFilters || selectedCategory !== 'ទាំងអស់ (All)' || selectedId !== 'ទាំងអស់ (All)'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-[#161920] text-slate-300 hover:text-white hover:bg-[#1f242e] border border-[#2D333E]'
            }`}
            title="ចុចដើម្បីបង្ហាញ ឬលាក់តម្រងប្រភេទ និង id"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>តម្រង</span>
            {(selectedCategory !== 'ទាំងអស់ (All)' || selectedId !== 'ទាំងអស់ (All)') && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white text-blue-600 font-bold">
                {(selectedCategory !== 'ទាំងអស់ (All)' ? 1 : 0) + (selectedId !== 'ទាំងអស់ (All)' ? 1 : 0)}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Active filter badges inline */}
          {(selectedCategory !== 'ទាំងអស់ (All)' ||
            selectedId !== 'ទាំងអស់ (All)' ||
            productSearch) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {selectedCategory !== 'ទាំងអស់ (All)' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  <span>{selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => handleSelectCategory('ទាំងអស់ (All)')}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {selectedId !== 'ទាំងអស់ (All)' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <span>{selectedId}</span>
                  <button
                    type="button"
                    onClick={() => handleSelectId('ទាំងអស់ (All)')}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedId('ទាំងអស់ (All)');
                  setSelectedCategory('ទាំងអស់ (All)');
                  setProductSearch('');
                }}
                className="text-rose-400 hover:underline px-1 cursor-pointer whitespace-nowrap"
              >
                សម្អាត
              </button>
            </div>
          )}

          <div className="text-[11px] text-slate-400 font-medium ml-auto shrink-0">
            រកឃើញ៖ <span className="text-white font-mono font-bold">{filteredProducts.length}</span> / {products.length} មុខ
          </div>
        </div>

        {/* ផ្ទាំងតម្រង ប្រភេទ និង id (លាក់សិន បើមិនទាន់ប្រើ) */}
        {showFilters && (
          <div className="space-y-2 pt-1 border-t border-[#2D333E]/60 animate-in fade-in duration-200">
            {/* ជួរ ប្រភេទ (យកពីជួរ A:A) */}
            <div className="flex items-start gap-2">
              <div className="flex items-center text-blue-400 shrink-0 pt-1.5" title="ប្រភេទ">
                <Filter className="h-3.5 w-3.5" />
              </div>
              <div className="grid grid-rows-4 grid-flow-col auto-cols-max gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleSelectCategory('ទាំងអស់ (All)')}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCategory === 'ទាំងអស់ (All)'
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'bg-[#161920] text-slate-300 hover:text-white hover:bg-[#1f242e] border border-[#2D333E]'
                  }`}
                >
                  <span>ទាំងអស់</span>
                  <span className={`text-[10px] px-1 py-0.1 rounded-full font-mono ${selectedCategory === 'ទាំងអស់ (All)' ? 'bg-blue-700 text-blue-100' : 'bg-[#0F1115] text-slate-400'}`}>
                    {products.length}
                  </span>
                </button>
                {uniqueCategories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const count = products.filter((p) => (p.category || '').trim().toLowerCase() === cat.trim().toLowerCase()).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'bg-[#161920] text-slate-300 hover:text-white hover:bg-[#1f242e] border border-[#2D333E]'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1 py-0.1 rounded-full font-mono ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-[#0F1115] text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ជួរ id៖ ៣ ជួរដេក រំកិលផ្ដេក (Scroll) */}
            <div className="flex items-start gap-2 pt-1 border-t border-[#2D333E]/40">
              <div className="flex items-center text-amber-400 shrink-0 pt-1.5" title="id">
                <Tag className="h-3.5 w-3.5" />
              </div>
              <div className="grid grid-rows-3 grid-flow-col auto-cols-max gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleSelectId('ទាំងអស់ (All)')}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedId === 'ទាំងអស់ (All)'
                      ? 'bg-amber-600 text-white shadow-xs font-semibold'
                      : 'bg-[#161920] text-slate-300 hover:text-white hover:bg-[#1f242e] border border-[#2D333E]'
                  }`}
                >
                  <span>ទាំងអស់</span>
                  <span className={`text-[10px] px-1 py-0.1 rounded-full font-mono ${selectedId === 'ទាំងអស់ (All)' ? 'bg-amber-700 text-amber-100' : 'bg-[#0F1115] text-slate-400'}`}>
                    {categoryProductsCount}
                  </span>
                </button>
                {categoryIds.map((idVal) => {
                  const isSelected = selectedId === idVal;
                  const count = products.filter(
                    (p) =>
                      (p.code || '').trim().toLowerCase() === idVal.trim().toLowerCase() &&
                      (selectedCategory === 'ទាំងអស់ (All)' ||
                        (p.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase())
                  ).length;
                  return (
                    <button
                      key={idVal}
                      type="button"
                      onClick={() => handleSelectId(idVal)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs font-semibold'
                          : 'bg-[#161920] text-slate-300 hover:text-white hover:bg-[#1f242e] border border-[#2D333E]'
                      }`}
                    >
                      <span>{idVal}</span>
                      <span className={`text-[10px] px-1 py-0.1 rounded-full font-mono ${isSelected ? 'bg-amber-700 text-amber-100' : 'bg-[#0F1115] text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* បញ្ជីទំនិញ (យកតែ រូបភាព, ទំនិញ, តម្លៃលក់ចេញរៀល) */}
      {shouldShowProducts && productsToDisplay.length > 0 && (
        <div className="bg-[#161920] rounded-xl border border-[#2D333E] shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#12151B] border-b border-[#2D333E]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400"></span>
              <span className="text-xs font-bold text-white">
                បញ្ជីទំនិញ ({productsToDisplay.length} មុខ)
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                • ចុចលើជួរទំនិញដើម្បីកត់ត្រាលក់ចេញ
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="">
                <tr className="bg-[#12151B] border-b border-[#2D333E] text-slate-400 font-semibold shadow-xs">
                  {/* ១. រូបភាព (image J:J) */}
                  <th className="sticky left-0 z-10 bg-[#12151B] py-2.5 px-3 text-center w-14 min-w-[56px] border-r border-[#2D333E]">
                    រូបភាព
                  </th>
                  {/* ២. ទំនិញ (productname C:C) */}
                  <th className="py-2.5 px-3.5">
                    ទំនិញ
                  </th>
                  {/* ៣. តម្លៃលក់ចេញរៀល (buypriceR G:G) */}
                  <th className="py-2.5 px-3.5 text-right w-40 min-w-[140px]">
                    តម្លៃលក់ចេញរៀល
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D333E]/50 text-slate-300">
                {productsToDisplay.map((p) => {
                  const isSelected = p.id === selectedProductId;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleProductSelect(p.id)}
                      className={`hover:bg-[#1C212B]/80 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-blue-600/15 ring-1 ring-inset ring-blue-500/50' : ''
                      }`}
                    >
                      {/* ១. រូបភាព */}
                      <td className={`sticky left-0 z-10 py-2 px-3 text-center border-r border-[#2D333E]/50 ${
                        isSelected ? 'bg-[#182030]' : 'bg-[#161920] group-hover:bg-[#1C212B]'
                      }`}>
                        <ProductThumbnail
                          src={p.imageUrl}
                          alt={p.name}
                          fallbackText={p.code}
                          size="sm"
                          className="mx-auto"
                        />
                      </td>

                      {/* ២. ទំនិញ */}
                      <td className="py-2.5 px-3.5">
                        <div className={`font-semibold ${isSelected ? 'text-blue-300 font-bold' : 'text-white'}`}>
                          {p.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            ID: {p.code}
                          </span>
                          {p.category && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              {p.category}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/20 px-1.5 py-0.2 rounded border border-blue-500/40">
                              ✓ កំពុងរើស
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ៣. តម្លៃលក់ចេញរៀល */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {formatKHR(p.costPriceKHR)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRIMARY PURCHASING WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT / CENTER: The Active Purchasing Form */}
        <div className="lg:col-span-7 bg-[#161920] rounded-xl border border-[#2D333E] shadow-sm p-3.5 sm:p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#2D333E] mb-3.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-white">
                ទម្រង់កត់ត្រាលក់ចេញ
              </h3>
            </div>
          </div>

          {formError && (
            <div className="mb-4 rounded-xl border border-rose-900/50 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selected Product Visual Card (ជ្រើសរើសដោយចុចលើតារាង ឬ Filter ខាងលើ) */}
            {selectedProduct ? (
              <div className="p-3.5 rounded-2xl bg-[#0F1115] border border-[#2D333E] flex items-center justify-between gap-3.5 shadow-inner">
                <div className="flex items-center gap-3.5 min-w-0">
                  <ProductThumbnail
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    fallbackText={selectedProduct.code}
                    size="lg"
                    className="border border-[#2D333E] shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-white truncate">
                        {selectedProduct.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                        ID: {selectedProduct.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px]">
                        {selectedProduct.category}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-slate-400">
                        ស្តុកបច្ចុប្បន្ន៖{' '}
                        <span className={`font-mono font-bold ${
                          selectedProduct.stockQuantity <= selectedProduct.minStockAlert
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}>
                          {selectedProduct.stockQuantity} {selectedProduct.unit}
                        </span>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">
                        តម្លៃលក់៖{' '}
                        <span className="font-mono font-bold text-emerald-300">
                          {formatUSD(selectedProduct.salePriceUSD)} ({formatKHR(selectedProduct.salePriceKHR)})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0F1115] border border-dashed border-[#2D333E] text-center text-xs text-slate-400">
                សូមចុចជ្រើសរើសទំនិញពីតារាងខាងលើ
              </div>
            )}

            {/* HORIZONTAL NUMPAD */}
            <div className="mb-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '000', '.', 'clear', 'delete'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleNumpadClick(key)}
                    className="px-3.5 py-1.5 rounded-lg text-sm font-bold font-mono bg-[#0F1115] hover:bg-blue-600 hover:text-white text-slate-300 border border-[#2D333E] shrink-0 active:scale-95 transition-all shadow-sm flex items-center justify-center min-w-[40px]"
                  >
                    {key === 'clear' ? 'C' : key === 'delete' ? '⌫' : key}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1: Quantity */}
            <div>
              <div className="mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  ១. ចំនួនលក់ចេញ <span className="text-rose-400">*</span>
                </label>
              </div>
              <div className={`flex rounded-xl overflow-hidden border ${activeInput === 'quantity' ? 'border-blue-500' : 'border-[#2D333E]'} bg-[#0F1115] transition-colors`}>
                <input
                  id="input-sale-quantity"
                  onFocus={() => setActiveInput('quantity')}
                  type="number"
                  step="any"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="ឧ. 10"
                  className="flex-1 bg-transparent text-white px-3.5 py-2.5 text-sm font-bold font-mono outline-hidden"
                  required
                />
                <span className="bg-[#1C212B] px-3.5 py-2.5 text-xs text-slate-300 border-l border-[#2D333E] flex items-center font-medium">
                  {selectedProduct?.unit || 'ឯកតា'}
                </span>
              </div>
            </div>

            {/* Step 2: Unit Cost in USD & KHR (Always present) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ២. តម្លៃលក់ចេញ ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">
                    $
                  </span>
                  <input
                    id="input-sale-cost-usd"
                    onFocus={() => setActiveInput('unitCostUSD')}
                    type="number"
                    step="any"
                    value={unitCostUSD}
                    onChange={(e) => handleCostUSDChange(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-7 pr-3 py-2.5 rounded-xl border ${activeInput === 'unitCostUSD' ? 'border-blue-500' : 'border-[#2D333E]'} bg-[#0F1115] text-white text-xs font-bold font-mono outline-hidden transition-colors`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">
                  តម្លៃលក់ចេញ (៛) *ជានិច្ច
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-bold">
                    ៛
                  </span>
                  <input
                    id="input-sale-cost-khr"
                    onFocus={() => setActiveInput('unitCostKHR')}
                    type="number"
                    step="1"
                    value={unitCostKHR}
                    onChange={(e) => handleCostKHRChange(e.target.value)}
                    placeholder="0"
                    className={`w-full pl-7 pr-3 py-2.5 rounded-xl border ${activeInput === 'unitCostKHR' ? 'border-emerald-500' : 'border-emerald-500/40'} bg-[#0F1115] text-emerald-400 text-xs font-bold font-mono outline-hidden transition-colors`}
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Live Total Calculation Box */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-blue-300">
                  សរុបចំណូលលក់ចេញ ({qtyNum} {selectedProduct?.unit || 'ឯកតា'})៖
                </span>
                <div className="text-right">
                  <div className="text-xl font-black text-blue-400 font-mono">
                    {formatUSD(totalCostUSD)}
                  </div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">
                    {formatKHR(totalCostKHR)}
                  </div>
                </div>
              </div>

              {selectedProduct && (
                <div className="pt-2 border-t border-blue-500/20 flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">ប្រាក់ចំណេញរំពឹងទុកពេលលក់ចេញ៖</span>
                  <span
                    className={`font-bold font-mono ${
                      (selectedProduct ? selectedProduct.salePriceUSD - costUSDNum : 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(selectedProduct ? selectedProduct.salePriceUSD - costUSDNum : 0) >= 0 ? '+' : ''}
                    {formatUSD((selectedProduct ? selectedProduct.salePriceUSD - costUSDNum : 0))} / ឯកតា ({(selectedProduct ? selectedProduct.salePriceKHR - costKHRNum : 0).toLocaleString('km-KH')}៛)
                  </span>
                </div>
              )}
            </div>

            {/* Step 5: Supplier & Invoice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  អតិថិជន (Customer)
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="ឈ្មោះក្រុមហ៊ុន ឬអ្នកលក់ដុំ..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#2D333E] bg-[#0F1115] text-white focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  លេខវិក្កយបត្រ / PO #
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="PO-0001"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#2D333E] bg-[#0F1115] text-white font-mono focus:border-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Sale Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  កាលបរិច្ឆេទ & ម៉ោងលក់ចេញ
                </label>
                <input
                  type="datetime-local"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#2D333E] bg-[#0F1115] text-white focus:border-blue-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  អត្រាប្ដូរប្រាក់ (លក់ចេញ)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={customRate}
                    onChange={(e) => handleRateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#2D333E] bg-[#0F1115] text-white font-mono focus:border-blue-500 outline-hidden"
                  />
                  <span className="text-xs text-slate-400 shrink-0">៛/$</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ចំណាំបន្ថែម (ស្រេចចិត្ត)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ឧ. បង់ប្រាក់រួច, ដឹកជញ្ជូនឥតគិតថ្លៃ..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#2D333E] bg-[#0F1115] text-white focus:border-blue-500 outline-hidden"
              />
            </div>

            {/* Action Submit Button */}
            <button
              id="btn-confirm-stock-in"
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-950/50 hover:bg-blue-500 active:bg-blue-700 transition-all cursor-pointer"
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>កត់ត្រាលក់ចេញ (+ Confirm Sale)</span>
            </button>
          </form>
        </div>

        {/* RIGHT SIDE: Top 10 Frequent Sales (ការទិញញឹកញាប់) */}
        {/* RIGHT: Top 15 Best Selling Products (ទំនិញលក់ដាច់ជាងគេទាំង១៥) */}
        <div className="lg:col-span-5 bg-[#161920] rounded-xl border border-[#2D333E] shadow-sm p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#2D333E]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>ទំនិញលក់ដាច់ជាងគេ</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    កំពូលទាំង ១៥
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  បង្ហាញពីរូបភាពទំនិញដែលលក់ដាច់បំផុត
                </p>
              </div>
            </div>
          </div>

          {topSellingProducts.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-500 text-xs rounded-xl bg-[#0F1115] border border-dashed border-[#2D333E]">
              <Package className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-slate-400">មិនទាន់មានប្រវត្តិនៃការលក់ទេ</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                ប្រព័ន្ធនឹងចាត់ចំណាត់ថ្នាក់ទំនិញលក់ដាច់ជាងគេទាំង ១៥ នៅទីនេះ។
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {topSellingProducts.map((item, idx) => {
                const rankStyles = [
                  'bg-amber-500 text-slate-950', // #1 Gold
                  'bg-slate-300 text-slate-900', // #2 Silver
                  'bg-amber-700 text-white', // #3 Bronze
                ];
                
                return (
                  <div
                    key={item.productId || `${item.productCode}-${idx}`}
                    className="relative rounded-xl border border-[#2D333E] bg-[#0F1115] hover:border-slate-500 transition-all overflow-hidden aspect-square cursor-pointer"
                    title={item.productName}
                  >
                    {/* Rank Badge absolute positioned */}
                    <div
                      className={`absolute top-0 left-0 w-6 h-6 rounded-br-xl flex items-center justify-center font-mono font-bold text-[10px] shadow-sm z-10 ${
                        rankStyles[idx] || 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Thumbnail filling the whole box */}
                    <ProductThumbnail
                      src={item.imageUrl}
                      alt={item.productName}
                      fallbackText={item.productCode}
                      className="!w-full !h-full !min-w-0 !min-h-0 !rounded-none border-none"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
