import requests

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
}
url = "https://query2.finance.yahoo.com/v1/finance/search"
params = {"q": "sbi", "quotesCount": 5, "newsCount": 0}

res = requests.get(url, params=params, headers=headers)
print(res.json())
