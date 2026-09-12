import re
with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

# Change totalSale to calculate profit
calc_replacement = """
  const saleUSDNum = parseFloat(unitCostUSD) || 0;
  const saleKHRNum = parseFloat(unitCostKHR) || 0;
  const qtyNum = parseFloat(quantity) || 0;
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
"""
content = re.sub(r'  const costUSDNum = parseFloat\(unitCostUSD\) \|\| 0;.*?onAddSale\(\{.*?\}\);', calc_replacement, content, flags=re.DOTALL)

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
