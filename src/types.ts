export interface Product {
  id: string;
  code: string; // SKU, barcode, or ID (Col B:B)
  name: string; // Product name in Khmer / English (Col C:C)
  category: string; // Category (ប្រភេទ ពីជួរ A:A)
  part?: string; // Part (# Part / ផ្នែក ពីជួរ E:E)
  imageUrl?: string; // Product Image (រូបភាពទំនិញ)
  costPriceUSD: number; // Purchase price in USD
  costPriceKHR: number; // Purchase price in KHR (always present)
  salePriceUSD: number; // Selling price in USD
  salePriceKHR: number; // Selling price in KHR (always present)
  stockQuantity: number; // Current stock count
  minStockAlert: number; // Minimum stock threshold alert
  unit: string; // Unit (កំប៉ុង, ដប, កេស, គីឡូ, etc.)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseDate: string; // YYYY-MM-DD HH:mm
  productId: string;
  productCode: string; // SKU, ID, or abbreviation
  productName: string;
  category?: string; // Category (ប្រភេទ)
  imageUrl?: string; // Product image
  unit: string;
  quantity: number;
  costPriceUSD: number;
  costPriceKHR: number; // always present
  totalUSD: number;
  totalKHR: number; // always present
  exchangeRate: number; // KHR per 1 USD at time of purchase
  supplierName?: string;
  invoiceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleDate: string; // YYYY-MM-DD HH:mm
  productId: string;
  productCode: string; // SKU, ID, or abbreviation
  productName: string;
  category?: string; // Category (ប្រភេទ)
  imageUrl?: string; // Product image
  unit: string;
  quantity: number;
  salePriceUSD: number;
  salePriceKHR: number; // always present
  costPriceUSD: number; // unit cost at time of sale
  costPriceKHR: number; // unit cost KHR
  totalSaleUSD: number;
  totalSaleKHR: number; // always present
  totalCostUSD: number;
  totalCostKHR: number; // always present
  profitUSD: number; // Total Sale USD - Total Cost USD
  profitKHR: number; // Total Sale KHR - Total Cost KHR (always present)
  exchangeRate: number; // KHR per 1 USD at time of sale
  customerName?: string;
  paymentMethod: 'Cash' | 'KHQR' | 'Credit';
  invoiceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface ExchangeRateConfig {
  rate: number; // General/fallback rate (defaults to sellRate)
  buyRate: number; // Buy Rate: អត្រាទិញ
  sellRate: number; // Sell Rate: អត្រាលក់
  lastUpdated: string;
}

export interface GoogleSheetSyncInfo {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncError: string | null;
  autoSync?: boolean;
}

export type ActivePage = 'products' | 'purchases' | 'sales' | 'reports';

export type ThemeMode = 'dark' | 'light';
