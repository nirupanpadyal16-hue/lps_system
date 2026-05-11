import requests

login_url = "http://127.0.0.1:5007/api/auth/login"
models_url = "http://127.0.0.1:5007/api/manager/vehicle-models"

# Login
login_data = {"username": "ppc", "password": "ppc"}
r = requests.post(login_url, json=login_data)
if r.status_code == 200:
    token = r.json().get('data', {}).get('access_token')
    if not token:
        print("Token not found in response")
        print(r.json())
        exit()
    print("Login successful")
    
    # Get models
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(models_url, headers=headers)
    print(f"Models response: {r.status_code}")
    print(r.json())
else:
    print(f"Login failed: {r.status_code}")
    print(r.text)
