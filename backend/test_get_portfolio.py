import requests

requests.post("http://localhost:8000/api/auth/signup", json={"email": "test2@test.com", "password": "password"})
res = requests.post("http://localhost:8000/api/auth/login", data={"username": "test2@test.com", "password": "password"})
token = res.json().get("access_token")

url = "http://localhost:8000/api/portfolio/"
data = {"ticker": "AAPL", "quantity": 10, "buy_price": 150.0}
headers = {"Authorization": f"Bearer {token}"}
requests.post(url, json=data, headers=headers)

res = requests.get(url, headers=headers)
print("STATUS:", res.status_code)
print("BODY:", res.text)
