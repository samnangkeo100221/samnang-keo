import re

with open('src/components/PurchasesPage.tsx', 'r') as f:
    content = f.read()

# 1. Add activeInput state
state_match = re.search(r'  const \[quantity, setQuantity\] = useState\(\'10\'\);', content)
if state_match:
    content = content[:state_match.start()] + "  const [activeInput, setActiveInput] = useState<'quantity' | 'unitCostUSD' | 'unitCostKHR' | null>('quantity');\n" + content[state_match.start():]

# 2. Add handleNumpadClick function before handleCostUSDChange
handle_match = re.search(r'  const handleCostUSDChange = \(val: string\) => \{', content)
if handle_match:
    numpad_func = """  const handleNumpadClick = (val: string) => {
    if (!activeInput) return;

    const updateValue = (currentVal: string) => {
      if (val === 'clear') return '';
      if (val === 'delete') return currentVal.slice(0, -1);
      if (val === '.' && currentVal.includes('.')) return currentVal;
      return currentVal + val;
    };

    if (activeInput === 'quantity') {
      setQuantity(prev => updateValue(prev));
    } else if (activeInput === 'unitCostUSD') {
      const newVal = updateValue(unitCostUSD);
      handleCostUSDChange(newVal);
    } else if (activeInput === 'unitCostKHR') {
      const newVal = updateValue(unitCostKHR);
      handleCostKHRChange(newVal);
    }
  };

"""
    content = content[:handle_match.start()] + numpad_func + content[handle_match.start():]

# 3. Add onFocus to inputs and replace the old +5 buttons with Numpad
target = re.search(r'            \{\/\* Step 1: Quantity with quick chips \*\/\}.*?id="input-purchase-quantity"', content, re.DOTALL)
if target:
    target_str = target.group(0)
    replacement = """            {/* HORIZONTAL NUMPAD */}
            <div className="mb-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '000', '.', 'clear', 'delete'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleNumpadClick(key)}
                    className="px-3.5 py-1.5 rounded-lg text-sm font-bold font-mono bg-[#0F1115] hover:bg-blue-600 hover:text-white text-slate-300 border border-[#2D333E] shrink-0 active:scale-95 transition-all shadow-sm flex items-center justify-center min-w-[40px]"
                  >
                    {key === 'clear' ? 'C' : key === 'delete' ? '⌫' : key}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1: Quantity */}
            <div>
              <div className="mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  ១. ចំនួនទិញចូល <span className="text-rose-400">*</span>
                </label>
              </div>
              <div className={`flex rounded-xl overflow-hidden border ${activeInput === 'quantity' ? 'border-blue-500' : 'border-[#2D333E]'} bg-[#0F1115] transition-colors`}>
                <input
                  id="input-purchase-quantity"
                  onFocus={() => setActiveInput('quantity')}"""
    
    content = content.replace(target_str, replacement)

# 4. Add onFocus to other inputs
content = content.replace('id="input-purchase-cost-usd"', 'id="input-purchase-cost-usd"\n                    onFocus={() => setActiveInput(\'unitCostUSD\')}')
content = content.replace('id="input-purchase-cost-khr"', 'id="input-purchase-cost-khr"\n                    onFocus={() => setActiveInput(\'unitCostKHR\')}')

# Add border highlighting to USD input container
usd_container = re.search(r'className="w-full pl-7 pr-3 py-2\.5 rounded-xl border border-\[\#2D333E\] bg-\[\#0F1115\] text-white text-xs font-bold font-mono focus:border-blue-500 outline-hidden"', content)
if usd_container:
    content = content.replace(usd_container.group(0), 'className={`w-full pl-7 pr-3 py-2.5 rounded-xl border ${activeInput === \'unitCostUSD\' ? \'border-blue-500\' : \'border-[#2D333E]\'} bg-[#0F1115] text-white text-xs font-bold font-mono outline-hidden transition-colors`}')

# Add border highlighting to KHR input container
khr_container = re.search(r'className="w-full pl-7 pr-3 py-2\.5 rounded-xl border border-emerald-500/40 bg-\[\#0F1115\] text-emerald-400 text-xs font-bold font-mono focus:border-emerald-500 outline-hidden"', content)
if khr_container:
    content = content.replace(khr_container.group(0), 'className={`w-full pl-7 pr-3 py-2.5 rounded-xl border ${activeInput === \'unitCostKHR\' ? \'border-emerald-500\' : \'border-emerald-500/40\'} bg-[#0F1115] text-emerald-400 text-xs font-bold font-mono outline-hidden transition-colors`}')


with open('src/components/PurchasesPage.tsx', 'w') as f:
    f.write(content)
