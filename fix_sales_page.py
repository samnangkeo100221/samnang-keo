import re
with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

# remove everything between '            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">' and '            </div>\n          )}\n        </div>'
start_marker = '            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">\n'
end_marker = '            </div>\n          )}\n        </div>'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx + len(start_marker)] + """              {topSellingProducts.map((item, idx) => {
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
""" + content[end_idx:]

    with open('src/components/SalesPage.tsx', 'w') as f:
        f.write(new_content)
    print("Fixed")
else:
    print("Not found")
