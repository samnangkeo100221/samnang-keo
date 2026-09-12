import re
with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'        </div>\n\s*\{\/\* Printable Receipt Modal \*\/\}', r'        </div>\n      </div>\n    </div>\n\n      {/* Printable Receipt Modal */}', content)

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
