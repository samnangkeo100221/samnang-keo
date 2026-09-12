with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

import re

old_code = r"""              \{topSellingProducts\.map\(\(item, idx\) => \{
                const rankStyles = \[
                  'bg-amber-500 text-slate-950', // #1 Gold
                  'bg-slate-300 text-slate-900', // #2 Silver
                  'bg-amber-700 text-white', // #3 Bronze
                \];
                
                // Get real-time stock
                const liveProd = products\.find\(p => p\.id === item\.productId\);
                const currentStock = liveProd \? liveProd\.stock : 0;
                
                return \(
                  <div
                    key=\{item\.productId || `\$\{item\.productCode\}-\$\{idx\}`\}
                    className="relative p-2 rounded-xl border border-\[\#2D333E\] bg-\[\#0F1115\] hover:bg-\[\#1A1F29\] hover:border-slate-500 transition-all flex flex-col items-center gap-2 text-center"
                    title=\{item\.productName\}
                  >
                    \{\/\* Rank Badge absolute positioned \*\/\}
                    <div
                      className=\{`absolute -top-1\.5 -left-1\.5 w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-\[10px\] shadow-sm z-10 \$\{
                        rankStyles\[idx\] || 'bg-slate-700 text-slate-300'
                      \}`\}
                    >
                      \{idx \+ 1\}
                    <\/div>

                    \{\/\* Thumbnail \*\/\}
                    <ProductThumbnail
                      src=\{item\.imageUrl\}
                      alt=\{item\.productName\}
                      fallbackText=\{item\.productCode\}
                      size="md"
                      className="w-12 h-12 shrink-0 shadow-sm"
                    \/>

                    \{\/\* Stock \*\/\}
                    <div className="text-\[10px\] font-mono font-semibold text-emerald-400 bg-emerald-500\/10 px-1\.5 py-0\.5 rounded border border-emerald-500\/20">
                      ស្តុក: \{currentStock\}
                    <\/div>
                  <\/div>
                \);
              \}\)\}"""

new_code = """              {topSellingProducts.map((item, idx) => {
                const rankStyles = [
                  'bg-amber-500 text-slate-950', // #1 Gold
                  'bg-slate-300 text-slate-900', // #2 Silver
                  'bg-amber-700 text-white', // #3 Bronze
                ];
                
                return (
                  <div
                    key={item.productId || `${item.productCode}-${idx}`}
                    className="relative rounded-xl border border-[#2D333E] bg-[#0F1115] hover:border-slate-500 transition-all overflow-hidden aspect-square cursor-pointer"
                    title={item.productName}
                  >
                    {/* Rank Badge absolute positioned */}
                    <div
                      className={`absolute top-0 left-0 w-6 h-6 rounded-br-xl flex items-center justify-center font-mono font-bold text-[10px] shadow-sm z-10 ${
                        rankStyles[idx] || 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Thumbnail filling the whole box */}
                    <ProductThumbnail
                      src={item.imageUrl}
                      alt={item.productName}
                      fallbackText={item.productCode}
                      className="!w-full !h-full !min-w-0 !min-h-0 !rounded-none border-none"
                    />
                  </div>
                );
              })}"""

if re.search(old_code, content):
    content = re.sub(old_code, new_code, content)
    with open('src/components/SalesPage.tsx', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Regex failed")
