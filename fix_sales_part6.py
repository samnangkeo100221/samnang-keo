import re
with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

target = re.search(r'        <div className="lg:col-span-5 space-y-3">.*?          <\/div>\n        <\/div>\n      <\/div>', content, re.DOTALL)
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
                  បង្ហាញពីរូបភាពទំនិញដែលលក់ដាច់បំផុត
                </p>
              </div>
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
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {topSellingProducts.map((item, idx) => {
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
              })}
            </div>
          )}
        </div>
      </div>"""
new_content = content.replace(target_str, replacement)
with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(new_content)
print("Done")
