import requests

login_url = "http://localhost:8000/api/auth/login"
login_data = {"username": "deshanshul@gmail.com", "password": "password"} # Try with password, or we just create a user

try:
    res = requests.post(login_url, data=login_data)
    token = res.json().get("access_token")
    if not token:
        # Signup first
        requests.post("http://localhost:8000/api/auth/signup", json={"email": "test@test.com", "password": "password"})
        res = requests.post(login_url, data={"username": "test@test.com", "password": "password"})
        token = res.json().get("access_token")

    url = "http://localhost:8000/api/portfolio/"
    data = {"ticker": "AAPL", "quantity": 10, "buy_price": 150.0}
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(url, json=data, headers=headers)
    print("STATUS:", res.status_code)
    print("BODY:", res.text)
except Exception as e:
    print(e)
