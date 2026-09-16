import re

with open('src/services/googleSheets.ts', 'r') as f:
    content = f.read()

target = r'      // 10\. Image from Col J:J \(index 9\) or colImage\s+let imageUrl: string \| undefined = undefined;\s+const rawImg = \(colImage !== -1 && row\[colImage\] !== undefined && row\[colImage\] !== null && String\(row\[colImage\]\)\.trim\(\) !== \'\'\)\s+\? String\(row\[colImage\]\)\.trim\(\)\s+: \(row\[9\] !== undefined && row\[9\] !== null \? String\(row\[9\]\)\.trim\(\) : \'\'\);\s+if \(rawImg\) \{\s+imageUrl = normalizeImageUrl\(rawImg\);\s+\} else if \(row\[0\].*?\)\s+\{\s+imageUrl = normalizeImageUrl\(String\(row\[0\]\)\.trim\(\)\);\s+\} else if \(row\[11\].*?\)\s+\{\s+imageUrl = normalizeImageUrl\(String\(row\[11\]\)\.trim\(\)\);\s+\}'

replacement = """      // 10. Image STRICTLY from Col J:J (index 9) as requested
      let imageUrl: string | undefined = undefined;
      const rawImg = row[9] !== undefined && row[9] !== null ? String(row[9]).trim() : '';
      if (rawImg) {
        imageUrl = normalizeImageUrl(rawImg);
      }"""

content = re.sub(target, replacement, content, flags=re.DOTALL)

with open('src/services/googleSheets.ts', 'w') as f:
    f.write(content)
