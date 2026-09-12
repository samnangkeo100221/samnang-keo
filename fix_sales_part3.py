import re
with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("  const qtyNum = parseFloat(quantity) || 0;", "")
content = content.replace("profitPerUnitUSD", "(selectedProduct ? selectedProduct.salePriceUSD - costUSDNum : 0)")
content = content.replace("profitPerUnitKHR", "(selectedProduct ? selectedProduct.salePriceKHR - costKHRNum : 0)")

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
