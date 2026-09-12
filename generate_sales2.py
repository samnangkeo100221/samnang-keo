with open('src/components/PurchasesPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("PurchasesPageProps", "SalesPageProps")
content = content.replace("PurchasesPage", "SalesPage")
content = content.replace("purchase", "sale")
content = content.replace("Purchase", "Sale")
content = content.replace("PURCHASE", "SALE")

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
