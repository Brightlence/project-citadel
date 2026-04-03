import urllib.request, json
try:
    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/auth/login", data=b"username=admin@citadel.net&password=admin")
    res = urllib.request.urlopen(req)
    token = json.loads(res.read())["access_token"]
    print("Token length:", len(token))
except Exception as e:
    print("Login fail:", e.read())

try:
    req2 = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/password",
        data=b'{"current_password":"admin", "new_password":"new"}',
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="PUT"
    )
    res2 = urllib.request.urlopen(req2)
    print("Pwd success:", res2.read())
except urllib.error.HTTPError as e:
    print("Pwd fail HTTPError:", e.read())
except Exception as e:
    print("Pwd fail:", e)

try:
    req3 = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/admin/users/1",
        headers={"Authorization": f"Bearer {token}"},
        method="DELETE"
    )
    res3 = urllib.request.urlopen(req3)
    print("Del success:", res3.read())
except urllib.error.HTTPError as e:
    print("Del fail HTTPError:", e.read())
except Exception as e:
    print("Del fail:", e)
