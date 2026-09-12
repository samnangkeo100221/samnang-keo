import React, { useState, useEffect, useCallback } from 'react';
import {
  DownloadCloud,
  UploadCloud,
  FileSpreadsheet,
  ExternalLink,
  Loader2,
  LogIn,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Header } from './components/Header';
import { ProductsPage } from './components/ProductsPage';
import { PurchasesPage } from './components/PurchasesPage';
import { SalesPage } from './components/SalesPage';
import { ReportsPage } from './components/ReportsPage';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { ConfirmModal } from './components/ConfirmModal';
import {
  ActivePage,
  Product,
  PurchaseItem,
  SaleItem,
  ExchangeRateConfig,
  GoogleSheetSyncInfo,
  ThemeMode,
} from './types';
import {
  loadProducts,
  saveProducts,
  loadPurchases,
  savePurchases,
  loadSales,
  saveSales,
  loadExchangeRate,
  saveExchangeRate,
  loadSheetSyncInfo,
  saveSheetSyncInfo,
  loadAutoSync,
  saveAutoSync,
  loadTheme,
  saveTheme,
  convertUSDtoKHR,
  recalculateProductsKHR,
  TARGET_SHEET_ID,
  saveLatestSheetSnapshot,
  loadLatestSheetSnapshot,
} from './services/storage';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  getAccessToken,
  setAccessToken,
} from './services/auth';
import {
  createStoreSpreadsheet,
  syncDataToGoogleSheet,
  fetchStoreDataFromGoogleSheet,
} from './services/googleSheets';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('products');
  const [reportSubTab, setReportSubTab] = useState<'overview' | 'sales' | 'purchases' | 'products'>('overview');

  // Application Data States
  const [products, setProducts] = useState<Product[]>(() => loadProducts());
  const [purchases, setPurchases] = useState<PurchaseItem[]>(() => loadPurchases());
  const [sales, setSales] = useState<SaleItem[]>(() => loadSales());
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateConfig>(() => loadExchangeRate());
  const [syncInfo, setSyncInfo] = useState<GoogleSheetSyncInfo>(() => loadSheetSyncInfo());

  // Google Auth States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Theme State: ថ្ងៃ (Day / Light) vs យប់ (Night / Dark)
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());

  useEffect(() => {
    saveTheme(theme);
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'light') {
      root.classList.add('theme-light', 'light');
      root.classList.remove('theme-dark', 'dark');
      body.classList.add('theme-light', 'light');
      body.classList.remove('theme-dark', 'dark');
    } else {
      root.classList.add('theme-dark', 'dark');
      root.classList.remove('theme-light', 'light');
      body.classList.add('theme-dark', 'dark');
      body.classList.remove('theme-light', 'light');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Auto-Sync to Google Sheet State
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => loadAutoSync());
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);

  // Modals & Confirmation States
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isProcessingSync, setIsProcessingSync] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Generic Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsLoggedIn(true);
        setUserEmail(user.email);
        setAccessToken(token);

        // Auto background refresh from Google Sheet on start
        const savedSync = loadSheetSyncInfo();
        const targetId = savedSync?.spreadsheetId || TARGET_SHEET_ID;
        if (targetId && token) {
          fetchStoreDataFromGoogleSheet(token, targetId)
            .then((res) => {
              let updatedP = products;
              let updatedPur = purchases;
              let updatedS = sales;
              let updatedR = exchangeRate;

              if (res.products && res.products.length > 0) {
                setProducts(res.products);
                saveProducts(res.products);
                updatedP = res.products;
              }
              if (res.purchases) {
                setPurchases(res.purchases);
                savePurchases(res.purchases);
                updatedPur = res.purchases;
              }
              if (res.sales) {
                setSales(res.sales);
                saveSales(res.sales);
                updatedS = res.sales;
              }
              if (res.exchangeRate) {
                setExchangeRate(res.exchangeRate);
                saveExchangeRate(res.exchangeRate);
                updatedR = res.exchangeRate;
              }

              const newSyncInfo: GoogleSheetSyncInfo = {
                spreadsheetId: targetId,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetId}/edit`,
                spreadsheetTitle: res.spreadsheetTitle || savedSync?.spreadsheetTitle || 'Google Sheet របស់ហាង',
                lastSyncedAt: new Date().toISOString(),
                isSyncing: false,
                syncError: null,
              };
              setSyncInfo(newSyncInfo);
              saveSheetSyncInfo(newSyncInfo);

              // Update persistent snapshot of latest Google Sheet data
              saveLatestSheetSnapshot({
                products: updatedP,
                purchases: updatedPur,
                sales: updatedS,
                exchangeRate: updatedR,
                lastSyncedAt: new Date().toISOString(),
                spreadsheetId: targetId,
                spreadsheetTitle: res.spreadsheetTitle || savedSync?.spreadsheetTitle || 'Google Sheet របស់ហាង',
                userEmail: user.email,
              });
            })
            .catch((err) => {
              console.warn('Auto background sync notice:', err?.message || err);
            });
        }
      },
      () => {
        setIsLoggedIn(false);
        setUserEmail(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync to localStorage whenever states change
  useEffect(() => {
    saveProducts(products);
  }, [products]);

  useEffect(() => {
    savePurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    saveSales(sales);
  }, [sales]);

  useEffect(() => {
    saveExchangeRate(exchangeRate);
  }, [exchangeRate]);

  useEffect(() => {
    saveSheetSyncInfo(syncInfo);
  }, [syncInfo]);

  useEffect(() => {
    saveAutoSync(autoSyncEnabled);
  }, [autoSyncEnabled]);

  // Auth Handlers
  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setIsLoggedIn(true);
        setUserEmail(res.user.email);
        setAccessToken(res.accessToken);
        showToast('ចូលគណនី Google បានជោគជ័យ!');

        // Immediately auto-fetch latest data from Google Sheet upon login
        const savedSync = loadSheetSyncInfo();
        const targetId = savedSync?.spreadsheetId || TARGET_SHEET_ID;
        if (targetId && res.accessToken) {
          fetchStoreDataFromGoogleSheet(res.accessToken, targetId)
            .then((sheetRes) => {
              let updatedP = products;
              let updatedPur = purchases;
              let updatedS = sales;
              let updatedR = exchangeRate;

              if (sheetRes.products && sheetRes.products.length > 0) {
                setProducts(sheetRes.products);
                saveProducts(sheetRes.products);
                updatedP = sheetRes.products;
              }
              if (sheetRes.purchases) {
                setPurchases(sheetRes.purchases);
                savePurchases(sheetRes.purchases);
                updatedPur = sheetRes.purchases;
              }
              if (sheetRes.sales) {
                setSales(sheetRes.sales);
                saveSales(sheetRes.sales);
                updatedS = sheetRes.sales;
              }
              if (sheetRes.exchangeRate) {
                setExchangeRate(sheetRes.exchangeRate);
                saveExchangeRate(sheetRes.exchangeRate);
                updatedR = sheetRes.exchangeRate;
              }

              const newSyncInfo: GoogleSheetSyncInfo = {
                spreadsheetId: targetId,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetId}/edit`,
                spreadsheetTitle: sheetRes.spreadsheetTitle || savedSync?.spreadsheetTitle || 'Google Sheet របស់ហាង',
                lastSyncedAt: new Date().toISOString(),
                isSyncing: false,
                syncError: null,
              };
              setSyncInfo(newSyncInfo);
              saveSheetSyncInfo(newSyncInfo);

              saveLatestSheetSnapshot({
                products: updatedP,
                purchases: updatedPur,
                sales: updatedS,
                exchangeRate: updatedR,
                lastSyncedAt: new Date().toISOString(),
                spreadsheetId: targetId,
                spreadsheetTitle: sheetRes.spreadsheetTitle || savedSync?.spreadsheetTitle || 'Google Sheet របស់ហាង',
                userEmail: res.user.email,
              });

              showToast('បានធ្វើបច្ចុប្បន្នភាពទិន្នន័យចុងក្រោយពី Google Sheet ដោយស្វ័យប្រវត្តិ!');
            })
            .catch((err) => {
              console.warn('Post-login auto fetch notice:', err);
            });
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = String(err?.message || '');
      if (
        !msg.includes('popup_closed') &&
        !msg.includes('cancelled') &&
        !msg.includes('popup-closed') &&
        !msg.includes('access_denied')
      ) {
        showToast('ការចូលគណនី Google មិនបានសម្រេច៖ ' + (msg || 'សូមព្យាយាមម្តងទៀត'), 'error');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleLogout();
      setIsLoggedIn(false);
      setUserEmail(null);
      setAccessToken(null);
      // Reassure the user that the latest Google Sheet data remains completely preserved and active in the local app
      showToast('បានចាកចេញពីគណនី Google។ ទិន្នន័យចុងក្រោយពី Google Sheet នៅតែត្រូវបានរក្សាទុកក្នុងម៉ាស៊ីនសម្រាប់ការប្រើប្រាស់ជាបន្ត!');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // EXCHANGE RATE HANDLER (Buy Rate for Cost / Purchases, Sell Rate for Sales / Profit)
  const handleUpdateExchangeRate = (
    newBuyRate: number,
    newSellRate: number
  ) => {
    const updated: ExchangeRateConfig = {
      rate: newSellRate,
      buyRate: newBuyRate,
      sellRate: newSellRate,
      lastUpdated: new Date().toISOString(),
    };
    setExchangeRate(updated);
    saveExchangeRate(updated);

    // Update KHR values of all products:
    // costPriceKHR uses buyRate, salePriceKHR uses sellRate
    const updatedProducts = recalculateProductsKHR(products, newBuyRate, newSellRate);
    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    showToast(
      `អត្រាប្ដូរប្រាក់ ACLEDA ត្រូវបានកំណត់៖ ទិញ 1$ = ${newBuyRate.toLocaleString('km-KH')} ៛ | លក់ 1$ = ${newSellRate.toLocaleString('km-KH')} ៛`
    );
  };

  // PRODUCT ACTIONS
  const handleAddProduct = (newProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProd: Product = {
      ...newProductData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProd, ...prev]);
    showToast(`បានបញ្ចូលទំនិញ "${newProd.name}" ជោគជ័យ!`);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
    showToast(`បានកែប្រែទំនិញ "${updatedProd.name}" ជោគជ័យ!`);
  };

  const handleDeleteProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setConfirmConfig({
      isOpen: true,
      title: 'លុបទំនិញ',
      message: `តើអ្នកពិតជាចង់លុបទំនិញ "${prod.name}" (${prod.code}) មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ។`,
      confirmText: 'លុបទំនិញ',
      isDestructive: true,
      onConfirm: () => {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        showToast(`បានលុបទំនិញ "${prod.name}" រួចរាល់`);
      },
    });
  };

  // Automatic background export to Google Sheet when a sale or purchase is recorded
  const triggerAutoSyncExport = async (
    currentProducts: Product[],
    currentPurchases: PurchaseItem[],
    currentSales: SaleItem[],
    currentExchangeRate: ExchangeRateConfig
  ) => {
    const token = getAccessToken();
    const targetId = syncInfo.spreadsheetId || TARGET_SHEET_ID;

    if (!token) {
      showToast('Auto-Sync៖ សូមចូលគណនី Google ដើម្បីអាចធ្វើបច្ចុប្បន្នភាពទៅ Sheet ដោយស្វ័យប្រវត្តិ', 'error');
      return;
    }
    if (!targetId) return;

    setIsAutoSyncing(true);
    try {
      await syncDataToGoogleSheet(token, targetId, {
        products: currentProducts,
        purchases: currentPurchases,
        sales: currentSales,
        exchangeRate: currentExchangeRate,
      });

      const nowIso = new Date().toISOString();
      setSyncInfo((prev) => ({
        ...prev,
        lastSyncedAt: nowIso,
        syncError: null,
      }));
      showToast('Auto-Sync ជោគជ័យ៖ បានរក្សាទុកទិន្នន័យទៅ Google Sheet ដោយស្វ័យប្រវត្តិ!');
    } catch (err: any) {
      console.error('Auto-sync export error:', err);
      setSyncInfo((prev) => ({
        ...prev,
        syncError: err.message || 'Auto-sync failed',
      }));
      showToast('Auto-Sync ទៅ Google Sheet មិនបានសម្រេច៖ ' + (err.message || ''), 'error');
    } finally {
      setIsAutoSyncing(false);
    }
  };

  const handleToggleAutoSync = async () => {
    const nextState = !autoSyncEnabled;
    if (nextState) {
      const token = getAccessToken();
      if (!token) {
        showToast('សូមចូលគណនី Google ជាមុនសិន ដើម្បីដំណើរការ Auto-Sync', 'error');
        if (isLoggingIn) return;
        setIsLoggingIn(true);
        try {
          const res = await googleSignIn();
          if (res) {
            setIsLoggedIn(true);
            setUserEmail(res.user.email);
            setAccessToken(res.accessToken);
            setAutoSyncEnabled(true);
            showToast('បានចូល Google និងបើកដំណើរការ Auto-Sync ជោគជ័យ!');
          }
        } catch (err: any) {
          console.error('Login error during auto-sync toggle:', err);
          const msg = String(err?.message || '');
          if (
            !msg.includes('popup_closed') &&
            !msg.includes('cancelled') &&
            !msg.includes('popup-closed') &&
            !msg.includes('access_denied')
          ) {
            showToast('មិនអាចចូលគណនី Google បានទេ៖ ' + (msg || ''), 'error');
          }
        } finally {
          setIsLoggingIn(false);
        }
        return;
      }
      setAutoSyncEnabled(true);
      showToast('បានបើក Auto-Sync៖ រាល់ពេលមានការលក់ ឬទិញចូលថ្មី ទិន្នន័យនឹងត្រូវ Export ទៅ Google Sheet ដោយស្វ័យប្រវត្តិ!');
    } else {
      setAutoSyncEnabled(false);
      showToast('បានបិទ Auto-Sync');
    }
  };

  // PURCHASES ACTIONS (Stock In -> increments product stock)
  const handleAddPurchase = (purchaseData: Omit<PurchaseItem, 'id' | 'createdAt'>) => {
    const newPurchase: PurchaseItem = {
      ...purchaseData,
      id: `purch-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // 1. Add to purchases
    const updatedPurchases = [newPurchase, ...purchases];
    setPurchases(updatedPurchases);

    // 2. Increment product stock
    const updatedProducts = products.map((p) => {
      if (p.id === purchaseData.productId || p.code === purchaseData.productCode) {
        return {
          ...p,
          stockQuantity: p.stockQuantity + purchaseData.quantity,
          costPriceUSD: purchaseData.costPriceUSD,
          costPriceKHR: purchaseData.costPriceKHR,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setProducts(updatedProducts);

    showToast(
      `ទិញចូល "${purchaseData.productName}" ចំនួន ${purchaseData.quantity} ${purchaseData.unit} ជោគជ័យ (ស្តុកបានបន្ថែម)!`
    );

    // 3. Auto-Sync to Google Sheet if enabled
    if (autoSyncEnabled) {
      triggerAutoSyncExport(updatedProducts, updatedPurchases, sales, exchangeRate);
    }
  };

  const handleDeletePurchase = (purchaseId: string) => {
    const pc = purchases.find((p) => p.id === purchaseId);
    if (!pc) return;

    setConfirmConfig({
      isOpen: true,
      title: 'លុបកំណត់ត្រាទិញចូល',
      message: `តើអ្នកពិតជាចង់លុបវិក្កយបត្រទិញចូល ${pc.invoiceNo} (${pc.productName}) មែនទេ? ចំនួនស្តុក (${pc.quantity} ${pc.unit}) នឹងត្រូវបានដកចេញវិញ។`,
      confirmText: 'លុប និងដកស្តុកវិញ',
      isDestructive: true,
      onConfirm: () => {
        setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
        // Revert stock
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === pc.productId || p.code === pc.productCode) {
              return {
                ...p,
                stockQuantity: Math.max(0, p.stockQuantity - pc.quantity),
                updatedAt: new Date().toISOString(),
              };
            }
            return p;
          })
        );
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('បានលុបកំណត់ត្រាទិញចូល និងបង្វិលស្តុកវិញរួចរាល់');
      },
    });
  };

  // SALES ACTIONS (Stock Out -> decrements product stock)
  const handleAddSale = (saleData: Omit<SaleItem, 'id' | 'createdAt'>) => {
    const newSale: SaleItem = {
      ...saleData,
      id: `sale-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // 1. Add to sales
    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);

    // 2. Decrement product stock
    const updatedProducts = products.map((p) => {
      if (p.id === saleData.productId || p.code === saleData.productCode) {
        return {
          ...p,
          stockQuantity: Math.max(0, p.stockQuantity - saleData.quantity),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setProducts(updatedProducts);

    showToast(
      `កត់ត្រាលក់ "${saleData.productName}" ជោគជ័យ! ប្រាក់ចំណេញ៖ +$${saleData.profitUSD.toFixed(2)} (+${saleData.profitKHR.toLocaleString('km-KH')}៛)`
    );

    // 3. Auto-Sync to Google Sheet if enabled
    if (autoSyncEnabled) {
      triggerAutoSyncExport(updatedProducts, purchases, updatedSales, exchangeRate);
    }
  };

  const handleDeleteSale = (saleId: string) => {
    const s = sales.find((item) => item.id === saleId);
    if (!s) return;

    setConfirmConfig({
      isOpen: true,
      title: 'លុបការលក់',
      message: `តើអ្នកពិតជាចង់លុបការលក់វិក្កយបត្រ ${s.invoiceNo} (${s.productName}) មែនទេ? ចំនួនស្តុក (${s.quantity} ${s.unit}) នឹងត្រូវបានបង្វិលចូលស្តុកវិញ។`,
      confirmText: 'លុប និងបង្វិលចូលស្តុក',
      isDestructive: true,
      onConfirm: () => {
        setSales((prev) => prev.filter((item) => item.id !== saleId));
        // Revert product stock
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === s.productId || p.code === s.productCode) {
              return {
                ...p,
                stockQuantity: p.stockQuantity + s.quantity,
                updatedAt: new Date().toISOString(),
              };
            }
            return p;
          })
        );
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('បានលុបការលក់ និងបង្វិលចំនួនទំនិញចូលស្តុកវិញ');
      },
    });
  };

  // GOOGLE SHEETS ACTIONS
  const handleCreateNewSheet = async (title: string) => {
    const token = getAccessToken();
    if (!token) {
      showToast('សូមចូលគណនី Google ជាមុនសិន', 'error');
      return;
    }

    setIsProcessingSync(true);
    try {
      const created = await createStoreSpreadsheet(token, title);
      const newSyncInfo: GoogleSheetSyncInfo = {
        spreadsheetId: created.spreadsheetId,
        spreadsheetUrl: created.spreadsheetUrl,
        spreadsheetTitle: created.title,
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
        syncError: null,
      };

      // Immediately export current data to the newly created spreadsheet
      await syncDataToGoogleSheet(token, created.spreadsheetId, {
        products,
        purchases,
        sales,
        exchangeRate,
      });

      setSyncInfo(newSyncInfo);
      showToast('បានបង្កើត និងរក្សាទុកទិន្នន័យទៅ Google Sheet ថ្មីជោគជ័យ!');
    } catch (err: any) {
      console.error('Create sheet error:', err);
      showToast('បរាជ័យក្នុងការបង្កើត Google Sheet៖ ' + (err.message || 'សូមព្យាយាមម្តងទៀត'), 'error');
      throw err;
    } finally {
      setIsProcessingSync(false);
    }
  };

  const handleConnectExistingSheet = async (id: string) => {
    const token = getAccessToken();
    if (!token) {
      showToast('សូមចូលគណនី Google ជាមុនសិន', 'error');
      return;
    }

    setIsProcessingSync(true);
    try {
      const imported = await fetchStoreDataFromGoogleSheet(token, id);
      const newSyncInfo: GoogleSheetSyncInfo = {
        spreadsheetId: id,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
        spreadsheetTitle: imported.spreadsheetTitle || 'Google Sheet ដែលបានភ្ជាប់',
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
        syncError: null,
      };

      setSyncInfo(newSyncInfo);
      saveSheetSyncInfo(newSyncInfo);

      let importedCount = 0;
      let finalProducts = products;
      let finalPurchases = purchases;
      let finalSales = sales;
      let finalRate = exchangeRate;

      if (imported.products && imported.products.length > 0) {
        setProducts(imported.products);
        saveProducts(imported.products);
        finalProducts = imported.products;
        importedCount += imported.products.length;
      }
      if (imported.purchases) {
        setPurchases(imported.purchases);
        savePurchases(imported.purchases);
        finalPurchases = imported.purchases;
      }
      if (imported.sales) {
        setSales(imported.sales);
        saveSales(imported.sales);
        finalSales = imported.sales;
      }
      if (imported.exchangeRate) {
        setExchangeRate(imported.exchangeRate);
        saveExchangeRate(imported.exchangeRate);
        finalRate = imported.exchangeRate;
      }

      saveLatestSheetSnapshot({
        products: finalProducts,
        purchases: finalPurchases,
        sales: finalSales,
        exchangeRate: finalRate,
        lastSyncedAt: new Date().toISOString(),
        spreadsheetId: id,
        spreadsheetTitle: imported.spreadsheetTitle || 'Google Sheet ដែលបានភ្ជាប់',
        userEmail: userEmail,
      });

      showToast(
        `បានភ្ជាប់ និងទាញយកទិន្នន័យពី Google Sheet ជោគជ័យ! (${imported.products.length} ទំនិញ, ${imported.purchases.length} ទិញចូល, ${imported.sales.length} ការលក់)`
      );
    } catch (err: any) {
      console.error('Connect sheet error:', err);
      showToast('រកមិនឃើញ Google Sheet ឬគ្មានសិទ្ធិចូលមើល៖ ' + (err.message || ''), 'error');
      throw err;
    } finally {
      setIsProcessingSync(false);
    }
  };

  // Direct import function for the requested Google Sheet (ID: 159SBfFQDZElBC1ZzFzp2q92zHREpg0nNK9bdfXfgdjU)
  const handleDirectImportFromSheet = async (overrideId?: string) => {
    const targetId = overrideId || syncInfo.spreadsheetId || TARGET_SHEET_ID;
    let token = getAccessToken();

    // If user is not yet logged in with Google, prompt sign in first
    if (!token) {
      if (isLoggingIn) return;
      setIsLoggingIn(true);
      try {
        const res = await googleSignIn();
        if (!res?.accessToken) {
          return;
        }
        setIsLoggedIn(true);
        setUserEmail(res.user.email);
        setAccessToken(res.accessToken);
        token = res.accessToken;
      } catch (err: any) {
        console.error('Google Sign in error:', err);
        const msg = String(err?.message || '');
        if (
          !msg.includes('popup_closed') &&
          !msg.includes('cancelled') &&
          !msg.includes('popup-closed') &&
          !msg.includes('access_denied')
        ) {
          showToast('ការចូលគណនី Google មិនបានសម្រេច៖ ' + (msg || 'សូមព្យាយាមម្តងទៀត'), 'error');
        }
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    setIsProcessingSync(true);
    try {
      const result = await fetchStoreDataFromGoogleSheet(token, targetId);

      let pCount = 0;
      let purCount = 0;
      let sCount = 0;
      let finalProducts = products;
      let finalPurchases = purchases;
      let finalSales = sales;
      let finalRate = exchangeRate;

      if (result.products && result.products.length > 0) {
        setProducts(result.products);
        saveProducts(result.products);
        finalProducts = result.products;
        pCount = result.products.length;
      }
      if (result.purchases) {
        setPurchases(result.purchases);
        savePurchases(result.purchases);
        finalPurchases = result.purchases;
        purCount = result.purchases.length;
      }
      if (result.sales) {
        setSales(result.sales);
        saveSales(result.sales);
        finalSales = result.sales;
        sCount = result.sales.length;
      }
      if (result.exchangeRate) {
        setExchangeRate(result.exchangeRate);
        saveExchangeRate(result.exchangeRate);
        finalRate = result.exchangeRate;
      }

      const updatedSyncInfo: GoogleSheetSyncInfo = {
        spreadsheetId: targetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetId}/edit`,
        spreadsheetTitle: result.spreadsheetTitle || syncInfo.spreadsheetTitle || 'Google Sheet របស់ហាង',
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
        syncError: null,
      };
      setSyncInfo(updatedSyncInfo);
      saveSheetSyncInfo(updatedSyncInfo);

      saveLatestSheetSnapshot({
        products: finalProducts,
        purchases: finalPurchases,
        sales: finalSales,
        exchangeRate: finalRate,
        lastSyncedAt: new Date().toISOString(),
        spreadsheetId: targetId,
        spreadsheetTitle: result.spreadsheetTitle || syncInfo.spreadsheetTitle || 'Google Sheet របស់ហាង',
        userEmail: userEmail,
      });

      showToast(
        `ទាញយកទិន្នន័យពី Google Sheet បានជោគជ័យ៖ ${pCount} ទំនិញ, ${purCount} ទិញចូល, ${sCount} ការលក់!`
      );
    } catch (err: any) {
      console.error('Direct import error:', err);
      showToast('បរាជ័យក្នុងការទាញយកពី Google Sheet៖ ' + (err.message || ''), 'error');
    } finally {
      setIsProcessingSync(false);
    }
  };

  // Mandatory explicit confirmation for Google Sheets Export (mutates Sheet)
  const handleExportToSheetWithConfirmation = async () => {
    const token = getAccessToken();
    if (!token || !syncInfo.spreadsheetId) {
      setIsSheetModalOpen(true);
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'រក្សាទុកទិន្នន័យទៅ Google Sheet (Export)',
      message:
        'តើអ្នកពិតជាចង់រក្សាទុកទិន្នន័យទំនិញ ទិញចូល លក់ចេញ និងអត្រាប្ដូរប្រាក់ទាំងអស់ទៅកាន់ Google Sheet របស់អ្នកមែនទេ? ទិន្នន័យក្នុង Sheet នឹងត្រូវបានធ្វើបច្ចុប្បន្នភាព។',
      confirmText: 'រក្សាទុក (Export)',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setIsProcessingSync(true);
        try {
          await syncDataToGoogleSheet(token, syncInfo.spreadsheetId!, {
            products,
            purchases,
            sales,
            exchangeRate,
          });
          const now = new Date().toISOString();
          setSyncInfo((prev) => ({
            ...prev,
            lastSyncedAt: now,
            syncError: null,
          }));
          saveLatestSheetSnapshot({
            products,
            purchases,
            sales,
            exchangeRate,
            lastSyncedAt: now,
            spreadsheetId: syncInfo.spreadsheetId,
            spreadsheetTitle: syncInfo.spreadsheetTitle,
            userEmail,
          });
          showToast('បានរក្សាទុកទិន្នន័យទាំងអស់ទៅ Google Sheet ជោគជ័យ!');
        } catch (err: any) {
          console.error('Export error:', err);
          showToast('បរាជ័យក្នុងការរក្សាទុកទៅ Google Sheet៖ ' + (err.message || ''), 'error');
        } finally {
          setIsProcessingSync(false);
        }
      },
    });
  };

  // Mandatory explicit confirmation for Google Sheets Import (overwrites local app state)
  const handleImportFromSheetWithConfirmation = async () => {
    const token = getAccessToken();
    if (!token || !syncInfo.spreadsheetId) {
      setIsSheetModalOpen(true);
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'ទាញយកទិន្នន័យពី Google Sheet (Import)',
      message:
        'ការទាញយកពី Google Sheet នឹងជំនួសទិន្នន័យទំនិញ ទិញចូល និងលក់ចេញបច្ចុប្បន្នក្នុងកម្មវិធីដោយទិន្នន័យដែលមានក្នុង Google Sheet។ តើអ្នកពិតជាចង់បន្តមែនទេ?',
      confirmText: 'ទាញយក និងជំនួស',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setIsProcessingSync(true);
        try {
          const result = await fetchStoreDataFromGoogleSheet(token, syncInfo.spreadsheetId!);
          let finalProducts = products;
          let finalPurchases = purchases;
          let finalSales = sales;
          let finalRate = exchangeRate;

          if (result.products.length > 0) {
            setProducts(result.products);
            finalProducts = result.products;
          }
          if (result.purchases) {
            setPurchases(result.purchases);
            finalPurchases = result.purchases;
          }
          if (result.sales) {
            setSales(result.sales);
            finalSales = result.sales;
          }
          if (result.exchangeRate) {
            setExchangeRate(result.exchangeRate);
            finalRate = result.exchangeRate;
          }

          const now = new Date().toISOString();
          setSyncInfo((prev) => ({
            ...prev,
            lastSyncedAt: now,
            syncError: null,
          }));

          saveLatestSheetSnapshot({
            products: finalProducts,
            purchases: finalPurchases,
            sales: finalSales,
            exchangeRate: finalRate,
            lastSyncedAt: now,
            spreadsheetId: syncInfo.spreadsheetId,
            spreadsheetTitle: result.spreadsheetTitle || syncInfo.spreadsheetTitle,
            userEmail,
          });

          showToast(
            `ទាញយកបានជោគជ័យ៖ ${result.products.length} ទំនិញ, ${result.purchases.length} ទិញចូល, ${result.sales.length} ការលក់!`
          );
        } catch (err: any) {
          console.error('Import error:', err);
          showToast('បរាជ័យក្នុងការទាញយកពី Google Sheet៖ ' + (err.message || ''), 'error');
        } finally {
          setIsProcessingSync(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200 w-full max-w-full overflow-x-clip">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`rounded-2xl px-4 py-3 shadow-2xl border text-xs font-semibold flex items-center gap-2.5 ${
              toastMessage.type === 'error'
                ? 'bg-[#220B10] text-rose-200 border-rose-900/60'
                : 'bg-[#161920] text-white border-[#2D333E]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                toastMessage.type === 'error' ? 'bg-rose-400' : 'bg-emerald-400'
              }`}
            />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Navigation Header */}
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        exchangeRate={exchangeRate}
        onUpdateExchangeRate={handleUpdateExchangeRate}
        syncInfo={syncInfo}
        isLoggedIn={isLoggedIn}
        isLoggingIn={isLoggingIn}
        userEmail={userEmail}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        onQuickSync={() => handleDirectImportFromSheet()}
        isSyncing={isProcessingSync}
        onLogin={handleLogin}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area: Expanded Workspace */}
      <main className="flex-1 w-full max-w-[1760px] mx-auto px-2 sm:px-4 lg:px-5 py-2 sm:py-2.5 space-y-2.5 sm:space-y-3">
        {/* Google Sheet Direct Sync & Import Banner (Sleek, Compact Ribbon) */}
        <section
          id="google-sheet-quick-card"
          className="rounded-xl border border-emerald-500/30 bg-[#131720] px-2.5 sm:px-3.5 py-2 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <FileSpreadsheet className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">
                  Google Sheet: {syncInfo.spreadsheetTitle || 'ទិន្នន័យហាង'}
                </h3>
                <span
                  className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-medium truncate max-w-[130px] sm:max-w-none"
                  title={`Sheet ID: ${syncInfo.spreadsheetId || TARGET_SHEET_ID}`}
                >
                  ID: {syncInfo.spreadsheetId || TARGET_SHEET_ID}
                </span>
                {isLoggedIn ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {userEmail}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-medium bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md" title="ទិន្នន័យចុងក្រោយពី Google Sheet ត្រូវបានរក្សាទុកក្នុងម៉ាស៊ីនរួចរាល់">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span>ទិន្នន័យចុងក្រោយពី Sheet</span>
                  </span>
                )}
                {syncInfo.lastSyncedAt ? (
                  <span className="text-slate-400 text-[10px] hidden md:inline">
                    • ធ្វើបច្ចុប្បន្នភាព៖ {new Date(syncInfo.lastSyncedAt).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[10px] hidden md:inline">
                    • រក្សាទុកក្នុងម៉ាស៊ីន (Local Storage)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Auto-Sync Toggle Switch */}
              <div
                id="auto-sync-toggle-group"
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all ${
                  autoSyncEnabled
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 shadow-sm'
                    : 'bg-[#161920] border-[#2D333E] text-slate-400 hover:border-slate-600'
                }`}
                title={
                  autoSyncEnabled
                    ? 'Auto-Sync កំពុងដំណើរការ៖ ពេលកត់ត្រាលក់ ឬទិញចូលថ្មី ទិន្នន័យនឹងត្រូវ Export ទៅ Google Sheet ដោយស្វ័យប្រវត្តិ'
                    : 'ចុចដើម្បីបើក Auto-Sync ទៅ Google Sheet ដោយស្វ័យប្រវត្តិនីមួយៗពេលលក់ ឬទិញចូលថ្មី'
                }
              >
                <div
                  className="flex items-center gap-1.5 text-xs font-semibold select-none cursor-pointer"
                  onClick={handleToggleAutoSync}
                >
                  <Zap
                    className={`h-3.5 w-3.5 transition-colors ${
                      autoSyncEnabled ? 'text-emerald-400 fill-emerald-400/30 animate-pulse' : 'text-slate-500'
                    }`}
                  />
                  <span className="text-[11px] sm:text-xs">Auto-Sync</span>
                </div>

                <button
                  id="toggle-auto-sync"
                  type="button"
                  role="switch"
                  aria-checked={autoSyncEnabled}
                  onClick={handleToggleAutoSync}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-[#131720] ${
                    autoSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                  title={autoSyncEnabled ? 'ចុចដើម្បីបិទ Auto-Sync' : 'ចុចដើម្បីបើក Auto-Sync'}
                >
                  <span className="sr-only">Toggle Auto-Sync to Google Sheet</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>

                {isAutoSyncing && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400 shrink-0" title="កំពុង Auto-Sync ទៅ Google Sheet..." />
                )}
              </div>

              {/* Primary Action Button: Import / Download */}
              <button
                id="btn-quick-import-sheet"
                type="button"
                disabled={isProcessingSync || isLoggingIn || isAutoSyncing}
                onClick={() => handleDirectImportFromSheet()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
              >
                {isProcessingSync ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                ) : isLoggedIn ? (
                  <DownloadCloud className="h-3.5 w-3.5 text-white" />
                ) : (
                  <LogIn className="h-3.5 w-3.5 text-white" />
                )}
                <span>
                  {isLoggedIn
                    ? 'ទាញយកទិន្នន័យ (Import)'
                    : 'ចូល Google & ទាញយក'}
                </span>
              </button>

              {/* Secondary Export Button */}
              {isLoggedIn && (
                <button
                  id="btn-quick-export-sheet"
                  type="button"
                  disabled={isProcessingSync || isAutoSyncing}
                  onClick={handleExportToSheetWithConfirmation}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#2D333E] bg-[#1A1F29] px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[#252C3A] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  title="រក្សាទុកទិន្នន័យបច្ចុប្បន្នទៅ Google Sheet"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">រក្សាទុក (Export)</span>
                </button>
              )}

              {/* Link to view Spreadsheet */}
              <a
                id="link-open-spreadsheet"
                href={`https://docs.google.com/spreadsheets/d/${syncInfo.spreadsheetId || TARGET_SHEET_ID}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[#2D333E] bg-[#1A1F29] px-2 py-1.5 text-xs font-medium text-slate-300 hover:bg-[#252C3A] hover:text-white transition-colors whitespace-nowrap"
                title="បើក Google Sheet ក្នុងផ្ទាំងថ្មី"
              >
                <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden lg:inline">មើល Sheet</span>
              </a>

              {/* Open full modal for custom ID / create new */}
              <button
                id="btn-open-sync-settings"
                type="button"
                onClick={() => setIsSheetModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#2D333E] bg-[#161920] px-2 py-1.5 text-xs font-medium text-slate-300 hover:bg-[#222834] hover:text-white transition-colors cursor-pointer"
                title="ការកំណត់ Google Sheet"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </section>

        {activePage === 'products' && (
          <ProductsPage
            products={products}
            exchangeRate={exchangeRate}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onSyncFromSheet={() => handleDirectImportFromSheet()}
            isSyncing={isProcessingSync}
          />
        )}

        {activePage === 'purchases' && (
          <PurchasesPage
            products={products}
            purchases={purchases}
            exchangeRate={exchangeRate}
            onAddPurchase={handleAddPurchase}
            onDeletePurchase={handleDeletePurchase}
            onNavigateToReports={() => {
              setReportSubTab('purchases');
              setActivePage('reports');
            }}
          />
        )}

        {activePage === 'sales' && (
          <SalesPage
            products={products}
            sales={sales}
            exchangeRate={exchangeRate}
            onAddSale={handleAddSale}
            onDeleteSale={handleDeleteSale}
            onNavigateToReports={() => {
              setReportSubTab('sales');
              setActivePage('reports');
            }}
          />
        )}

        {activePage === 'reports' && (
          <ReportsPage
            products={products}
            purchases={purchases}
            sales={sales}
            exchangeRate={exchangeRate}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
            onDeleteSale={handleDeleteSale}
            onDeletePurchase={handleDeletePurchase}
            initialTab={reportSubTab}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#2D333E] bg-[#161920]/80 backdrop-blur-md py-4 text-center text-xs text-slate-400">
        <div className="max-w-[1760px] mx-auto px-2.5 sm:px-4 lg:px-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            ប្រព័ន្ធគ្រប់គ្រងទំនិញ ទិញចូល លក់ចេញ និងរបាយការណ៍ • គាំទ្ររូបិយប័ណ្ណ ដុល្លារ ($) និង រៀល (៛)
          </span>
          <span className="font-mono text-[11px] text-emerald-400 font-semibold">
            អត្រាបច្ចុប្បន្ន៖ 1$ = {exchangeRate.rate.toLocaleString('km-KH')} ៛
          </span>
        </div>
      </footer>

      {/* Google Sheets Connection Modal */}
      <GoogleSheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        syncInfo={syncInfo}
        isLoggedIn={isLoggedIn}
        isLoggingIn={isLoggingIn}
        userEmail={userEmail}
        onLogin={handleLogin}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onExportToSheet={handleExportToSheetWithConfirmation}
        onImportFromSheet={handleImportFromSheetWithConfirmation}
        isProcessing={isProcessingSync}
        productCount={products.length}
        purchaseCount={purchases.length}
        saleCount={sales.length}
      />

      {/* Generic Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
