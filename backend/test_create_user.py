import urllib.request
import json

def post(url, data, headers={}):
    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode(), 
        headers={'Content-Type': 'application/json', **headers},
        method='POST'
    )
    return urllib.request.urlopen(req)

try:
    # 1. Login
    login_resp = post('http://127.0.0.1:5007/api/auth/login', {'username': 'admin', 'password': 'admin'})
    auth_data = json.loads(login_resp.read())
    token = auth_data['data']['access_token']
    print("Login successful")

    # 2. Create User
    user_data = {
        'username': 'test_sup_new', 
        'password': 'password', 
        'role': 'Supervisor', 
        'isActive': True, 
        'assigned_line_id': 2
    }
    create_resp = post(
        'http://127.0.0.1:5007/api/admin/identity/users', 
        user_data, 
        {'Authorization': f'Bearer {token}'}
    )
    print(f"Status: {create_resp.status}")
    print(json.loads(create_resp.read()))

except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"Error: {e}")
