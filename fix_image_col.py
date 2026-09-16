import re

with open('src/services/googleSheets.ts', 'r') as f:
    content = f.read()

# Replace colImage = findCol(...) with colImage = 9
content = re.sub(
    r'const colImage = findCol\(headers, \/\^image\$\|\^photo\$\|\^pic\$\|\^img\$\|រូបភាព\|រូប\/i, 9\);',
    r'const colImage = 9; // Strictly use J:J (index 9) as requested',
    content
)

# Replace image fetching logic
old_fetch_logic = """      // 10. Image from Col J:J (index 9) or colImage
      let imageUrl: string | undefined = undefined;
      const rawImg = (colImage !== -1 && row[colImage] !== undefined && row[colImage] !== null && String(row[colImage]).trim() !== '')
        ? String(row[colImage]).trim()
        : (row[9] !== undefined && row[9] !== null ? String(row[9]).trim() : '');
      if (rawImg) {
        imageUrl = normalizeImageUrl(rawImg);
      } else if (row[0] && (String(row[0]).startsWith('http') || String(row[0]).startsWith('data:image'))) {
        imageUrl = normalizeImageUrl(String(row[0]).trim());
      } else if (row[11] && (String(row[11]).startsWith('http') || String(row[11]).startsWith('data:image'))) {
        imageUrl = normalizeImageUrl(String(row[11]).trim());
      }"""

new_fetch_logic = """      // 10. Image STRICTLY from Col J:J (index 9) as requested
      let imageUrl: string | undefined = undefined;
      const rawImg = row[9] !== undefined && row[9] !== null ? String(row[9]).trim() : '';
      if (rawImg) {
        imageUrl = normalizeImageUrl(rawImg);
      }"""

content = content.replace(old_fetch_logic, new_fetch_logic)

with open('src/services/googleSheets.ts', 'w') as f:
    f.write(content)
