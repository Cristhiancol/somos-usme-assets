import urllib.request

url = "https://docs.google.com/spreadsheets/d/18FXUJRjG79rFAqc2EDY-bnlFk5aHov4UjVPywnNDbL8/export?format=xlsx"
try:
    urllib.request.urlretrieve(url, "facturacion.xlsx")
    print("Downloaded facturacion.xlsx")
except Exception as e:
    print(f"Error: {e}")
