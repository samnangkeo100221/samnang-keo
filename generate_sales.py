with open('src/components/PurchasesPage.tsx', 'r') as f:
    content = f.read()

# basic replacements
content = content.replace("PurchasesPageProps", "SalesPageProps")
content = content.replace("PurchasesPage", "SalesPage")
content = content.replace("purchase", "sale")
content = content.replace("Purchase", "Sale")
content = content.replace("PURCHASE", "SALE")
content = content.replace("supplier", "customer")
content = content.replace("Supplier", "Customer")

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
