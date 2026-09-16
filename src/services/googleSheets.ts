import { Product, PurchaseItem, SaleItem, ExchangeRateConfig } from '../types';

export interface SheetExportPayload {
  products: Product[];
  purchases: PurchaseItem[];
  sales: SaleItem[];
  exchangeRate: ExchangeRateConfig;
}

export interface SheetImportResult {
  spreadsheetTitle?: string;
  products: Product[];
  purchases: PurchaseItem[];
  sales: SaleItem[];
  exchangeRate?: ExchangeRateConfig;
}

const SHEET_NAMES = {
  PRODUCTS: 'Products',
  PURCHASES: 'Purchases',
  SALES: 'Sales',
  SETTINGS: 'Settings',
};

/**
 * Normalize image URL and convert Google Drive sharing links to direct embeddable URLs
 */
export const normalizeImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  const driveMatch = trimmed.match(/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w500`;
  }
  return trimmed;
};

/**
 * Clean currency strings like "$12.50", "4,100 ៛", " 2,500 " into clean numbers
 */
export const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val === null || val === undefined) return 0;
  const str = String(val).replace(/[$៛\s,]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

/**
 * Extract Spreadsheet ID from input string (can be a full Google Sheets URL or raw ID)
 */
export const extractSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

/**
 * Create a new Google Spreadsheet in Google Drive with the 4 tabs pre-configured
 */
export const createStoreSpreadsheet = async (
  accessToken: string,
  title: string = 'ប្រព័ន្ធគ្រប់គ្រងទំនិញ និងទិញលក់ (Store Data)'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> => {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const body = {
    properties: {
      title,
    },
    sheets: [
      { properties: { title: SHEET_NAMES.PRODUCTS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.PURCHASES, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.SALES, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEET_NAMES.SETTINGS, gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'មិនអាចបង្កើត Google Sheet បានទេ');
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties.title,
  };
};

/**
 * Ensure sheets exist in an existing spreadsheet
 */
export const ensureSheetsExist = async (
  accessToken: string,
  spreadsheetId: string
): Promise<string[]> => {
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  const metaRes = await fetch(metadataUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json();
    throw new Error(err.error?.message || 'រកមិនឃើញ Google Sheet នេះទេ');
  }

  const metaData = await metaRes.json();
  const existingSheetTitles: string[] = (metaData.sheets || []).map(
    (s: { properties: { title: string } }) => s.properties.title
  );

  const missingSheets = Object.values(SHEET_NAMES).filter(
    (title) => !existingSheetTitles.some((s) => s.toLowerCase() === title.toLowerCase() || (title === 'Products' && /products?|ទំនិញ/i.test(s)))
  );

  if (missingSheets.length > 0) {
    const requests = missingSheets.map((title) => ({
      addSheet: {
        properties: { title },
      },
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  }

  return [...existingSheetTitles, ...missingSheets];
};

/**
 * Export / Save all application data to Google Sheets
 */
export const syncDataToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  payload: SheetExportPayload
): Promise<void> => {
  const sheetTitles = await ensureSheetsExist(accessToken, spreadsheetId);
  const prodSheetTitle =
    sheetTitles.find((s) => s.toLowerCase() === 'products') ||
    sheetTitles.find((s) => s === SHEET_NAMES.PRODUCTS) ||
    sheetTitles.find((s) => /products?|ទំនិញ/i.test(s)) ||
    SHEET_NAMES.PRODUCTS;
  const purchSheetTitle =
    sheetTitles.find((s) => s === SHEET_NAMES.PURCHASES) ||
    sheetTitles.find((s) => /purchas|ទិញ/i.test(s)) ||
    SHEET_NAMES.PURCHASES;
  const salesSheetTitle =
    sheetTitles.find((s) => s === SHEET_NAMES.SALES) ||
    sheetTitles.find((s) => /sales?|លក់/i.test(s)) ||
    SHEET_NAMES.SALES;
  const settingsSheetTitle =
    sheetTitles.find((s) => s === SHEET_NAMES.SETTINGS) ||
    sheetTitles.find((s) => /settings?|កំណត់/i.test(s)) ||
    SHEET_NAMES.SETTINGS;

  // 1. Prepare Products Sheet values
  // Mapped strictly according to user specification:
  // Sheet: "Products"
  // Col A:A (index 0) -> category
  // Col B:B (index 1) -> productid
  // Col C:C (index 2) -> productname
  // Col D:D (index 3) -> unit
  // Col E:E (index 4) -> Part
  // Col F:F (index 5) -> buypriceU
  // Col G:G (index 6) -> buypriceR
  // Col H:H (index 7) -> sellpriceR
  // Col I:I (index 8) -> stock
  // Col J:J (index 9) -> image
  const productHeaders = [
    'category',    // Col A:A (index 0)
    'productid',   // Col B:B (index 1)
    'productname', // Col C:C (index 2)
    'unit',        // Col D:D (index 3)
    'Part',        // Col E:E (index 4)
    'buypriceU',   // Col F:F (index 5)
    'buypriceR',   // Col G:G (index 6)
    'sellpriceR',  // Col H:H (index 7)
    'stock',       // Col I:I (index 8)
    'image',       // Col J:J (index 9)
  ];

  const productRows = payload.products.map((p) => [
    p.category || 'ទូទៅ',
    p.code,
    p.name,
    p.unit || '1',
    p.part || '0',
    p.costPriceUSD,
    p.costPriceKHR,
    p.salePriceKHR || Math.round((p.salePriceUSD || 0) * (payload.exchangeRate?.sellRate || payload.exchangeRate?.rate || 4050)),
    p.stockQuantity,
    p.imageUrl || '',
  ]);

  // 2. Prepare Purchases Sheet values
  const purchaseHeaders = [
    'ID',
    'កាលបរិច្ឆេទ',
    'លេខកូដទំនិញ',
    'ឈ្មោះទំនិញ',
    'ចំនួនទិញចូល',
    'ឯកតា',
    'តម្លៃឯកតា($)',
    'តម្លៃឯកតា(៛)',
    'សរុបទិញ($)',
    'សរុបទិញ(៛)',
    'អត្រាប្ដូរប្រាក់ (៛/$)',
    'អ្នកផ្គត់ផ្គង់',
    'លេខវិក្កយបត្រ',
    'កំណត់សម្គាល់',
  ];

  const purchaseRows = payload.purchases.map((pc) => [
    pc.id,
    pc.purchaseDate,
    pc.productCode,
    pc.productName,
    pc.quantity,
    pc.unit,
    pc.costPriceUSD,
    pc.costPriceKHR,
    pc.totalUSD,
    pc.totalKHR,
    pc.exchangeRate,
    pc.supplierName || '',
    pc.invoiceNo || '',
    pc.notes || '',
  ]);

  // 3. Prepare Sales Sheet values
  const saleHeaders = [
    'ID',
    'កាលបរិច្ឆេទ',
    'លេខកូដទំនិញ',
    'ឈ្មោះទំនិញ',
    'ចំនួនលក់',
    'ឯកតា',
    'តម្លៃលក់($)',
    'តម្លៃលក់(៛)',
    'សរុបលក់($)',
    'សរុបលក់(៛)',
    'ថ្លៃដើមឯកតា($)',
    'ថ្លៃដើមឯកតា(៛)',
    'ថ្លៃដើមសរុប($)',
    'ថ្លៃដើមសរុប(៛)',
    'ប្រាក់ចំណេញ($)',
    'ប្រាក់ចំណេញ(៛)',
    'អត្រាប្ដូរប្រាក់ (៛/$)',
    'អតិថិជន',
    'វិធីទូទាត់',
    'លេខវិក្កយបត្រ',
    'កំណត់សម្គាល់',
  ];

  const saleRows = payload.sales.map((s) => [
    s.id,
    s.saleDate,
    s.productCode,
    s.productName,
    s.quantity,
    s.unit,
    s.salePriceUSD,
    s.salePriceKHR,
    s.totalSaleUSD,
    s.totalSaleKHR,
    s.costPriceUSD,
    s.costPriceKHR,
    s.totalCostUSD,
    s.totalCostKHR,
    s.profitUSD,
    s.profitKHR,
    s.exchangeRate,
    s.customerName || '',
    s.paymentMethod,
    s.invoiceNo || '',
    s.notes || '',
  ]);

  // 4. Settings Sheet values (Exchange rate)
  const settingsHeaders = ['ឈ្មោះការកំណត់', 'តម្លៃ', 'កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព'];
  const settingsRows = [
    ['អត្រាទិញ (Buy Rate KHR)', payload.exchangeRate.buyRate || payload.exchangeRate.rate, payload.exchangeRate.lastUpdated],
    ['អត្រាលក់ (Sell Rate KHR)', payload.exchangeRate.sellRate || payload.exchangeRate.rate, payload.exchangeRate.lastUpdated],
    ['អត្រាប្ដូរប្រាក់ទូទៅ (KHR per 1 USD)', payload.exchangeRate.rate, payload.exchangeRate.lastUpdated],
    ['ប្រភពអត្រា (Source)', 'បញ្ចូលដោយដៃ', payload.exchangeRate.lastUpdated],
    ['កាលបរិច្ឆេទ Sync ចុងក្រោយ', new Date().toLocaleString('km-KH'), new Date().toISOString()],
  ];

  // Clear existing content and write new
  const clearRanges = [
    `'${prodSheetTitle}'!A1:Z5000`,
    `'${purchSheetTitle}'!A1:Z5000`,
    `'${salesSheetTitle}'!A1:Z5000`,
    `'${settingsSheetTitle}'!A1:Z100`,
  ];

  for (const range of clearRanges) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  }

  // Batch update with full data
  const updateBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: `'${prodSheetTitle}'!A1`,
        values: [productHeaders, ...productRows],
      },
      {
        range: `'${purchSheetTitle}'!A1`,
        values: [purchaseHeaders, ...purchaseRows],
      },
      {
        range: `'${salesSheetTitle}'!A1`,
        values: [saleHeaders, ...saleRows],
      },
      {
        range: `'${settingsSheetTitle}'!A1`,
        values: [settingsHeaders, ...settingsRows],
      },
    ],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateBody),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    throw new Error(err.error?.message || 'បរាជ័យក្នុងការរក្សាទុកទៅ Google Sheet');
  }
};

/**
 * Fetch / Import data from an existing Google Sheet
 */
export const fetchStoreDataFromGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string
): Promise<SheetImportResult> => {
  // 1. Get spreadsheet metadata first
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties,properties.title`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json();
    const rawMsg = err.error?.message || '';
    if (metaRes.status === 403 || rawMsg.toLowerCase().includes('permission')) {
      throw new Error(
        'មិនមានសិទ្ធិចូលមើល Google Sheet នេះទេ (Permission Denied)។ សូមប្រាកដថាគណនី Google របស់អ្នកមានសិទ្ធិ ឬ Sheet ត្រូវបាន Share។'
      );
    }
    if (metaRes.status === 404 || rawMsg.toLowerCase().includes('not found')) {
      throw new Error(`រកមិនឃើញ Google Sheet ID: "${spreadsheetId}" ទេ។ សូមពិនិត្យមើល ID ឡើងវិញ។`);
    }
    throw new Error(rawMsg || 'បរាជ័យក្នុងការទាញយកទិន្នន័យពី Google Sheet');
  }

  const metaData = await metaRes.json();
  const spreadsheetTitle: string = metaData.properties?.title || 'Google Sheet';
  const sheetList: string[] = (metaData.sheets || [])
    .map((s: { properties: { title: string } }) => s.properties?.title)
    .filter(Boolean);

  // 2. Dynamically match sheets
  const productsSheetName =
    sheetList.find((s) => s.toLowerCase() === 'products') ||
    sheetList.find((s) => s.toLowerCase() === 'product') ||
    sheetList.find((s) => s === SHEET_NAMES.PRODUCTS) ||
    sheetList.find((s) => /ទំនិញ|product|item|inventory|stock/i.test(s)) ||
    (sheetList.length === 1 ? sheetList[0] : null);

  const purchasesSheetName =
    sheetList.find((s) => s.toLowerCase() === 'buyins') ||
    sheetList.find((s) => s.toLowerCase() === 'buyin') ||
    sheetList.find((s) => s === SHEET_NAMES.PURCHASES) ||
    sheetList.find((s) => /ទិញ|purchas|buy|stock.*in/i.test(s));

  const salesSheetName =
    sheetList.find((s) => s.toLowerCase() === 'sellouts') ||
    sheetList.find((s) => s.toLowerCase() === 'sellout') ||
    sheetList.find((s) => s === SHEET_NAMES.SALES) ||
    sheetList.find((s) => /លក់|sale|sell|stock.*out/i.test(s));

  const settingsSheetName =
    sheetList.find((s) => s === SHEET_NAMES.SETTINGS) ||
    sheetList.find((s) => /កំណត់|setting|config|rate/i.test(s));

  const rangesToFetch: { key: 'products' | 'purchases' | 'sales' | 'settings'; range: string }[] = [];
  if (productsSheetName) {
    rangesToFetch.push({ key: 'products', range: `'${productsSheetName}'!A:Z` });
  }
  if (purchasesSheetName) {
    rangesToFetch.push({ key: 'purchases', range: `'${purchasesSheetName}'!A:Z` });
  }
  if (salesSheetName) {
    rangesToFetch.push({ key: 'sales', range: `'${salesSheetName}'!A:Z` });
  }
  if (settingsSheetName) {
    rangesToFetch.push({ key: 'settings', range: `'${settingsSheetName}'!A:Z` });
  }

  if (rangesToFetch.length === 0 && sheetList.length > 0) {
    // Fallback: fetch the very first sheet
    rangesToFetch.push({ key: 'products', range: `'${sheetList[0]}'!A:Z` });
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesToFetch
    .map((r) => `ranges=${encodeURIComponent(r.range)}`)
    .join('&')}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'បរាជ័យក្នុងការទាញយកទិន្នន័យពី Google Sheet');
  }

  const result = await res.json();
  const valueRanges = result.valueRanges || [];

  const dataMap: Record<string, any[][]> = {};
  rangesToFetch.forEach((item, index) => {
    dataMap[item.key] = valueRanges[index]?.values || [];
  });

  // 3. Parse Settings (Exchange Rate) first if present
  let exchangeRate: ExchangeRateConfig | undefined = undefined;
  let defaultRate = 4050;
  let buyRate = 4043;
  let sellRate = 4057;
  let lastUpdated = new Date().toISOString();
  let source = 'ACLEDA Bank';
  const settingValues = dataMap['settings'] || [];
  for (const row of settingValues) {
    const label = String(row[0] || '').toLowerCase();
    const val = cleanNumber(row[1]);
    if (val > 0) {
      if (label.includes('buy') || label.includes('ទិញ')) {
        buyRate = val;
      } else if (label.includes('sell') || label.includes('លក់')) {
        sellRate = val;
      } else if (label.includes('rate') || label.includes('អត្រា') || label.includes('khr')) {
        defaultRate = val;
      }
    }
    if (label.includes('source') || label.includes('ប្រភព')) {
      source = String(row[1] || 'ACLEDA Bank');
    }
    if (row[2]) lastUpdated = String(row[2]);
  }
  if (settingValues.length > 0) {
    exchangeRate = {
      rate: defaultRate,
      buyRate,
      sellRate,
      lastUpdated,
    };
  }

  // Helper to find column index from header row
  const findCol = (headers: string[], regex: RegExp, fallback: number): number => {
    const idx = headers.findIndex((h) => regex.test(h));
    return idx !== -1 ? idx : fallback;
  };

  // 4. Parse Products
  const products: Product[] = [];
  const prodValues = dataMap['products'] || [];
  if (prodValues.length > 0) {
    // Find header row by looking for "category", "productname", "buyprice", "sellprice", "stock", "image", "ទំនិញ", etc.
    const headerRowIndex = prodValues.slice(0, 5).findIndex((r: any[]) =>
      (r || []).some((cell: any) =>
        /category|productid|productname|product_name|^name$|buyprice|buyorice|sellprice|stock|image|#\s*part|#\s*រាយ|ទំនិញ|ឈ្មោះ.*ទំនិញ/i.test(
          String(cell || '').trim()
        )
      )
    );
    const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;
    const headers = headerRowIndex !== -1 ? (prodValues[headerRowIndex] || []).map((h: any) => String(h || '').trim()) : [];

    const colId = findCol(headers, /^uuid$/i, -1);
    // In user's Google Sheet strictly mapped as requested:
    // A:A (index 0) -> category
    // B:B (index 1) -> productid
    // C:C (index 2) -> productname
    // D:D (index 3) -> unit
    // E:E (index 4) -> Part
    // F:F (index 5) -> buypriceU (or buyoriceU)
    // G:G (index 6) -> buypriceR
    // H:H (index 7) -> sellpriceR
    // I:I (index 8) -> stock
    // J:J (index 9) -> image
    const colCategory = findCol(headers, /^category$|^cat$|^ប្រភេទ$|^type$|^ប្រភេទទំនិញ$/i, 0);
    const colCode = findCol(headers, /^productid$|^product_id$|^id$|^code$|កូដ|sku|ពាក្យកាត់/i, 1);
    const colName = findCol(headers, /^productname$|^product_name$|^name$|^ទំនិញ$|ឈ្មោះ.*ទំនិញ|^ឈ្មោះ$/i, 2);
    const colUnit = findCol(headers, /^unit$|#.*រាយ|^រាយ$|^ឯកតា$/i, 3);
    const colPart = findCol(headers, /^part$|#\s*part|#\s*ផ្នែក|^ផ្នែក$|department|dept/i, 4);
    const colCostUSD = findCol(headers, /^buypriceu$|^buyoriceu$|^buyprice.*usd$|buy.*usd|តម្លៃទិញ.*\$|ទិញ.*\$|ទិញ.*ដុល្លារ|ថ្លៃដើម.*\$|cost.*usd|cost.*price/i, 5);
    const colCostKHR = findCol(headers, /^buypricer$|^buyprice.*r$|^buyprice.*khr$|buy.*khr|តម្លៃទិញ.*៛|ទិញ.*៛|ទិញ.*រៀល|ថ្លៃដើម.*៛|cost.*khr|cost.*រៀល/i, 6);
    const colSaleR = findCol(headers, /^sellpricer$|^sellprice.*r$|^sellprice.*khr$|^sellprice$|sell.*khr|តម្លៃលក់.*៛|លក់.*៛|តម្លៃលក់|price.*khr|sale.*រៀល|sale.*khr|sale.*price/i, 7);
    const colStock = findCol(headers, /^stock$|^qty$|^quantity$|ចំនួន.*ស្តុក|^ចំនួន|^ស្តុក$|balance/i, 8);
    const colImage = 9; // Strictly use J:J (index 9) as requested
    const colMinStock = findCol(headers, /អាសន្ន|alert|min/i, 10);
    const colNotes = findCol(headers, /សម្គាល់|note|remark/i, 11);
    const colCreated = findCol(headers, /កាលបរិច្ឆេទ|date|created/i, 12);

    const seenProdIds = new Set<string>();

    for (let i = startRow; i < prodValues.length; i++) {
      const row = prodValues[i];
      if (!row || row.length === 0) continue;

      // 1. Category strictly from Col A:A (index 0) or colCategory
      let rawCategory = '';
      if (colCategory !== -1 && row[colCategory] !== undefined && row[colCategory] !== null && String(row[colCategory]).trim() !== '') {
        rawCategory = String(row[colCategory]).trim();
      } else if (row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '') {
        rawCategory = String(row[0]).trim();
      }
      if (rawCategory.startsWith('http') || rawCategory.startsWith('data:image')) {
        rawCategory = '';
      }

      // 2. Product ID (Code) from Col B:B (index 1) or colCode
      let rawCode = '';
      if (colCode !== -1 && row[colCode] !== undefined && row[colCode] !== null && String(row[colCode]).trim() !== '') {
        rawCode = String(row[colCode]).trim();
      } else if (row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== '') {
        rawCode = String(row[1]).trim();
      }

      // 3. Product Name from Col C:C (index 2) or colName
      let rawName = '';
      if (colName !== -1 && row[colName] !== undefined && row[colName] !== null && String(row[colName]).trim() !== '') {
        rawName = String(row[colName]).trim();
      } else if (row[2] !== undefined && row[2] !== null && String(row[2]).trim() !== '') {
        rawName = String(row[2]).trim();
      }

      if (!rawCode && !rawName && !rawCategory) continue; // Skip completely empty item rows

      // 4. Unit from Col D:D (index 3) or colUnit
      let rawUnit = '';
      if (colUnit !== -1 && row[colUnit] !== undefined && row[colUnit] !== null && String(row[colUnit]).trim() !== '') {
        rawUnit = String(row[colUnit]).trim();
      } else if (row[3] !== undefined && row[3] !== null && String(row[3]).trim() !== '') {
        rawUnit = String(row[3]).trim();
      } else {
        rawUnit = '1';
      }

      // 5. Part from Col E:E (index 4) or colPart
      let rawPart = '';
      if (colPart !== -1 && row[colPart] !== undefined && row[colPart] !== null && String(row[colPart]).trim() !== '') {
        rawPart = String(row[colPart]).trim();
      } else if (row[4] !== undefined && row[4] !== null && String(row[4]).trim() !== '') {
        rawPart = String(row[4]).trim();
      }
      if (!rawPart) rawPart = '0';

      // 6. Buy Price USD from Col F:F (index 5) or colCostUSD (buypriceU / buyoriceU)
      let costPriceUSD = 0;
      if (colCostUSD !== -1 && row[colCostUSD] !== undefined && row[colCostUSD] !== null && String(row[colCostUSD]).trim() !== '') {
        costPriceUSD = cleanNumber(row[colCostUSD]);
      } else if (row[5] !== undefined && row[5] !== null && String(row[5]).trim() !== '') {
        costPriceUSD = cleanNumber(row[5]);
      }

      // 7. Buy Price KHR from Col G:G (index 6) or colCostKHR (buypriceR)
      let costPriceKHR = 0;
      if (colCostKHR !== -1 && row[colCostKHR] !== undefined && row[colCostKHR] !== null && String(row[colCostKHR]).trim() !== '') {
        costPriceKHR = cleanNumber(row[colCostKHR]);
      } else if (row[6] !== undefined && row[6] !== null && String(row[6]).trim() !== '') {
        costPriceKHR = cleanNumber(row[6]);
      }

      // 8. Sell Price (sellpriceR) from Col H:H (index 7) or colSaleR
      let salePriceUSD = 0;
      let salePriceKHR = 0;
      const rawSaleH = (colSaleR !== -1 && row[colSaleR] !== undefined && row[colSaleR] !== null && String(row[colSaleR]).trim() !== '')
        ? String(row[colSaleR]).trim()
        : (row[7] !== undefined && row[7] !== null ? String(row[7]).trim() : '');

      if (rawSaleH !== '') {
        const valH = cleanNumber(rawSaleH);
        // If it starts with $ or contains $ or is a small decimal without ៛, treat as USD
        if (rawSaleH.includes('$') || (!rawSaleH.includes('៛') && valH > 0 && valH < 100)) {
          salePriceUSD = valH;
          salePriceKHR = Math.round(salePriceUSD * (sellRate || defaultRate || 4050));
        } else {
          // Column is sellpriceR (Sale Price in Riel)
          salePriceKHR = valH;
          salePriceUSD = Number((salePriceKHR / (sellRate || defaultRate || 4050)).toFixed(2));
        }
      }

      // 9. Stock from Col I:I (index 8) or colStock
      let stockVal = 0;
      if (colStock !== -1 && row[colStock] !== undefined && row[colStock] !== null && String(row[colStock]).trim() !== '') {
        stockVal = cleanNumber(row[colStock]);
      } else if (row[8] !== undefined && row[8] !== null && String(row[8]).trim() !== '') {
        stockVal = cleanNumber(row[8]);
      }

      // 10. Image STRICTLY from Col J:J (index 9) as requested
      let imageUrl: string | undefined = undefined;
      const rawImg = row[9] !== undefined && row[9] !== null ? String(row[9]).trim() : '';
      if (rawImg) {
        imageUrl = normalizeImageUrl(rawImg);
      }

      const rateToUse = defaultRate || 4050;
      if (costPriceUSD > 0 && costPriceKHR === 0) costPriceKHR = Math.round(costPriceUSD * (buyRate || rateToUse));
      if (costPriceKHR > 0 && costPriceUSD === 0) costPriceUSD = Number((costPriceKHR / (buyRate || rateToUse)).toFixed(2));
      if (salePriceKHR > 0 && salePriceUSD === 0) salePriceUSD = Number((salePriceKHR / (sellRate || rateToUse)).toFixed(2));
      if (salePriceUSD > 0 && salePriceKHR === 0) salePriceKHR = Math.round(salePriceUSD * (sellRate || rateToUse));

      // If sale price is not specified, calculate standard markup
      if (salePriceKHR === 0 && salePriceUSD === 0) {
        if (costPriceKHR > 0) {
          salePriceKHR = Math.round(costPriceKHR * 1.25);
          salePriceUSD = Number((salePriceKHR / (sellRate || rateToUse)).toFixed(2));
        } else if (costPriceUSD > 0) {
          salePriceUSD = Number((costPriceUSD * 1.25).toFixed(2));
          salePriceKHR = Math.round(salePriceUSD * (sellRate || rateToUse));
        }
      }

      let prodId = colId !== -1 && row[colId] ? String(row[colId]).trim() : '';
      if (!prodId || seenProdIds.has(prodId) || prodId.length <= 2) {
        prodId = `prod-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      }
      seenProdIds.add(prodId);

      products.push({
        id: prodId,
        code: rawCode || (rawCategory ? `TT-${rawCategory}` : `SKU-${String(i).padStart(3, '0')}`),
        name: rawName || rawCode || 'ទំនិញ ' + i,
        category: rawCategory || 'ទូទៅ',
        part: rawPart || '0',
        imageUrl: imageUrl || undefined,
        costPriceUSD,
        costPriceKHR,
        salePriceUSD,
        salePriceKHR,
        stockQuantity: stockVal,
        minStockAlert: cleanNumber(row[colMinStock]) || 5,
        unit: rawUnit || '1',
        notes: row[colNotes] ? String(row[colNotes]).trim() : '',
        createdAt: row[colCreated] ? String(row[colCreated]).trim() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 5. Parse Purchases
  const purchases: PurchaseItem[] = [];
  const purchValues = dataMap['purchases'] || [];
  if (purchValues.length > 0) {
    const firstRow = (purchValues[0] || []).map((h: any) => String(h || '').trim());
    const hasHeaders = firstRow.some((h: string) => /id|កាលបរិច្ឆេទ|កូដ|ឈ្មោះ|ចំនួន|qty|invoice/i.test(h));
    const startRow = hasHeaders ? 1 : 0;
    const headers = hasHeaders ? firstRow : [];

    const colId = findCol(headers, /^id$|^uuid$/i, -1);
    const colDate = findCol(headers, /កាលបរិច្ឆេទ|date/i, 1);
    const colCode = findCol(headers, /កូដ|code|sku/i, 2);
    const colName = findCol(headers, /ឈ្មោះ|name|product/i, 3);
    const colQty = findCol(headers, /ចំនួន|qty|quantity/i, 4);
    const colUnit = findCol(headers, /ឯកតា|unit/i, 5);
    const colCostUSD = findCol(headers, /តម្លៃ.*ឯកតា.*\$|cost.*usd|unit.*cost/i, 6);
    const colCostKHR = findCol(headers, /តម្លៃ.*ឯកតា.*៛|cost.*khr/i, 7);
    const colTotalUSD = findCol(headers, /សរុប.*\$|total.*usd/i, 8);
    const colTotalKHR = findCol(headers, /សរុប.*៛|total.*khr/i, 9);
    const colRate = findCol(headers, /អត្រា|rate/i, 10);
    const colSupplier = findCol(headers, /អ្នកផ្គត់ផ្គង់|supplier/i, 11);
    const colInvoice = findCol(headers, /វិក្កយបត្រ|invoice|bill/i, 12);
    const colNotes = findCol(headers, /សម្គាល់|note/i, 13);

    const seenPurchIds = new Set<string>();

    for (let i = startRow; i < purchValues.length; i++) {
      const row = purchValues[i];
      if (!row || row.length === 0) continue;
      const rawCode = String(row[colCode] || '').trim();
      const rawName = String(row[colName] || '').trim();
      if (!rawCode && !rawName) continue;

      const qty = cleanNumber(row[colQty]);
      const rate = cleanNumber(row[colRate]) || defaultRate;

      let costUSD = cleanNumber(row[colCostUSD]);
      let costKHR = cleanNumber(row[colCostKHR]);

      if (costUSD > 0 && costKHR === 0) costKHR = Math.round(costUSD * rate);
      if (costKHR > 0 && costUSD === 0) costUSD = Number((costKHR / rate).toFixed(2));

      let totalUSD = cleanNumber(row[colTotalUSD]);
      if (totalUSD === 0 && costUSD > 0 && qty > 0) totalUSD = Number((costUSD * qty).toFixed(2));

      let totalKHR = cleanNumber(row[colTotalKHR]);
      if (totalKHR === 0 && costKHR > 0 && qty > 0) totalKHR = Math.round(costKHR * qty);

      let purchId = colId !== -1 && row[colId] ? String(row[colId]).trim() : '';
      if (!purchId || seenPurchIds.has(purchId) || purchId.length <= 2) {
        purchId = `purch-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      }
      seenPurchIds.add(purchId);

      purchases.push({
        id: purchId,
        purchaseDate: row[colDate] ? String(row[colDate]).trim() : new Date().toISOString().slice(0, 16).replace('T', ' '),
        productId: '',
        productCode: rawCode,
        productName: rawName || rawCode,
        quantity: qty,
        unit: row[colUnit] ? String(row[colUnit]).trim() : 'ឯកតា',
        costPriceUSD: costUSD,
        costPriceKHR: costKHR,
        totalUSD,
        totalKHR,
        exchangeRate: rate,
        supplierName: row[colSupplier] ? String(row[colSupplier]).trim() : '',
        invoiceNo: row[colInvoice] ? String(row[colInvoice]).trim() : `PO-${Date.now().toString().slice(-4)}`,
        notes: row[colNotes] ? String(row[colNotes]).trim() : '',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 6. Parse Sales
  const sales: SaleItem[] = [];
  const saleValues = dataMap['sales'] || [];
  if (saleValues.length > 0) {
    const firstRow = (saleValues[0] || []).map((h: any) => String(h || '').trim());
    const hasHeaders = firstRow.some((h: string) => /id|កាលបរិច្ឆេទ|កូដ|ឈ្មោះ|ចំនួន|qty|ចំណេញ|profit/i.test(h));
    const startRow = hasHeaders ? 1 : 0;
    const headers = hasHeaders ? firstRow : [];

    const colId = findCol(headers, /^id$|^uuid$/i, -1);
    const colDate = findCol(headers, /កាលបរិច្ឆេទ|date/i, 1);
    const colCode = findCol(headers, /កូដ|code|sku/i, 2);
    const colName = findCol(headers, /ឈ្មោះ|name|product/i, 3);
    const colQty = findCol(headers, /ចំនួន|qty|quantity/i, 4);
    const colUnit = findCol(headers, /ឯកតា|unit/i, 5);
    const colSaleUSD = findCol(headers, /តម្លៃលក់.*\$|price.*usd/i, 6);
    const colSaleKHR = findCol(headers, /តម្លៃលក់.*៛|price.*khr/i, 7);
    const colTotalUSD = findCol(headers, /សរុបលក់.*\$|total.*sale.*usd/i, 8);
    const colTotalKHR = findCol(headers, /សរុបលក់.*៛|total.*sale.*khr/i, 9);
    const colCostUSD = findCol(headers, /ថ្លៃដើម.*\$|cost.*usd/i, 10);
    const colCostKHR = findCol(headers, /ថ្លៃដើម.*៛|cost.*khr/i, 11);
    const colTotalCostUSD = findCol(headers, /ថ្លៃដើមសរុប.*\$|total.*cost.*usd/i, 12);
    const colTotalCostKHR = findCol(headers, /ថ្លៃដើមសរុប.*៛|total.*cost.*khr/i, 13);
    const colProfitUSD = findCol(headers, /ប្រាក់ចំណេញ.*\$|profit.*usd/i, 14);
    const colProfitKHR = findCol(headers, /ប្រាក់ចំណេញ.*៛|profit.*khr/i, 15);
    const colRate = findCol(headers, /អត្រា|rate/i, 16);
    const colCustomer = findCol(headers, /អតិថិជន|customer/i, 17);
    const colPayment = findCol(headers, /វិធីទូទាត់|payment/i, 18);
    const colInvoice = findCol(headers, /វិក្កយបត្រ|invoice/i, 19);
    const colNotes = findCol(headers, /សម្គាល់|note/i, 20);

    const seenSaleIds = new Set<string>();

    for (let i = startRow; i < saleValues.length; i++) {
      const row = saleValues[i];
      if (!row || row.length === 0) continue;
      const rawCode = String(row[colCode] || '').trim();
      const rawName = String(row[colName] || '').trim();
      if (!rawCode && !rawName) continue;

      const qty = cleanNumber(row[colQty]);
      const rate = cleanNumber(row[colRate]) || defaultRate;

      let saleUSD = cleanNumber(row[colSaleUSD]);
      let saleKHR = cleanNumber(row[colSaleKHR]);
      if (saleUSD > 0 && saleKHR === 0) saleKHR = Math.round(saleUSD * rate);
      if (saleKHR > 0 && saleUSD === 0) saleUSD = Number((saleKHR / rate).toFixed(2));

      let totalSaleUSD = cleanNumber(row[colTotalUSD]);
      if (totalSaleUSD === 0 && saleUSD > 0 && qty > 0) totalSaleUSD = Number((saleUSD * qty).toFixed(2));
      let totalSaleKHR = cleanNumber(row[colTotalKHR]);
      if (totalSaleKHR === 0 && saleKHR > 0 && qty > 0) totalSaleKHR = Math.round(saleKHR * qty);

      let costUSD = cleanNumber(row[colCostUSD]);
      let costKHR = cleanNumber(row[colCostKHR]);
      if (costUSD > 0 && costKHR === 0) costKHR = Math.round(costUSD * rate);
      if (costKHR > 0 && costUSD === 0) costUSD = Number((costKHR / rate).toFixed(2));

      let totalCostUSD = cleanNumber(row[colTotalCostUSD]);
      if (totalCostUSD === 0 && costUSD > 0 && qty > 0) totalCostUSD = Number((costUSD * qty).toFixed(2));
      let totalCostKHR = cleanNumber(row[colTotalCostKHR]);
      if (totalCostKHR === 0 && costKHR > 0 && qty > 0) totalCostKHR = Math.round(costKHR * qty);

      let profitUSD = cleanNumber(row[colProfitUSD]);
      if (profitUSD === 0 && totalSaleUSD > 0) profitUSD = Number((totalSaleUSD - totalCostUSD).toFixed(2));
      let profitKHR = cleanNumber(row[colProfitKHR]);
      if (profitKHR === 0 && totalSaleKHR > 0) profitKHR = totalSaleKHR - totalCostKHR;

      let saleId = colId !== -1 && row[colId] ? String(row[colId]).trim() : '';
      if (!saleId || seenSaleIds.has(saleId) || saleId.length <= 2) {
        saleId = `sale-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      }
      seenSaleIds.add(saleId);

      sales.push({
        id: saleId,
        saleDate: row[colDate] ? String(row[colDate]).trim() : new Date().toISOString().slice(0, 16).replace('T', ' '),
        productId: '',
        productCode: rawCode,
        productName: rawName || rawCode,
        quantity: qty,
        unit: row[colUnit] ? String(row[colUnit]).trim() : 'ឯកតា',
        salePriceUSD: saleUSD,
        salePriceKHR: saleKHR,
        totalSaleUSD,
        totalSaleKHR,
        costPriceUSD: costUSD,
        costPriceKHR: costKHR,
        totalCostUSD,
        totalCostKHR,
        profitUSD,
        profitKHR,
        exchangeRate: rate,
        customerName: row[colCustomer] ? String(row[colCustomer]).trim() : '',
        paymentMethod: (row[colPayment] as 'Cash' | 'KHQR' | 'Credit') || 'Cash',
        invoiceNo: row[colInvoice] ? String(row[colInvoice]).trim() : `INV-${Date.now().toString().slice(-4)}`,
        notes: row[colNotes] ? String(row[colNotes]).trim() : '',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return {
    spreadsheetTitle,
    products,
    purchases,
    sales,
    exchangeRate,
  };
};
