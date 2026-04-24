import json
import re

def extract_keys(content, language):
    start_marker = f"'{language}': {{"
    start_index = content.find(start_marker)
    if start_index == -1:
        return set()
    
    # Simple regex to find keys like 'key': 'value'
    # This might miss some if they span multiple lines but for this file it should be fine
    keys = set(re.findall(r"'(\w+)':", content[start_index:]))
    
    # Stop searching when we hit the next language or end of map
    # But wait, 'fr' is after 'ar'. So for 'ar', we should stop at 'fr'.
    # For 'fr', we stop at the end.
    return keys

with open('c:/Users/pc/mohassibe/packages/mobile/lib/core/app_localizations.dart', 'r', encoding='utf-8') as f:
    content = f.read()

ar_keys = extract_keys(content, 'ar')
fr_keys = extract_keys(content, 'fr')

print(f"Arabic keys: {len(ar_keys)}")
print(f"French keys: {len(fr_keys)}")

missing_in_fr = ar_keys - fr_keys
missing_in_ar = fr_keys - ar_keys

print("\nMissing in French:")
for k in sorted(missing_in_fr):
    print(k)

print("\nMissing in Arabic:")
for k in sorted(missing_in_ar):
    print(k)
