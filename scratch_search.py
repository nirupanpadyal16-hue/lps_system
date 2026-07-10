import os

for root, dirs, files in os.walk('backend'):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                if 'ProductionLine' in content and 'add' in content:
                    print(f"Found in {filepath}")
            except Exception as e:
                pass
