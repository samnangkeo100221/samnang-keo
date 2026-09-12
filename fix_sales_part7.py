import re
with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

target = re.search(r'  const shouldShowProducts =\n    selectedCategory !== \'ទាំងអស់ \(All\)\' \|\| selectedId !== \'ទាំងអស់ \(All\)\' \|\| productSearch !== \'\;', content)

replacement = """  const shouldShowProducts =
    selectedCategory !== 'ទាំងអស់ (All)' || selectedId !== 'ទាំងអស់ (All)' || productSearch !== '';

  const topSellingProducts = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const statsMap = new Map<
      string,
      { productId: string; productCode: string; productName: string; imageUrl?: string; totalSold: number }
    >();

    sales.forEach(s => {
      const existing = statsMap.get(s.productId);
      if (existing) {
        existing.totalSold += s.quantity;
      } else {
        statsMap.set(s.productId, {
          productId: s.productId,
          productCode: s.productCode,
          productName: s.productName,
          imageUrl: s.imageUrl,
          totalSold: s.quantity,
        });
      }
    });

    const sorted = Array.from(statsMap.values()).sort((a, b) => b.totalSold - a.totalSold);
    return sorted.slice(0, 15).map(item => {
      const liveProd = products.find(p => p.id === item.productId);
      return {
        ...item,
        imageUrl: liveProd?.imageUrl || item.imageUrl,
      };
    });
  }, [sales, products]);"""

content = content.replace(target.group(0), replacement)
with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
