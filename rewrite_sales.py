with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

# Fix State for Sales
content = content.replace("const [unitCostUSD, setUnitCostUSD] = useState('');", "const [unitSaleUSD, setUnitSaleUSD] = useState('');\n  const [unitSaleKHR, setUnitSaleKHR] = useState('');\n  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'KHQR' | 'Credit'>('Cash');")
content = content.replace("const [unitCostKHR, setUnitCostKHR] = useState('');", "")

# Change cost to sale in handlers
content = content.replace("setUnitCostUSD(first.costPriceUSD.toString());", "setUnitSaleUSD(first.salePriceUSD.toString());\n      setUnitSaleKHR(first.salePriceKHR.toString());")
content = content.replace("setUnitCostKHR(first.costPriceKHR.toString());", "")

content = content.replace("setUnitCostUSD(prod.costPriceUSD.toString());", "setUnitSaleUSD(prod.salePriceUSD.toString());")
content = content.replace("setUnitCostKHR(\n        (prod.costPriceKHR || convertUSDtoKHR(prod.costPriceUSD, activeRate)).toString()\n      );", "setUnitSaleKHR(\n        (prod.salePriceKHR || convertUSDtoKHR(prod.salePriceUSD, activeRate)).toString()\n      );")

# Update calculation inside handleAddSale
calc_replacement = """
    const saleUSDNum = Number(unitSaleUSD);
    const saleKHRNum = Number(unitSaleKHR);
    const costUSDNum = selectedProduct.costPriceUSD;
    const costKHRNum = selectedProduct.costPriceKHR || convertUSDtoKHR(costUSDNum, activeRate);
    
    if (saleUSDNum < 0 || saleKHRNum < 0 || qtyNum <= 0) {
      alert('សូមបញ្ចូលតម្លៃ និងចំនួនឲ្យបានត្រឹមត្រូវ (ធំជាង 0)');
      return;
    }

    const totalSaleUSD = saleUSDNum * qtyNum;
    const totalSaleKHR = saleKHRNum * qtyNum;
    const totalCostUSD = costUSDNum * qtyNum;
    const totalCostKHR = costKHRNum * qtyNum;
    const profitUSD = totalSaleUSD - totalCostUSD;
    const profitKHR = totalSaleKHR - totalCostKHR;

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
      exchangeRate: activeRate,
      customerName: customerName.trim(),
      paymentMethod,
      invoiceNo: invoiceNo.trim(),
      notes: notes.trim(),
    });
"""

import re
content = re.sub(r'const costUSDNum = Number\(unitCostUSD\);.*?onAddSale\(\{.*?\}\);', calc_replacement, content, flags=re.DOTALL)

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
