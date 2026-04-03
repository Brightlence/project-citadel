import urllib.request
import json
try:
    r = urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8000/api/v1/auth/login", data=b"username=admin@citadel.net&password=admin"))
    token = json.loads(r.read())["access_token"]
    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/auth/password", data=b'{"current_password":"admin", "new_password":"new"}', headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, method="PUT")
    res = urllib.request.urlopen(req)
    print(res.read())
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode())
