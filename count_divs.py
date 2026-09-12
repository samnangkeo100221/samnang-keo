with open('src/components/SalesPage.tsx', 'r') as f:
    content = f.read()

return_idx = content.find('  return (\n    <div className="space-y-3.5">')
if return_idx == -1:
    print("Return not found")
else:
    body = content[return_idx:]
    open_count = body.count('<div')
    close_count = body.count('</div')
    print(f"Open <div: {open_count}")
    print(f"Close </div: {close_count}")
