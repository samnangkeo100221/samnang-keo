import re

with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

target = re.search(r'        \{\/\* RIGHT: Recent Sales Today Feed with Print Feature \*\/\}.*?          <\/div>\n        <\/div>', content, re.DOTALL)

if not target:
    print("Not found")
    exit(1)

target_str = target.group(0)

replacement = """        {/* RIGHT: Top 15 Best Selling Products (ទំនិញលក់ដាច់ជាងគេទាំង១៥) */}
        <div className="lg:col-span-5 bg-[#161920] rounded-xl border border-[#2D333E] shadow-sm p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#2D333E]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>ទំនិញលក់ដាច់ជាងគេ</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    កំពូលទាំង ១៥
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  បង្ហាញពីរូបភាព និងស្តុកដែលនៅសល់
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSalesHistoryModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0F1115] hover:bg-[#1A1F29] text-slate-300 hover:text-white border border-[#2D333E] text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                title="បើកមើលតារាងប្រវត្តិប្រតិបត្តិការលក់ទាំងអស់"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>ប្រវត្តិលក់</span>
              </button>
            </div>
          </div>

          {topSellingProducts.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-500 text-xs rounded-xl bg-[#0F1115] border border-dashed border-[#2D333E]">
              <Package className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-slate-400">មិនទាន់មានប្រវត្តិនៃការលក់ទេ</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                ប្រព័ន្ធនឹងចាត់ចំណាត់ថ្នាក់ទំនិញលក់ដាច់ជាងគេទាំង ១៥ នៅទីនេះ។
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
              {topSellingProducts.map((item, idx) => {
                const rankStyles = [
                  'bg-amber-500 text-slate-950', // #1 Gold
                  'bg-slate-300 text-slate-900', // #2 Silver
                  'bg-amber-700 text-white', // #3 Bronze
                ];
                
                // Get real-time stock
                const liveProd = products.find(p => p.id === item.productId);
                const currentStock = liveProd ? liveProd.stock : 0;
                
                return (
                  <div
                    key={item.productId || `${item.productCode}-${idx}`}
                    className="relative p-2 rounded-xl border border-[#2D333E] bg-[#0F1115] hover:bg-[#1A1F29] hover:border-slate-500 transition-all flex flex-col items-center gap-2 text-center"
                    title={item.productName}
                  >
                    {/* Rank Badge absolute positioned */}
                    <div
                      className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shadow-sm z-10 ${
                        rankStyles[idx] || 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Thumbnail */}
                    <ProductThumbnail
                      src={item.imageUrl}
                      alt={item.productName}
                      fallbackText={item.productCode}
                      size="md"
                      className="w-12 h-12 shrink-0 shadow-sm"
                    />

                    {/* Stock */}
                    <div className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      ស្តុក: {currentStock}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>"""

new_content = content.replace(target_str, replacement)

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(new_content)

print("Done")
