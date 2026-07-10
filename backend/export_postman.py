import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import create_app

app = create_app('dev')

collection = {
    "info": {
        "name": "LPS System API",
        "description": "Auto-generated Postman Collection for LPS System",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": []
}

with app.app_context():
    for rule in app.url_map.iter_rules():
        if rule.endpoint == 'static':
            continue
            
        methods = [m for m in rule.methods if m not in ('HEAD', 'OPTIONS')]
        for method in methods:
            # Try to group by blueprint/prefix if possible
            path_parts = [p for p in rule.rule.split('/') if p]
            folder_name = path_parts[1] if len(path_parts) > 1 and path_parts[0] == 'api' else 'other'
            
            # Find or create folder
            folder = next((f for f in collection['item'] if f['name'] == folder_name), None)
            if not folder:
                folder = {"name": folder_name, "item": []}
                collection['item'].append(folder)
                
            # Convert Flask route params <type:name> to Postman variables :name
            url_path = rule.rule
            import re
            url_path = re.sub(r'<[^:]+:([^>]+)>', r':\1', url_path)
            url_path = re.sub(r'<([^>]+)>', r':\1', url_path)
            
            path_array = [p for p in url_path.split('/') if p]
            
            variables = []
            for part in path_array:
                if part.startswith(':'):
                    variables.append({
                        "key": part[1:],
                        "value": ""
                    })

            request_item = {
                "name": f"{method} {rule.rule}",
                "request": {
                    "method": method,
                    "header": [
                        {
                            "key": "Authorization",
                            "value": "Bearer {{token}}",
                            "type": "text"
                        },
                        {
                            "key": "Content-Type",
                            "value": "application/json",
                            "type": "text"
                        }
                    ],
                    "url": {
                        "raw": "{{base_url}}" + url_path,
                        "host": ["{{base_url}}"],
                        "path": path_array,
                        "variable": variables
                    }
                },
                "response": []
            }
            
            # Add basic body for POST/PUT/PATCH
            if method in ['POST', 'PUT', 'PATCH']:
                request_item['request']['body'] = {
                    "mode": "raw",
                    "raw": "{\n    \n}",
                    "options": {
                        "raw": {
                            "language": "json"
                        }
                    }
                }
                
            folder['item'].append(request_item)

with open('lps_postman_collection.json', 'w') as f:
    json.dump(collection, f, indent=4)

print("Collection exported to lps_postman_collection.json")
