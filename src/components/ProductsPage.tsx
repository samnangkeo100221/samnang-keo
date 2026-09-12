import React, { useState } from 'react';
import {
  Plus,
  Search,
  Mic,
  Edit2,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle2,
  X,
  Filter,
  DollarSign,
  Boxes,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Tag,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  RefreshCw,
  ArrowLeftRight,
  Pin,
} from 'lucide-react';
import { Product, ExchangeRateConfig } from '../types';
import { formatUSD, formatKHR, convertUSDtoKHR, convertKHRtoUSD } from '../services/storage';
import { ProductThumbnail } from './ProductThumbnail';

interface ProductsPageProps {
  products: Product[];
  exchangeRate: ExchangeRateConfig;
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onSyncFromSheet?: () => void;
  isSyncing?: boolean;
}

const COMMON_CATEGORIES = [
  'ទាំងអស់ (All)',
  'ទឹកដោះ',
  'ភេសជ្ជៈ',
  'សាប៊ូ',
  'គ្រឿងទេស',
  'មី',
  'ត្រីខ',
  'ស្រា',
  'ទូទៅ',
];

const COMMON_PARTS = [
  '0',
  '2',
  '4',
  '6',
  '8',
  '12',
  '24',
  '30',
  '40',
  '42',
  '45',
  '60',
];

const PRESET_IMAGES = [
  { name: 'គោជល់', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80' },
  { name: 'ទឹកបរិសុទ្ធ', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop&q=80' },
  { name: 'កាហ្វេ', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&auto=format&fit=crop&q=80' },
  { name: 'មីកញ្ចប់', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&auto=format&fit=crop&q=80' },
  { name: 'ប្រេងឆា', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80' },
  { name: 'កូកា', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80' },
];

const COMMON_UNITS = [
  'កំប៉ុង',
  'ដប',
  'កេស',
  'កញ្ចប់',
  'គីឡូ (kg)',
  'ប្រអប់',
  'ដើម',
  'បន្ទះ',
  'គ្រាប់',
];

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  exchangeRate,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onSyncFromSheet,
  isSyncing,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'id' | 'category'>('category');
  const [selectedCategory, setSelectedCategory] = useState('ទាំងអស់ (All)');
  const [selectedId, setSelectedId] = useState('ទាំងអស់ (All)');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isListening, setIsListening] = useState(false);

  const startVoiceSearch = () => {
    if (isListening) return;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រមុខងារស្វែងរកដោយសំឡេងទេ (Web Speech API)។ សូមសាកល្បងជាមួយ Chrome ឬ Edge។");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'km-KH'; 
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript.replace(/\.$/, '')); // Remove trailing dot if exists
      }
    };
    recognition.onerror = (event: any) => {
      console.error("Voice search error:", event.error);
      if (event.error === 'not-allowed') {
        alert("សូមអនុញ្ញាត (Allow) ការប្រើប្រាស់មីក្រូហ្វូន ដើម្បីអាចស្វែងរកដោយសំឡេងបាន។");
      }
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ទូទៅ');
  const [part, setPart] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [unit, setUnit] = useState('1');
  const [costPriceUSD, setCostPriceUSD] = useState('');
  const [costPriceKHR, setCostPriceKHR] = useState('');
  const [salePriceUSD, setSalePriceUSD] = useState('');
  const [salePriceKHR, setSalePriceKHR] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Unique id labels extracted strictly from Column B:B of products (Google Sheet) - sorted ascending (small to large / A-Z)
  const uniqueIds: string[] = Array.from<string>(
    new Set<string>(
      products
        .map((p) => p.code?.trim())
        .filter((code): code is string => Boolean(code && code !== '' && code !== 'ទាំងអស់ (All)'))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  // Unique ប្រភេទ extracted strictly from Column A:A of products (Google Sheet) - sorted ascending
  const uniqueCategories: string[] = Array.from<string>(
    new Set<string>(
      products
        .map((p) => (p.category !== undefined && p.category !== null ? String(p.category).trim() : ''))
        .filter((c): c is string => Boolean(c && c !== '' && c !== 'ទាំងអស់ (All)'))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const openCreateModal = () => {
    setEditingProduct(null);
    setCode(`SKU-${String(products.length + 1).padStart(3, '0')}`);
    setName('');
    setCategory('ទូទៅ');
    setPart('0');
    setImageUrl('');
    setUnit('1');
    setCostPriceUSD('');
    setCostPriceKHR('');
    setSalePriceUSD('');
    setSalePriceKHR('');
    setStockQuantity('10');
    setMinStockAlert('5');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category || 'ទូទៅ');
    setPart(p.part || '0');
    setImageUrl(p.imageUrl || '');
    setUnit(p.unit);
    setCostPriceUSD(p.costPriceUSD.toString());
    setCostPriceKHR(p.costPriceKHR.toString());
    setSalePriceUSD(p.salePriceUSD.toString());
    setSalePriceKHR(p.salePriceKHR.toString());
    setStockQuantity(p.stockQuantity.toString());
    setMinStockAlert(p.minStockAlert.toString());
    setNotes(p.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Current exchange rates: Buy Rate for Cost, Sell Rate for Sales
  const buyRate = exchangeRate.buyRate || exchangeRate.rate;
  const sellRate = exchangeRate.sellRate || exchangeRate.rate;

  // Handlers for dynamic USD & KHR conversions
  const handleCostUSDChange = (val: string) => {
    setCostPriceUSD(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      // ពេលទិញ៖ តម្លៃដុល្លារគុណនឹងអត្រាទិញ
      setCostPriceKHR(convertUSDtoKHR(num, buyRate).toString());
    } else {
      setCostPriceKHR('');
    }
  };

  const handleCostKHRChange = (val: string) => {
    setCostPriceKHR(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setCostPriceUSD(convertKHRtoUSD(num, buyRate).toString());
    } else {
      setCostPriceUSD('');
    }
  };

  const handleSaleUSDChange = (val: string) => {
    setSalePriceUSD(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      // ពេលលក់៖ តម្លៃដុល្លារគុណនឹងអត្រាលក់
      setSalePriceKHR(convertUSDtoKHR(num, sellRate).toString());
    } else {
      setSalePriceKHR('');
    }
  };

  const handleSaleKHRChange = (val: string) => {
    setSalePriceKHR(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setSalePriceUSD(convertKHRtoUSD(num, sellRate).toString());
    } else {
      setSalePriceUSD('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('សូមបញ្ចូលឈ្មោះទំនិញ');
      return;
    }

    const cUSD = parseFloat(costPriceUSD) || 0;
    const cKHR = parseFloat(costPriceKHR) || convertUSDtoKHR(cUSD, buyRate);
    const sUSD = parseFloat(salePriceUSD) || 0;
    const sKHR = parseFloat(salePriceKHR) || convertUSDtoKHR(sUSD, sellRate);
    const stock = parseFloat(stockQuantity) || 0;
    const minStock = parseFloat(minStockAlert) || 5;

    // Validation: KHR price must always be present (as requested: "តម្លៃរៀលត្រូវតែមានជានិច្ច")
    if (cKHR <= 0 && cUSD <= 0) {
      setFormError('សូមបញ្ចូលតម្លៃដើមទិញចូល ($ ឬ ៛)');
      return;
    }
    if (sKHR <= 0 && sUSD <= 0) {
      setFormError('សូមបញ្ចូលតម្លៃលក់ចេញ ($ ឬ ៛)');
      return;
    }

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        code: code.trim(),
        name: name.trim(),
        category: category.trim() || 'ទូទៅ',
        part: part.trim() || '0',
        imageUrl: imageUrl.trim() || undefined,
        unit,
        costPriceUSD: cUSD,
        costPriceKHR: cKHR, // Always guaranteed
        salePriceUSD: sUSD,
        salePriceKHR: sKHR, // Always guaranteed
        stockQuantity: stock,
        minStockAlert: minStock,
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddProduct({
        code: code.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        category: category.trim() || 'ទូទៅ',
        part: part.trim() || '0',
        imageUrl: imageUrl.trim() || undefined,
        unit,
        costPriceUSD: cUSD,
        costPriceKHR: cKHR, // Always guaranteed
        salePriceUSD: sUSD,
        salePriceKHR: sKHR, // Always guaranteed
        stockQuantity: stock,
        minStockAlert: minStock,
        notes: notes.trim(),
      });
    }

    setIsModalOpen(false);
  };

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
      searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ទាំងអស់ (All)' ||
      (p.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase();

    const matchesId =
      selectedId === 'ទាំងអស់ (All)' ||
      (p.code || '').trim().toLowerCase() === selectedId.trim().toLowerCase();

    return matchesSearch && matchesCategory && matchesId;
  });

  // Sorting state for "បញ្ជីទំនិញរៀបតាមលំដាប់"
  type SortKey = 'default' | 'name' | 'unit' | 'category' | 'costUSD' | 'costKHR' | 'salePrice' | 'stock';
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey('default');
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortKey === 'default') return 0; // Natural sequence as imported from connected Google Sheet
    if (sortKey === 'name') {
      return sortOrder === 'asc'
        ? a.name.localeCompare(b.name, 'km', { sensitivity: 'base' })
        : b.name.localeCompare(a.name, 'km', { sensitivity: 'base' });
    }
    if (sortKey === 'unit') {
      return sortOrder === 'asc'
        ? (a.unit || '').localeCompare(b.unit || '', 'km', { sensitivity: 'base' })
        : (b.unit || '').localeCompare(a.unit || '', 'km', { sensitivity: 'base' });
    }
    if (sortKey === 'category') {
      return sortOrder === 'asc'
        ? (a.category || '').localeCompare(b.category || '', 'km', { sensitivity: 'base' })
        : (b.category || '').localeCompare(a.category || '', 'km', { sensitivity: 'base' });
    }
    if (sortKey === 'costUSD') {
      return sortOrder === 'asc'
        ? a.costPriceUSD - b.costPriceUSD
        : b.costPriceUSD - a.costPriceUSD;
    }
    if (sortKey === 'costKHR') {
      return sortOrder === 'asc'
        ? a.costPriceKHR - b.costPriceKHR
        : b.costPriceKHR - a.costPriceKHR;
    }
    if (sortKey === 'salePrice') {
      const priceA = a.salePriceUSD > 0 ? a.salePriceUSD : (a.salePriceKHR / sellRate);
      const priceB = b.salePriceUSD > 0 ? b.salePriceUSD : (b.salePriceKHR / sellRate);
      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    }
    if (sortKey === 'stock') {
      return sortOrder === 'asc'
        ? a.stockQuantity - b.stockQuantity
        : b.stockQuantity - a.stockQuantity;
    }
    return 0;
  });

  return (
    <div className="space-y-3">
      {/* ផ្ទាំងតម្រង & ស្វែងរក (បង្រួមក្នុង 1 ប្លុកតែមួយ មិនឱ្យបែកជួរច្រើនជួរដេក) */}
      <div className="flex flex-col gap-2 bg-[#12151B] p-2.5 rounded-xl border border-[#2D333E] shadow-xs">
        {/* ជួរទី ១: ស្វែងរកទំនិញ + ប៊ូតុងបើក/លាក់តម្រង + បញ្ចូលទំនិញថ្មី + តម្រងសកម្ម */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              id="search-products-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខកូដទំនិញ (id)..."
              className="w-full pl-8 pr-[60px] py-1.5 text-xs rounded-lg bg-[#161920] border border-[#2D333E] text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`p-1 rounded-md transition-colors ${
                  isListening 
                    ? 'text-rose-400 bg-rose-500/10 animate-pulse' 
                    : 'text-slate-400 hover:text-blue-400 hover:bg-[#2D333E]'
                }`}
                title="ស្វែងរកដោយសំឡេង"
              >
                <Mic className="h-3.5 w-3.5" />
              </button>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#2D333E] transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
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

          {/* ប៊ូតុង បញ្ចូលទំនិញថ្មី */}
          <button
            id="btn-add-product"
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 active:bg-blue-700 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ បញ្ចូលទំនិញថ្មី</span>
          </button>

          {/* ប៊ូតុង Sync ទាំងអស់ ពី Google Sheet ផ្ទាល់ */}
          {onSyncFromSheet && (
            <button
              id="btn-sync-sheet-products"
              type="button"
              disabled={isSyncing}
              onClick={onSyncFromSheet}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/60 hover:text-emerald-300 active:bg-emerald-900 transition-all shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
              title="ទាញយក / Sync ទិន្នន័យទាំងអស់ពី Google Sheet"
            >
              <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync ទាំងអស់</span>
            </button>
          )}

          {/* Active filter badges inline */}
          {(selectedCategory !== 'ទាំងអស់ (All)' ||
            selectedId !== 'ទាំងអស់ (All)' ||
            searchTerm) && (
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
                  setSearchTerm('');
                }}
                className="text-rose-400 hover:underline px-1 cursor-pointer whitespace-nowrap"
              >
                សម្អាត
              </button>
            </div>
          )}

          <div className="text-[11px] text-slate-400 ml-auto font-medium shrink-0 flex items-center gap-2">
            {sortKey !== 'default' && (
              <button
                type="button"
                onClick={() => { setSortKey('default'); setSortOrder('asc'); }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] cursor-pointer hover:bg-blue-500/25 transition-colors"
                title="ចុចដើម្បីត្រឡប់ទៅលំដាប់ដើម (Google Sheet)"
              >
                <span>
                  តម្រៀប៖ {
                    sortKey === 'name' ? 'ទំនិញ' :
                    sortKey === 'unit' ? 'ឯកតា' :
                    sortKey === 'category' ? 'ផ្នែក' :
                    sortKey === 'costUSD' ? 'ថ្លៃទិញ $' :
                    sortKey === 'costKHR' ? 'ថ្លៃទិញ ៛' : 'ចំនួនស្តុក'
                  } ({sortOrder === 'asc' ? 'ឡើង ↑' : 'ចុះ ↓'})
                </span>
                <X className="h-2.5 w-2.5" />
              </button>
            )}
            <span>
              បង្ហាញ៖ <span className="text-white font-mono font-bold">{sortedProducts.length}</span> / {products.length} មុខ
            </span>
          </div>
        </div>

        {/* ផ្ទាំងតម្រង ប្រភេទ និង id (យកពីជួរ A:A និង B:B) */}
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

      {/* Products Table (រៀបតាមលំដាប់ជួរឈរដែលបានស្នើសុំ - Freeze ជួរ Head & Freeze រូបភាព) */}
      <div className="bg-[#161920] rounded-xl border border-[#2D333E] shadow-sm overflow-hidden flex flex-col">
        {/* Helper bar indicating freeze header, freeze image, and horizontal scroll */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#2D333E] bg-[#12151B] text-xs text-slate-400 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-200">បញ្ជីទំនិញ ({sortedProducts.length})</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
              <Pin className="h-2.5 w-2.5" />
              Freeze ជួរ Head
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 font-medium">
              <Pin className="h-2.5 w-2.5 rotate-45" />
              Freeze រូបភាព
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <ArrowLeftRight className="h-3 w-3 text-slate-400" />
            <span>Scroll ឆ្វេង-ស្ដាំ</span>
          </div>
        </div>

        <div className="overflow-x-auto relative scrollbar-thin">
          <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[1020px]">
            <thead className="">
              <tr className="bg-[#12151B] text-slate-400 font-semibold select-none">
                {/* ១. រូបភាព (Freeze Sticky Left & Top) */}
                <th className="sticky left-0 z-10 bg-[#12151B] py-2.5 px-3 text-center w-16 min-w-[64px] max-w-[64px] border-b border-r border-[#2D333E] shadow-[4px_2px_8px_-2px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-center gap-1">
                    <span>រូបភាព</span>
                  </div>
                </th>

                {/* ២. ទំនិញ យកពី C:C */}
                <th
                  onClick={() => handleSort('name')}
                  className="bg-[#12151B] py-2.5 px-3.5 text-left cursor-pointer hover:text-white transition-colors group border-b border-[#2D333E] min-w-[220px]"
                  title="ចុចដើម្បីតម្រៀបតាមឈ្មោះទំនិញ (យកពីជួរ C:C)"
                >
                  <div className="flex items-center gap-1">
                    <span>ទំនិញ</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">(C:C)</span>
                    {sortKey === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-400" /> : <ArrowDown className="h-3 w-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                    )}
                  </div>
                </th>

                {/* ៣. ឯកតា យកពី D:D */}
                <th
                  onClick={() => handleSort('unit')}
                  className="bg-[#12151B] py-2.5 px-3 text-center cursor-pointer hover:text-white transition-colors group border-b border-[#2D333E] min-w-[90px] whitespace-nowrap"
                  title="ចុចដើម្បីតម្រៀបតាមឯកតា (យកពីជួរ D:D)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ឯកតា</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">(D:D)</span>
                    {sortKey === 'unit' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-400" /> : <ArrowDown className="h-3 w-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                    )}
                  </div>
                </th>

                {/* ៤. ផ្នែក យកពី E:E */}
                <th
                  onClick={() => handleSort('category')}
                  className="bg-[#12151B] py-2.5 px-3 text-left cursor-pointer hover:text-white transition-colors group border-b border-[#2D333E] min-w-[100px] whitespace-nowrap"
                  title="ចុចដើម្បីតម្រៀបតាមផ្នែក (យកពីជួរ E:E / # Part)"
                >
                  <div className="flex items-center gap-1">
                    <span>ផ្នែក</span>
                    <span className="text-[10px] text-blue-400 font-mono font-medium">(E:E)</span>
                    {sortKey === 'category' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-400" /> : <ArrowDown className="h-3 w-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                    )}
                  </div>
                </th>

                {/* ៥. តម្លៃទិញដុល្លារ យកពី F:F */}
                <th
                  onClick={() => handleSort('costUSD')}
                  className="bg-[#12151B] py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors group border-b border-[#2D333E] min-w-[125px] whitespace-nowrap"
                  title="ចុចដើម្បីតម្រៀបតាមតម្លៃទិញដុល្លារ (យកពីជួរ F:F)"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>តម្លៃទិញដុល្លារ</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">(F:F)</span>
                    {sortKey === 'costUSD' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-400" /> : <ArrowDown className="h-3 w-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                    )}
                  </div>
                </th>

                {/* ៦. តម្លៃទិញរៀល យកពី G:G */}
                <th
                  onClick={() => handleSort('costKHR')}
                  className="bg-[#12151B] py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors group border-b border-[#2D333E] min-w-[125px] whitespace-nowrap"
                  title="ចុចដើម្បីតម្រៀបតាមតម្លៃទិញរៀល (យកពីជួរ G:G)"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>តម្លៃទិញរៀល</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">(G:G)</span>
                    {sortKey === 'costKHR' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-400" /> : <ArrowDown className="h-3 w-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                    )}
                  </div>
                </th>

                {/* ៧. តម្លៃលក់ចេញ យកពី H:H (នៅចន្លោះតម្លៃទិញរៀល និងចំនួនស្តុក) */}
                <th
                  onClick={() => handleSort('salePrice')}
                  className="bg-[#12151B] py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors group border-b border-[#2D333E] min-w-[130px] whitespace-nowrap"
                  title="ចុចដើម្បីតម្រៀបតាមតម្លៃលក់ចេញ (យកពីជួរ H:H)"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>តម្លៃលក់ចេញ</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-medium">(H:H)</span>
                    {sortKey === 'salePrice' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-400" /> : <ArrowDown className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                    )}
                  </div>
                </th>

                {/* ៨. ចំនួនស្តុក (យកពី I:I) */}
                <th
                  onClick={() => handleSort('stock')}
                  className="bg-[#12151B] py-2.5 px-3 text-center cursor-pointer hover:text-white transition-colors group border-b border-[#2D333E] min-w-[105px] whitespace-nowrap"
                  title="ចុចដើម្បីតម្រៀបតាមចំនួនស្តុក (យកពីជួរ I:I)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ចំនួនស្តុក</span>
                    <span className="text-[10px] text-blue-400 font-mono font-medium">(I:I)</span>
                    {sortKey === 'stock' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-400" /> : <ArrowDown className="h-3 w-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                    )}
                  </div>
                </th>

                {/* ៩. សកម្មភាព */}
                <th className="bg-[#12151B] py-2.5 px-3 text-center w-24 min-w-[90px] border-b border-[#2D333E] whitespace-nowrap">
                  សកម្មភាព
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 border-b border-[#2D333E]/50">
                    <Package className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs">មិនមានទិន្នន័យទំនិញត្រូវនឹងការស្វែងរកទេ</p>
                  </td>
                </tr>
              ) : (
                sortedProducts.map((p, index) => {
                  const isLowStock = p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0;
                  const isOutOfStock = p.stockQuantity <= 0;

                  return (
                    <tr
                      key={`${p.id}-${index}`}
                      className="hover:bg-[#1C212B]/70 transition-colors group"
                    >
                      {/* ១. រូបភាព (Freeze Sticky Left) */}
                      <td className="sticky left-0 z-10 bg-[#161920] group-hover:bg-[#1C212B] py-2 px-2.5 text-center w-16 min-w-[64px] max-w-[64px] border-b border-r border-[#2D333E] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)] transition-colors">
                        <ProductThumbnail
                          src={p.imageUrl}
                          alt={p.name}
                          fallbackText={p.code}
                          size="sm"
                          className="mx-auto shadow-xs"
                        />
                      </td>

                      {/* ២. ទំនិញ (យកពី C:C) */}
                      <td className="py-2 px-3.5 border-b border-[#2D333E]/50 min-w-[220px]">
                        <div className="font-semibold text-white leading-snug flex items-center gap-1.5">
                          {p.name}
                          {isOutOfStock && <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" title="អស់ពីស្តុក!" />}
                          {isLowStock && <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" title={`ស្តុកទាបជាងឬស្មើ ${p.minStockAlert}`} />}
                        </div>
                        {p.notes && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">
                            {p.notes}
                          </div>
                        )}
                      </td>

                      {/* ៣. ឯកតា / # រាយ (យកពី D:D) */}
                      <td className="py-2 px-3 text-center border-b border-[#2D333E]/50 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#161920] text-slate-200 border border-[#2D333E] text-xs font-mono font-medium">
                          {p.unit || '1'}
                        </span>
                      </td>

                      {/* ៤. ផ្នែក (យកពី E:E) */}
                      <td className="py-2 px-3 border-b border-[#2D333E]/50 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-mono font-bold">
                          {p.part || '0'}
                        </span>
                      </td>

                      {/* ៥. តម្លៃទិញដុល្លារ (យកពី F:F) */}
                      <td className="py-2 px-3 text-right border-b border-[#2D333E]/50 whitespace-nowrap">
                        <div className="font-semibold font-mono text-slate-100 text-xs">
                          {formatUSD(p.costPriceUSD)}
                        </div>
                      </td>

                      {/* ៦. តម្លៃទិញរៀល (យកពី G:G) */}
                      <td className="py-2 px-3 text-right border-b border-[#2D333E]/50 whitespace-nowrap">
                        <div className="font-bold font-mono text-emerald-400 text-xs">
                          {formatKHR(p.costPriceKHR)}
                        </div>
                      </td>

                      {/* ៧. តម្លៃលក់ចេញ (យកពី H:H / sellpriceR) */}
                      <td className="py-2 px-3 text-right border-b border-[#2D333E]/50 whitespace-nowrap">
                        <div className="font-bold font-mono text-emerald-400 text-xs">
                          {p.salePriceKHR > 0 ? formatKHR(p.salePriceKHR) : formatUSD(p.salePriceUSD)}
                        </div>
                        {p.salePriceUSD > 0 && p.salePriceKHR > 0 && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {formatUSD(p.salePriceUSD)}
                          </div>
                        )}
                      </td>

                      {/* ៨. ចំនួនស្តុក (យកពី I:I) */}
                      <td className="py-2 px-3 text-center border-b border-[#2D333E]/50 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isOutOfStock
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : isLowStock
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                          title={isOutOfStock ? 'អស់ពីស្តុក!' : isLowStock ? `ស្តុកទាបជាងឬស្មើ ${p.minStockAlert}` : 'ស្តុកមានគ្រប់គ្រាន់'}
                        >
                          {(isOutOfStock || isLowStock) && (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {p.stockQuantity.toLocaleString('km-KH')}
                        </span>
                      </td>

                      {/* ៩. សកម្មភាព */}
                      <td className="py-2 px-3 text-center border-b border-[#2D333E]/50 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`btn-edit-${p.id}`}
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            title="កែប្រែទំនិញ"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            id={`btn-delete-${p.id}`}
                            type="button"
                            onClick={() => onDeleteProduct(p.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="លុបទំនិញ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary of items & Google Sheet mapping info */}
        <div className="p-3 bg-[#12151B] border-t border-[#2D333E] text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">បង្ហាញសរុប៖ {sortedProducts.length} ទំនិញ</span>
            {sortKey !== 'default' && (
              <button
                type="button"
                onClick={() => { setSortKey('default'); setSortOrder('asc'); }}
                className="text-blue-400 hover:underline cursor-pointer ml-2 text-[11px]"
              >
                (ត្រឡប់ទៅលំដាប់ដើម Google Sheet)
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Google Sheet: ប្រភេទ (A:A) • id/កូដ (B:B) • ទំនិញ (C:C) • ឯកតា (D:D) • ផ្នែក (E:E) • តម្លៃទិញ $ (F:F) • តម្លៃទិញ ៛ (G:G) • តម្លៃលក់ចេញ (H:H) • ចំនួនស្តុក (I:I)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div
          id="product-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <div
            id="product-modal-container"
            className="w-full max-w-2xl rounded-2xl bg-[#161920] p-6 shadow-2xl border border-[#2D333E] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto text-slate-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#2D333E]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingProduct ? 'កែប្រែព័ត៌មានទំនិញ' : 'បញ្ចូលទំនិញថ្មី'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    បំពេញព័ត៌មានទំនិញ តម្លៃទិញ តម្លៃលក់ជាដុល្លារ និងរៀល
                  </p>
                </div>
              </div>
              <button
                id="btn-close-product-modal"
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1C212B] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Product Code / id */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    id / លេខកូដ (SKU) *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="id ឬកូដទំនិញ..."
                    className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    required
                  />
                </div>

                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ឈ្មោះទំនិញ (Product Name) *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ឧ. ទឹកក្រូច កូកាកូឡា ៣៣០មល"
                    className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* ប្រភេទ (Category) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ប្រភេទ
                  </label>
                  <input
                    type="text"
                    list="categories-list"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="ឧ. ទឹកដោះ, សាប៊ូ..."
                    className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    required
                  />
                  <datalist id="categories-list">
                    {Array.from(new Set([...uniqueCategories, ...COMMON_CATEGORIES.filter((c) => c !== 'ទាំងអស់ (All)')])).map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                {/* ផ្នែក (# Part) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ផ្នែក
                  </label>
                  <input
                    type="text"
                    list="parts-list"
                    value={part}
                    onChange={(e) => setPart(e.target.value)}
                    placeholder="ឧ. 0, 4, 12, 60..."
                    className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden font-mono"
                    required
                  />
                  <datalist id="parts-list">
                    {COMMON_PARTS.map((pVal) => (
                      <option key={pVal} value={pVal} />
                    ))}
                  </datalist>
                </div>

                {/* ឯកតា / # រាយ (Unit) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ឯកតា / # រាយ
                  </label>
                  <input
                    type="text"
                    list="units-list"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ឧ. 1, 12, 48..."
                    className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden font-mono"
                    required
                  />
                  <datalist id="units-list">
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Product Image Section (រូបភាពទំនិញ) */}
              <div className="rounded-xl border border-[#2D333E] bg-[#0F1115] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-amber-400" />
                    <label className="text-xs font-bold text-white">
                      រូបភាពទំនិញ (Product Image)
                    </label>
                  </div>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
                    >
                      លុបរូបភាពចេញ
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="shrink-0">
                    <ProductThumbnail
                      src={imageUrl}
                      alt={name || 'រូបភាព'}
                      fallbackText={code || 'SKU'}
                      size="lg"
                      className="border border-[#2D333E] shadow-md"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="បិទភ្ជាប់តំណរូបភាព (Image URL) ឧ. https://..."
                      className="w-full rounded-xl border border-[#2D333E] bg-[#161920] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    />

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C212B] hover:bg-[#252C3A] text-slate-300 text-xs cursor-pointer border border-[#2D333E] transition-colors">
                        <Upload className="h-3.5 w-3.5 text-blue-400" />
                        <span>ជ្រើសរូបភាពពីម៉ាស៊ីន (Upload)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setImageUrl(event.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-slate-500">JPG, PNG, WEBP</span>
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5 text-[11px] text-slate-400">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>ជ្រើសរើសរូបគំរូរហ័ស៖</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                          imageUrl === preset.url
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-[#161920] text-slate-300 border-[#2D333E] hover:border-slate-500'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* COST PRICE SECTION (USD & KHR) */}
              <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300">
                    តម្លៃដើមទិញចូល (Cost Price)
                  </span>
                  <span className="text-[11px] text-blue-400 font-mono bg-blue-950 px-2 py-0.5 rounded border border-blue-800/60">
                    អត្រាទិញ៖ 1$ = {buyRate.toLocaleString('km-KH')} ៛
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      គិតជាដុល្លារ ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPriceUSD}
                      onChange={(e) => handleCostUSDChange(e.target.value)}
                      placeholder="0.50"
                      className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                      គិតជារៀល (៛) *ជានិច្ច
                    </label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={costPriceKHR}
                      onChange={(e) => handleCostKHRChange(e.target.value)}
                      placeholder="2050"
                      className="w-full rounded-xl border border-emerald-500/40 bg-[#0F1115] px-3 py-2 text-xs font-bold text-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SALE PRICE SECTION (USD & KHR) */}
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    តម្លៃលក់ចេញ (Sale Price)
                  </span>
                  <span className="text-[11px] text-amber-400 font-mono bg-amber-950 px-2 py-0.5 rounded border border-amber-800/60">
                    អត្រាលក់៖ 1$ = {sellRate.toLocaleString('km-KH')} ៛
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      គិតជាដុល្លារ ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={salePriceUSD}
                      onChange={(e) => handleSaleUSDChange(e.target.value)}
                      placeholder="0.75"
                      className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      គិតជារៀល (៛) *ជានិច្ច
                    </label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={salePriceKHR}
                      onChange={(e) => handleSaleKHRChange(e.target.value)}
                      placeholder="3075"
                      className="w-full rounded-xl border border-amber-500/40 bg-[#0F1115] px-3 py-2 text-xs font-bold text-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-hidden"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* LIVE EXPECTED PROFIT ESTIMATE PER UNIT */}
              {((parseFloat(salePriceKHR) || 0) > 0 || (parseFloat(salePriceUSD) || 0) > 0) && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-purple-300 font-semibold block">
                      ប្រាក់ចំណេញរំពឹងទុកក្នុង ១ {unit || 'ឯកតា'} (Expected Profit):
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        +{formatKHR(Math.max(0, (parseFloat(salePriceKHR) || 0) - (parseFloat(costPriceKHR) || 0)))}
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-xs font-semibold text-emerald-300 font-mono">
                        +{formatUSD(Math.max(0, (parseFloat(salePriceUSD) || 0) - (parseFloat(costPriceUSD) || 0)))}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-mono">
                    <span className="text-slate-300 font-sans">រូបមន្ត៖</span>
                    <div>លក់ ({sellRate}៛) - ទិញ ({buyRate}៛)</div>
                  </div>
                </div>
              )}

              {/* Stock Quantity & Min Alert */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ចំនួនស្តុកបច្ចុប្បន្ន
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    កម្រិតប្រកាសអាសន្នស្តុកទាប
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  កំណត់សម្គាល់បន្ថែម
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ព័ត៌មានលម្អិតអំពីទំនិញ..."
                  rows={2}
                  className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#2D333E]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-[#2D333E] bg-[#1C212B] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-[#252C3A] transition-colors"
                >
                  បោះបង់
                </button>
                <button
                  id="btn-submit-product-form"
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-950/40 hover:bg-blue-500 active:bg-blue-700 transition-colors"
                >
                  {editingProduct ? 'រក្សាទុកការកែប្រែ' : 'បន្ថែមទំនិញ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
