with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("បានកត់ត្រាទិញចូល", "បានកត់ត្រាលក់ចេញ")
content = content.replace("ទិញចូលថ្ងៃនេះ", "លក់ចេញថ្ងៃនេះ")
content = content.replace("តម្លៃទិញចូលរៀល", "តម្លៃលក់ចេញរៀល")
content = content.replace("ចុចលើជួរទំនិញដើម្បីកត់ត្រាទិញចូល", "ចុចលើជួរទំនិញដើម្បីកត់ត្រាលក់ចេញ")
content = content.replace("ទម្រង់កត់ត្រាទិញចូលស្តុក", "ទម្រង់កត់ត្រាលក់ចេញ")
content = content.replace("ចំនួនទិញចូល", "ចំនួនលក់ចេញ")
content = content.replace("តម្លៃដើមទិញចូល", "តម្លៃលក់ចេញ")
content = content.replace("សរុបចំណាយទិញចូល", "សរុបចំណូលលក់ចេញ")
content = content.replace("ម៉ោងទិញចូល", "ម៉ោងលក់ចេញ")
content = content.replace("អត្រាប្ដូរប្រាក់ (ទិញចូល)", "អត្រាប្ដូរប្រាក់ (លក់ចេញ)")
content = content.replace("កត់ត្រាទិញចូលស្តុក (+ Confirm Stock In)", "កត់ត្រាលក់ចេញ (+ Confirm Sale)")
content = content.replace("អ្នកផ្គត់ផ្គង់ (Supplier)", "អតិថិជន (Customer)")
content = content.replace("ចំណាយសរុប", "ចំណូលសរុប")

with open('src/components/SalesPage.tsx', 'w') as f:
    f.write(content)
