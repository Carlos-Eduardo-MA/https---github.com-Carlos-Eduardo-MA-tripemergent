import os, json, io, urllib.request, requests
from dotenv import load_dotenv
from PIL import Image
load_dotenv("/app/backend/.env")
SK = os.environ["CLERK_SECRET_KEY"]
API = open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split()[0] + "/api"


def bapi(path, body, method="POST"):
    req = urllib.request.Request("https://api.clerk.com/v1" + path, data=json.dumps(body).encode(), method=method,
                                 headers={"Authorization": "Bearer " + SK, "Content-Type": "application/json", "User-Agent": "emergent-test"})
    return json.load(urllib.request.urlopen(req))


def user(email, first):
    try:
        u = bapi("/users", {"email_address": [email], "password": "Test-pass-12345!", "skip_password_checks": True, "first_name": first})
    except Exception:
        u = json.load(urllib.request.urlopen(urllib.request.Request(f"https://api.clerk.com/v1/users?email_address={email}", headers={"Authorization": "Bearer " + SK, "User-Agent": "emergent-test"})))[0]
    s = bapi("/sessions", {"user_id": u["id"]})
    tok = bapi(f"/sessions/{s['id']}/tokens", {"expires_in_seconds": 600})["jwt"]
    return u["id"], {"Authorization": f"Bearer {tok}"}


def jpeg_with_gps():
    img = Image.new("RGB", (1600, 1000), (30, 120, 200))
    exif = Image.Exif()
    exif[306] = "2026:06:10 18:30:00"
    gps = {1: "N", 2: (41.0, 53.0, 24.0), 3: "E", 4: (12.0, 29.0, 32.0)}
    exif[0x8825] = gps
    b = io.BytesIO(); img.save(b, "JPEG", exif=exif); return b.getvalue()


a_id, A = user("owner+clerk_test@example.com", "Lucas")
b_id, B = user("member+clerk_test@example.com", "Maria")
requests.post(f"{API}/me", json={"name": "Lucas Silva"}, headers=A)
requests.post(f"{API}/me", json={"name": "Maria Costa"}, headers=B)
print("noauth", requests.get(f"{API}/trips").status_code)
trip = requests.post(f"{API}/trips", json={"name": "Itália 2026", "location": "Roma", "start_date": "2026-06-10"}, headers=A).json()
print("trip", trip["id"], trip["my_role"])
print("B sees trip before join", requests.get(f"{API}/trips/{trip['id']}", headers=B).status_code)
r = requests.post(f"{API}/trips/{trip['id']}/media", headers=A, files={"file": ("roma.jpg", jpeg_with_gps(), "image/jpeg")}, data={"caption": "Pôr do sol no Coliseu", "tags": "roma,sunset"})
print("upload", r.status_code, {k: r.json().get(k) for k in ("taken_at", "lat", "lng", "city", "country", "width")})
m = r.json()
print("thumb", requests.get(API.replace("/api", "") + m["thumb_url"]).status_code)
print("bad sig", requests.get(API.replace("/api", "") + m["thumb_url"][:-3] + "abc").status_code)
print("join", requests.post(f"{API}/invites/{trip['invite_token']}/join", headers=B).json())
print("B list media", len(requests.get(f"{API}/trips/{trip['id']}/media", headers=B).json()))
print("translate", requests.post(f"{API}/media/{m['id']}/translate", json={"lang": "en"}, headers=B).json())
z = requests.post(f"{API}/trips/{trip['id']}/zip-link", json={"group": "day"}, headers=B).json()
zr = requests.get(API.replace("/api", "") + z["url"])
print("zip", zr.status_code, len(zr.content))
print("members", [(x["name"], x["role"], x["photos"]) for x in requests.get(f"{API}/trips/{trip['id']}/members", headers=A).json()])
print("B remove A (forbidden)", requests.delete(f"{API}/trips/{trip['id']}/members/{a_id}", headers=B).status_code)
print("remove B", requests.delete(f"{API}/trips/{trip['id']}/members/{b_id}", headers=A).status_code)
print("B rejoin", requests.post(f"{API}/invites/{trip['invite_token']}/join", headers=B).status_code)
