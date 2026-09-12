import re
with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("  const saleUSDNum = parseFloat(unitCostUSD) || 0;", "  const qtyNum = parseFloat(quantity) || 0;\n  const saleUSDNum = parseFloat(unitCostUSD) || 0;")

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
