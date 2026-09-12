with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("        </div>\n      {/* Printable Receipt Modal */}", "        </div>\n      </div>\n    </div>\n\n      {/* Printable Receipt Modal */}")

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
