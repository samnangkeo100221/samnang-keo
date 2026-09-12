import { Product, PurchaseItem, SaleItem, ExchangeRateConfig, GoogleSheetSyncInfo, ThemeMode } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

const STORAGE_KEYS = {
  PRODUCTS: 'pos_cambodia_products',
  PURCHASES: 'pos_cambodia_purchases',
  SALES: 'pos_cambodia_sales',
  EXCHANGE_RATE: 'pos_cambodia_exchange_rate',
  SHEET_INFO: 'pos_cambodia_sheet_info',
  AUTO_SYNC: 'pos_cambodia_auto_sync',
  THEME: 'pos_cambodia_theme',
  LATEST_SHEET_SNAPSHOT: 'pos_cambodia_latest_sheet_snapshot',
};

export interface GoogleSheetSnapshot {
  products: Product[];
  purchases: PurchaseItem[];
  sales: SaleItem[];
  exchangeRate: ExchangeRateConfig;
  lastSyncedAt: string;
  spreadsheetId: string;
  spreadsheetTitle?: string;
  userEmail?: string | null;
  syncedItemCounts: {
    products: number;
    purchases: number;
    sales: number;
  };
}

export const TARGET_SHEET_ID = '159SBfFQDZElBC1ZzFzp2q92zHREpg0nNK9bdfXfgdjU';

export const saveLatestSheetSnapshot = (snapshot: {
  products: Product[];
  purchases: PurchaseItem[];
  sales: SaleItem[];
  exchangeRate?: ExchangeRateConfig;
  lastSyncedAt?: string;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  userEmail?: string | null;
}) => {
  try {
    const currentRate = snapshot.exchangeRate || loadExchangeRate();
    const data: GoogleSheetSnapshot = {
      products: snapshot.products || [],
      purchases: snapshot.purchases || [],
      sales: snapshot.sales || [],
      exchangeRate: currentRate,
      lastSyncedAt: snapshot.lastSyncedAt || new Date().toISOString(),
      spreadsheetId: snapshot.spreadsheetId || TARGET_SHEET_ID,
      spreadsheetTitle: snapshot.spreadsheetTitle || 'Google Sheet របស់ហាង',
      userEmail: snapshot.userEmail || null,
      syncedItemCounts: {
        products: (snapshot.products || []).length,
        purchases: (snapshot.purchases || []).length,
        sales: (snapshot.sales || []).length,
      },
    };
    localStorage.setItem(STORAGE_KEYS.LATEST_SHEET_SNAPSHOT, JSON.stringify(data));

    // Also keep individual keys up to date
    if (snapshot.products && snapshot.products.length > 0) {
      saveProducts(snapshot.products);
    }
    if (snapshot.purchases) {
      savePurchases(snapshot.purchases);
    }
    if (snapshot.sales) {
      saveSales(snapshot.sales);
    }
    if (snapshot.exchangeRate) {
      saveExchangeRate(snapshot.exchangeRate);
    }
  } catch (err) {
    console.error('Failed to save latest sheet snapshot', err);
  }
};

export const loadLatestSheetSnapshot = (): GoogleSheetSnapshot | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LATEST_SHEET_SNAPSHOT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.products)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const DEFAULT_EXCHANGE_RATE: ExchangeRateConfig = {
  rate: 4100,
  buyRate: 4000,
  sellRate: 4100,
  lastUpdated: new Date().toISOString(),
};

export const loadProducts = (): Product[] => {
  try {
    const snapshot = loadLatestSheetSnapshot();
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);

    // If we have a Google Sheet snapshot and no raw or raw is empty, use the snapshot products
    if (snapshot && Array.isArray(snapshot.products) && snapshot.products.length > 0) {
      if (!raw) {
        saveProducts(snapshot.products);
        return snapshot.products;
      }
    }

    if (!raw) {
      saveProducts(INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }
    const list: Product[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) {
      if (snapshot && Array.isArray(snapshot.products) && snapshot.products.length > 0) {
        saveProducts(snapshot.products);
        return snapshot.products;
      }
      saveProducts(INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }

    // Only auto-migrate if no snapshot was ever saved and data is legacy mock
    if (!snapshot) {
      const isLegacyDemo = list.length <= 5 && list.some((p) => p.category?.includes('ភេសជ្ជៈ') || p.category?.includes('គ្រឿងទេស'));
      const isLegacyMock = list.some((p) => p.code?.startsWith('TT-') || p.name?.includes('ប្រេងឆា:12ដប'));
      if (isLegacyDemo || isLegacyMock) {
        saveProducts(INITIAL_PRODUCTS);
        return INITIAL_PRODUCTS;
      }
    }

    const seenIds = new Set<string>();
    let hasChanges = false;
    const sanitized = list.map((p, idx) => {
      let id = p.id ? String(p.id).trim() : '';
      if (!id || seenIds.has(id) || id.length <= 2) {
        id = `prod-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
        hasChanges = true;
      }
      seenIds.add(id);

      // Backfill demo images if missing
      let imageUrl = p.imageUrl;
      if (!imageUrl) {
        const demoMatch = INITIAL_PRODUCTS.find((init) => init.code === p.code || init.id === p.id);
        if (demoMatch?.imageUrl) {
          imageUrl = demoMatch.imageUrl;
          hasChanges = true;
        }
      }

      // Preserve category and part
      let cat = p.category !== undefined && p.category !== null ? String(p.category).trim() : '';
      let part = p.part !== undefined && p.part !== null ? String(p.part).trim() : '';

      if (!cat) cat = 'ទូទៅ';
      if (!part) part = '0';

      return { ...p, id, imageUrl, category: cat, part };
    });

    if (hasChanges) {
      saveProducts(sanitized);
    }
    return sanitized;
  } catch {
    const snapshot = loadLatestSheetSnapshot();
    if (snapshot && Array.isArray(snapshot.products) && snapshot.products.length > 0) {
      return snapshot.products;
    }
    return INITIAL_PRODUCTS;
  }
};

export const saveProducts = (products: Product[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.error('Failed to save products to localStorage', err);
  }
};

export const loadPurchases = (): PurchaseItem[] => {
  try {
    const snapshot = loadLatestSheetSnapshot();
    const raw = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    if (!raw) {
      if (snapshot && Array.isArray(snapshot.purchases)) {
        savePurchases(snapshot.purchases);
        return snapshot.purchases;
      }
      return [];
    }
    const list: PurchaseItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) {
      if (snapshot && Array.isArray(snapshot.purchases)) {
        savePurchases(snapshot.purchases);
        return snapshot.purchases;
      }
      return [];
    }

    const seenIds = new Set<string>();
    let hasChanges = false;
    const sanitized = list.map((pc, idx) => {
      let id = pc.id ? String(pc.id).trim() : '';
      if (!id || seenIds.has(id) || id.length <= 2) {
        id = `purch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
        hasChanges = true;
      }
      seenIds.add(id);
      return { ...pc, id };
    });

    if (hasChanges) {
      savePurchases(sanitized);
    }
    return sanitized;
  } catch {
    return [];
  }
};

export const savePurchases = (purchases: PurchaseItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  } catch (err) {
    console.error('Failed to save purchases to localStorage', err);
  }
};

export const loadSales = (): SaleItem[] => {
  try {
    const snapshot = loadLatestSheetSnapshot();
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);

    // If we have a Google Sheet snapshot, ALWAYS prioritize the real sales from Google Sheet (even if empty [])!
    if (snapshot && Array.isArray(snapshot.sales)) {
      if (raw !== null) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          // If raw sales has legacy demo items (Red Bull, Kulen water sample), clean them out with snapshot sales
          const hasLegacyDemo = list.some((s) => s.id?.startsWith('sale-init-') && (s.productName?.includes('គោជល់') || s.productName?.includes('គូលែន')));
          if (hasLegacyDemo) {
            saveSales(snapshot.sales);
            return snapshot.sales;
          }
          return list;
        }
      }
      saveSales(snapshot.sales);
      return snapshot.sales;
    }

    if (!raw) {
      saveSales([]);
      return [];
    }

    const list: SaleItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) {
      saveSales([]);
      return [];
    }

    // Filter out old legacy demo mock sales (Red Bull, Kulen sample)
    const hasLegacyDemo = list.some((s) => s.id?.startsWith('sale-init-') && (s.productName?.includes('គោជល់') || s.productName?.includes('គូលែន')));
    if (hasLegacyDemo) {
      saveSales([]);
      return [];
    }

    const seenIds = new Set<string>();
    let hasChanges = false;
    const sanitized = list.map((s, idx) => {
      let id = s.id ? String(s.id).trim() : '';
      if (!id || seenIds.has(id) || id.length <= 2) {
        id = `sale-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
        hasChanges = true;
      }
      seenIds.add(id);
      return { ...s, id };
    });

    if (hasChanges) {
      saveSales(sanitized);
    }
    return sanitized;
  } catch {
    return [];
  }
};

export const saveSales = (sales: SaleItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  } catch (err) {
    console.error('Failed to save sales to localStorage', err);
  }
};

export const loadExchangeRate = (): ExchangeRateConfig => {
  try {
    const snapshot = loadLatestSheetSnapshot();
    const raw = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE);
    if (!raw) {
      if (snapshot && snapshot.exchangeRate) {
        saveExchangeRate(snapshot.exchangeRate);
        return snapshot.exchangeRate;
      }
      saveExchangeRate(DEFAULT_EXCHANGE_RATE);
      return DEFAULT_EXCHANGE_RATE;
    }
    const parsed = JSON.parse(raw);
    // Ensure both buyRate and sellRate are properly populated
    if (!parsed || !parsed.rate || !parsed.buyRate || !parsed.sellRate) {
      const updated: ExchangeRateConfig = {
        rate: parsed?.sellRate || parsed?.rate || (snapshot?.exchangeRate?.sellRate ?? DEFAULT_EXCHANGE_RATE.sellRate),
        buyRate: parsed?.buyRate || (snapshot?.exchangeRate?.buyRate ?? DEFAULT_EXCHANGE_RATE.buyRate),
        sellRate: parsed?.sellRate || parsed?.rate || (snapshot?.exchangeRate?.sellRate ?? DEFAULT_EXCHANGE_RATE.sellRate),
        lastUpdated: parsed?.lastUpdated || new Date().toISOString(),
      };
      saveExchangeRate(updated);
      return updated;
    }
    return parsed;
  } catch {
    return DEFAULT_EXCHANGE_RATE;
  }
};

export const saveExchangeRate = (config: ExchangeRateConfig) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATE, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save exchange rate', err);
  }
};

// Helper: Recalculate all products' KHR prices:
// ថ្លៃដើមទិញចូល (Cost KHR) = គុណនឹងអត្រាទិញ (buyRate)
// តម្លៃលក់ចេញ (Sale KHR) = គុណនឹងអត្រាលក់ (sellRate)
export const recalculateProductsKHR = (
  products: Product[],
  buyRate: number,
  sellRate: number
): Product[] => {
  return products.map((p) => ({
    ...p,
    costPriceKHR: convertUSDtoKHR(p.costPriceUSD, buyRate),
    salePriceKHR: convertUSDtoKHR(p.salePriceUSD, sellRate),
    updatedAt: new Date().toISOString(),
  }));
};

export const loadSheetSyncInfo = (): GoogleSheetSyncInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHEET_INFO);
    if (!raw) {
      return {
        spreadsheetId: TARGET_SHEET_ID,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${TARGET_SHEET_ID}/edit`,
        spreadsheetTitle: 'Google Sheet (159SBfFQDZElBC1ZzFzp2q92zHREpg0nNK9bdfXfgdjU)',
        lastSyncedAt: null,
        isSyncing: false,
        syncError: null,
      };
    }
    const parsed = JSON.parse(raw);
    if (!parsed.spreadsheetId) {
      parsed.spreadsheetId = TARGET_SHEET_ID;
      parsed.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${TARGET_SHEET_ID}/edit`;
      parsed.spreadsheetTitle = 'Google Sheet (159SBfFQDZElBC1ZzFzp2q92zHREpg0nNK9bdfXfgdjU)';
    }
    return parsed;
  } catch {
    return {
      spreadsheetId: TARGET_SHEET_ID,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${TARGET_SHEET_ID}/edit`,
      spreadsheetTitle: 'Google Sheet (159SBfFQDZElBC1ZzFzp2q92zHREpg0nNK9bdfXfgdjU)',
      lastSyncedAt: null,
      isSyncing: false,
      syncError: null,
    };
  }
};

export const saveSheetSyncInfo = (info: GoogleSheetSyncInfo) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SHEET_INFO, JSON.stringify(info));
  } catch (err) {
    console.error('Failed to save sheet sync info', err);
  }
};

export const loadAutoSync = (): boolean => {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
    return val === 'true';
  } catch {
    return false;
  }
};

export const saveAutoSync = (enabled: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, String(enabled));
  } catch (err) {
    console.error('Failed to save auto-sync preference', err);
  }
};

export const loadTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'dark'; // Default to night (dark) theme
};

export const saveTheme = (theme: ThemeMode) => {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (err) {
    console.error('Failed to save theme preference', err);
  }
};

// Helper: Format USD currency ($)
export const formatUSD = (amount: number): string => {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper: Format KHR currency (៛)
export const formatKHR = (amount: number): string => {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString('km-KH')} ៛`;
};

// Helper: Convert USD to KHR given an exchange rate
export const convertUSDtoKHR = (usd: number, rate: number): number => {
  return Math.round(usd * rate);
};

// Helper: Convert KHR to USD given an exchange rate
export const convertKHRtoUSD = (khr: number, rate: number): number => {
  if (rate <= 0) return 0;
  return Number((khr / rate).toFixed(2));
};
