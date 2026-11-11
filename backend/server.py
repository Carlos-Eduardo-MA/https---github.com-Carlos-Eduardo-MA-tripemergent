from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import hmac
import time
import json
import hashlib
import logging
import secrets
import zipfile
import uuid
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:
    from backend.clerk_auth import clerk_router, require_user
    from backend.storage import put_object, get_object, init_storage, APP_NAME
    from backend.media_utils import process_image, reverse_geocode
except ModuleNotFoundError:
    from clerk_auth import clerk_router, require_user
    from storage import put_object, get_object, init_storage, APP_NAME
    from media_utils import process_image, reverse_geocode

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
SIGN_SECRET = os.environ['MEDIA_SIGNING_SECRET'].encode()
MAX_UPLOAD = 200 * 1024 * 1024
URL_TTL = 6 * 3600

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def sign(payload: str, exp: int) -> str:
    return hmac.new(SIGN_SECRET, f"{payload}:{exp}".encode(), hashlib.sha256).hexdigest()


def check_sig(payload: str, exp: int, sig: str):
    if exp < time.time() or not hmac.compare_digest(sign(payload, exp), sig or ""):
        raise HTTPException(status_code=403, detail="Link expired or invalid")


def file_url(media_id: str, kind: str, dl: bool = False) -> str:
    exp = int(time.time()) + URL_TTL
    return f"/api/files/{media_id}?kind={kind}&exp={exp}&sig={sign(f'{media_id}:{kind}', exp)}" + ("&dl=1" if dl else "")


# ---------- Models ----------
class ProfileIn(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None


class TripIn(BaseModel):
    name: str
    description: Optional[str] = ""
    location: Optional[str] = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    default_role: str = "editor"


class TripPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    default_role: Optional[str] = None
    invite_enabled: Optional[bool] = None
    day_labels: Optional[Dict[str, str]] = None
    cover_media_id: Optional[str] = None


class RoleIn(BaseModel):
    role: str


class MediaPatch(BaseModel):
    caption: Optional[str] = None
    tags: Optional[List[str]] = None


class TranslateIn(BaseModel):
    lang: str


class ZipIn(BaseModel):
    group: str = "day"


# ---------- Helpers ----------
async def get_profile(uid: str) -> dict:
    u = await db.users.find_one({"user_id": uid}, {"_id": 0})
    return u or {"user_id": uid, "name": "Viajante", "avatar": None}


async def get_membership(trip_id: str, uid: str, roles=None) -> dict:
    trip = await db.trips.find_one({"id": trip_id, "is_deleted": False}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    m = await db.trip_members.find_one({"trip_id": trip_id, "user_id": uid}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Trip not found")
    if roles and m["role"] not in roles:
        raise HTTPException(status_code=403, detail="Not allowed")
    return {"trip": trip, "member": m}


async def media_out(m: dict, profiles: dict) -> dict:
    p = profiles.get(m["uploader_id"], {})
    is_img = m["content_type"].startswith("image/")
    return {
        **{k: v for k, v in m.items() if k not in ("storage_path", "thumb_path", "is_deleted")},
        "uploader_name": p.get("name", "Viajante"),
        "uploader_avatar": p.get("avatar"),
        "media_type": "image" if is_img else "video",
        "thumb_url": file_url(m["id"], "thumb") if m.get("thumb_path") else None,
        "original_url": file_url(m["id"], "original"),
        "download_url": file_url(m["id"], "original", dl=True),
    }


async def profiles_for(uids) -> dict:
    users = await db.users.find({"user_id": {"$in": list(set(uids))}}, {"_id": 0}).to_list(1000)
    return {u["user_id"]: u for u in users}


# ---------- Profile ----------
@api_router.get("/")
async def root():
    return {"message": "TripGallery API"}


@api_router.post("/me")
async def sync_me(body: ProfileIn, user: dict = Depends(require_user)):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$set": {**data, "updated_at": now_iso()}, "$setOnInsert": {"user_id": user["user_id"], "created_at": now_iso()}},
                              upsert=True)
    return await get_profile(user["user_id"])


# ---------- Trips ----------
async def trip_summary(trip: dict, my_role: str) -> dict:
    tid = trip["id"]
    members = await db.trip_members.find({"trip_id": tid}, {"_id": 0}).to_list(500)
    profiles = await profiles_for([m["user_id"] for m in members])
    media_count = await db.media.count_documents({"trip_id": tid, "is_deleted": False})
    cover = None
    cover_doc = None
    if trip.get("cover_media_id"):
        cover_doc = await db.media.find_one({"id": trip["cover_media_id"], "is_deleted": False}, {"_id": 0})
    if not cover_doc:
        cover_doc = await db.media.find_one({"trip_id": tid, "is_deleted": False, "thumb_path": {"$ne": None}}, {"_id": 0}, sort=[("created_at", -1)])
    if cover_doc and cover_doc.get("thumb_path"):
        cover = file_url(cover_doc["id"], "thumb")
    out = {k: v for k, v in trip.items() if k != "invite_token" or my_role == "owner"}
    out.update({
        "my_role": my_role,
        "media_count": media_count,
        "member_count": len(members),
        "cover_url": cover,
        "member_avatars": [{"name": profiles.get(m["user_id"], {}).get("name"), "avatar": profiles.get(m["user_id"], {}).get("avatar")} for m in members[:5]],
    })
    return out


@api_router.get("/trips")
async def list_trips(user: dict = Depends(require_user)):
    ms = await db.trip_members.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    roles = {m["trip_id"]: m["role"] for m in ms}
    trips = await db.trips.find({"id": {"$in": list(roles)}, "is_deleted": False}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [await trip_summary(t, roles[t["id"]]) for t in trips]


@api_router.post("/trips")
async def create_trip(body: TripIn, user: dict = Depends(require_user)):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name required")
    trip = {
        "id": str(uuid.uuid4()), "name": body.name.strip(), "description": body.description or "",
        "location": body.location or "", "start_date": body.start_date, "end_date": body.end_date,
        "default_role": body.default_role if body.default_role in ("editor", "viewer") else "editor",
        "owner_id": user["user_id"], "invite_token": secrets.token_urlsafe(24), "invite_enabled": True,
        "blocked_user_ids": [], "day_labels": {}, "cover_media_id": None,
        "storage_provider": "emergent_cloud", "is_deleted": False, "created_at": now_iso(),
    }
    await db.trips.insert_one(dict(trip))
    await db.trip_members.insert_one({"trip_id": trip["id"], "user_id": user["user_id"], "role": "owner", "joined_at": now_iso()})
    return await trip_summary(trip, "owner")


@api_router.get("/trips/{trip_id}")
async def get_trip(trip_id: str, user: dict = Depends(require_user)):
    ctx = await get_membership(trip_id, user["user_id"])
    return await trip_summary(ctx["trip"], ctx["member"]["role"])


@api_router.patch("/trips/{trip_id}")
async def update_trip(trip_id: str, body: TripPatch, user: dict = Depends(require_user)):
    ctx = await get_membership(trip_id, user["user_id"], roles=["owner"])
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if "default_role" in data and data["default_role"] not in ("editor", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if data:
        await db.trips.update_one({"id": trip_id}, {"$set": data})
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    return await trip_summary(trip, ctx["member"]["role"])


@api_router.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str, user: dict = Depends(require_user)):
    await get_membership(trip_id, user["user_id"], roles=["owner"])
    await db.trips.update_one({"id": trip_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}


@api_router.post("/trips/{trip_id}/invite/regenerate")
async def regenerate_invite(trip_id: str, user: dict = Depends(require_user)):
    await get_membership(trip_id, user["user_id"], roles=["owner"])
    token = secrets.token_urlsafe(24)
    await db.trips.update_one({"id": trip_id}, {"$set": {"invite_token": token}})
    return {"invite_token": token}


@api_router.get("/invites/{token}")
async def invite_preview(token: str, user: dict = Depends(require_user)):
    trip = await db.trips.find_one({"invite_token": token, "is_deleted": False}, {"_id": 0})
    if not trip or not trip.get("invite_enabled"):
        raise HTTPException(status_code=404, detail="Invite invalid")
    owner = await get_profile(trip["owner_id"])
    is_member = bool(await db.trip_members.find_one({"trip_id": trip["id"], "user_id": user["user_id"]}))
    return {"trip_id": trip["id"], "name": trip["name"], "location": trip.get("location"),
            "start_date": trip.get("start_date"), "end_date": trip.get("end_date"),
            "owner_name": owner.get("name"), "owner_avatar": owner.get("avatar"),
            "member_count": await db.trip_members.count_documents({"trip_id": trip["id"]}),
            "is_member": is_member, "blocked": user["user_id"] in trip.get("blocked_user_ids", [])}


@api_router.post("/invites/{token}/join")
async def join_trip(token: str, user: dict = Depends(require_user)):
    trip = await db.trips.find_one({"invite_token": token, "is_deleted": False}, {"_id": 0})
    if not trip or not trip.get("invite_enabled"):
        raise HTTPException(status_code=404, detail="Invite invalid")
    if user["user_id"] in trip.get("blocked_user_ids", []):
        raise HTTPException(status_code=403, detail="Access revoked by owner")
    await db.trip_members.update_one({"trip_id": trip["id"], "user_id": user["user_id"]},
                                     {"$setOnInsert": {"trip_id": trip["id"], "user_id": user["user_id"], "role": trip["default_role"], "joined_at": now_iso()}},
                                     upsert=True)
    return {"trip_id": trip["id"]}


# ---------- Members ----------
@api_router.get("/trips/{trip_id}/members")
async def list_members(trip_id: str, user: dict = Depends(require_user)):
    await get_membership(trip_id, user["user_id"])
    members = await db.trip_members.find({"trip_id": trip_id}, {"_id": 0}).to_list(500)
    profiles = await profiles_for([m["user_id"] for m in members])
    stats = {s["_id"]: s async for s in db.media.aggregate([
        {"$match": {"trip_id": trip_id, "is_deleted": False}},
        {"$group": {"_id": "$uploader_id",
                    "photos": {"$sum": {"$cond": [{"$regexMatch": {"input": "$content_type", "regex": "^image/"}}, 1, 0]}},
                    "videos": {"$sum": {"$cond": [{"$regexMatch": {"input": "$content_type", "regex": "^video/"}}, 1, 0]}},
                    "bytes": {"$sum": "$size"}}}])}
    out = []
    for m in members:
        p = profiles.get(m["user_id"], {})
        s = stats.get(m["user_id"], {})
        out.append({**m, "name": p.get("name", "Viajante"), "email": p.get("email"), "avatar": p.get("avatar"),
                    "photos": s.get("photos", 0), "videos": s.get("videos", 0), "bytes": s.get("bytes", 0)})
    order = {"owner": 0, "editor": 1, "viewer": 2}
    return sorted(out, key=lambda x: (order.get(x["role"], 3), -(x["photos"] + x["videos"])))


@api_router.patch("/trips/{trip_id}/members/{member_id}")
async def set_member_role(trip_id: str, member_id: str, body: RoleIn, user: dict = Depends(require_user)):
    await get_membership(trip_id, user["user_id"], roles=["owner"])
    if body.role not in ("editor", "viewer") or member_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Invalid role change")
    r = await db.trip_members.update_one({"trip_id": trip_id, "user_id": member_id}, {"$set": {"role": body.role}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"user_id": member_id, "role": body.role}


@api_router.delete("/trips/{trip_id}/members/{member_id}")
async def remove_member(trip_id: str, member_id: str, user: dict = Depends(require_user)):
    await get_membership(trip_id, user["user_id"], roles=["owner"])
    if member_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Owner cannot be removed")
    r = await db.trip_members.delete_one({"trip_id": trip_id, "user_id": member_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    await db.trips.update_one({"id": trip_id}, {"$addToSet": {"blocked_user_ids": member_id}})
    return {"ok": True}


@api_router.post("/trips/{trip_id}/members/{member_id}/unblock")
async def unblock_member(trip_id: str, member_id: str, user: dict = Depends(require_user)):
    await get_membership(trip_id, user["user_id"], roles=["owner"])
    await db.trips.update_one({"id": trip_id}, {"$pull": {"blocked_user_ids": member_id}})
    return {"ok": True}


# ---------- Media ----------
@api_router.post("/trips/{trip_id}/media")
async def upload_media(trip_id: str, file: UploadFile = File(...), caption: str = Form(""), tags: str = Form(""),
                       taken_at: str = Form(""), lat: str = Form(""), lng: str = Form(""), client_id: str = Form(""),
                       user: dict = Depends(require_user)):
    await get_membership(trip_id, user["user_id"], roles=["owner", "editor"])
    ctype = file.content_type or "application/octet-stream"
    if not (ctype.startswith("image/") or ctype.startswith("video/")):
        raise HTTPException(status_code=400, detail="Only photos and videos")
    if client_id:
        existing = await db.media.find_one({"trip_id": trip_id, "client_id": client_id, "is_deleted": False}, {"_id": 0})
        if existing:
            return await media_out(existing, await profiles_for([existing["uploader_id"]]))
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="File too large (max 200MB)")
    mid = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    base = f"{APP_NAME}/trips/{trip_id}/{mid}"
    res = await run_in_threadpool(put_object, f"{base}.{ext}", data, ctype)
    meta = {"width": None, "height": None, "camera": None}
    exif = {}
    thumb_path = None
    if ctype.startswith("image/"):
        processed = await run_in_threadpool(process_image, data)
        if processed:
            thumb, w, h, exif = processed
            meta.update({"width": w, "height": h, "camera": exif.get("camera")})
            t = await run_in_threadpool(put_object, f"{base}_thumb.jpg", thumb, "image/jpeg")
            thumb_path = t["path"]

    def to_float(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return None
    la = exif.get("lat") if exif.get("lat") is not None else to_float(lat)
    lo = exif.get("lng") if exif.get("lng") is not None else to_float(lng)
    place = await run_in_threadpool(reverse_geocode, la, lo) if la is not None and lo is not None else {}
    doc = {
        "id": mid, "trip_id": trip_id, "uploader_id": user["user_id"], "client_id": client_id or None,
        "storage_path": res["path"], "thumb_path": thumb_path, "filename": file.filename, "content_type": ctype,
        "size": len(data), **meta, "taken_at": exif.get("taken_at") or taken_at or now_iso(),
        "lat": la, "lng": lo, "city": place.get("city"), "country": place.get("country"),
        "caption": caption.strip(), "tags": [t.strip().lstrip("#") for t in tags.split(",") if t.strip()],
        "translations": {}, "is_deleted": False, "created_at": now_iso(),
    }
    await db.media.insert_one(dict(doc))
    return await media_out(doc, await profiles_for([user["user_id"]]))


@api_router.get("/trips/{trip_id}/media")
async def list_media(trip_id: str, user: dict = Depends(require_user)):
    await get_membership(trip_id, user["user_id"])
    items = await db.media.find({"trip_id": trip_id, "is_deleted": False}, {"_id": 0}).sort("taken_at", 1).to_list(5000)
    profiles = await profiles_for([m["uploader_id"] for m in items])
    return [await media_out(m, profiles) for m in items]


async def media_ctx(media_id: str, uid: str):
    m = await db.media.find_one({"id": media_id, "is_deleted": False}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Media not found")
    ctx = await get_membership(m["trip_id"], uid)
    return m, ctx["member"]["role"]


@api_router.patch("/media/{media_id}")
async def update_media(media_id: str, body: MediaPatch, user: dict = Depends(require_user)):
    m, role = await media_ctx(media_id, user["user_id"])
    if m["uploader_id"] != user["user_id"] and role != "owner":
        raise HTTPException(status_code=403, detail="Not allowed")
    data = {}
    if body.caption is not None:
        data["caption"] = body.caption.strip()
        data["translations"] = {}
    if body.tags is not None:
        data["tags"] = [t.strip().lstrip("#") for t in body.tags if t.strip()]
    if data:
        await db.media.update_one({"id": media_id}, {"$set": data})
    m = await db.media.find_one({"id": media_id}, {"_id": 0})
    return await media_out(m, await profiles_for([m["uploader_id"]]))


@api_router.delete("/media/{media_id}")
async def delete_media(media_id: str, user: dict = Depends(require_user)):
    m, role = await media_ctx(media_id, user["user_id"])
    if m["uploader_id"] != user["user_id"] and role != "owner":
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.media.update_one({"id": media_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}


LANG_NAMES = {"pt": "Brazilian Portuguese", "en": "English", "es": "Spanish"}


@api_router.post("/media/{media_id}/translate")
async def translate_media(media_id: str, body: TranslateIn, user: dict = Depends(require_user)):
    m, _ = await media_ctx(media_id, user["user_id"])
    if body.lang not in LANG_NAMES:
        raise HTTPException(status_code=400, detail="Unsupported language")
    cached = (m.get("translations") or {}).get(body.lang)
    if cached:
        return cached
    if not m.get("caption") and not m.get("tags"):
        return {"caption": "", "tags": []}
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"translate-{media_id}-{body.lang}",
                   system_message="You translate travel photo captions and tags. Reply ONLY with compact JSON: {\"caption\": string, \"tags\": [string]}. Keep emojis, names and places.").with_model("openai", "gpt-5.4")
    prompt = json.dumps({"target_language": LANG_NAMES[body.lang], "caption": m.get("caption", ""), "tags": m.get("tags", [])}, ensure_ascii=False)
    text = ""
    try:
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                text += ev.content
            elif isinstance(ev, StreamDone):
                break
        raw = text[text.find("{"): text.rfind("}") + 1]
        result = json.loads(raw)
        result = {"caption": str(result.get("caption", "")), "tags": [str(t) for t in result.get("tags", [])]}
    except Exception as e:
        logger.error(f"translate failed: {e}")
        raise HTTPException(status_code=502, detail="Translation unavailable")
    await db.media.update_one({"id": media_id}, {"$set": {f"translations.{body.lang}": result}})
    return result


@api_router.get("/files/{media_id}")
async def serve_file(media_id: str, kind: str = Query("thumb"), exp: int = Query(...), sig: str = Query(...), dl: int = Query(0)):
    check_sig(f"{media_id}:{kind}", exp, sig)
    m = await db.media.find_one({"id": media_id, "is_deleted": False}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    path = m["thumb_path"] if kind == "thumb" and m.get("thumb_path") else m["storage_path"]
    data, _ = await run_in_threadpool(get_object, path)
    ctype = "image/jpeg" if path == m.get("thumb_path") else m["content_type"]
    headers = {"Cache-Control": "private, max-age=21600"}
    if dl:
        headers["Content-Disposition"] = f'attachment; filename="{m["filename"]}"'
    return Response(content=data, media_type=ctype, headers=headers)


@api_router.post("/trips/{trip_id}/zip-link")
async def zip_link(trip_id: str, body: ZipIn, user: dict = Depends(require_user)):
    await get_membership(trip_id, user["user_id"])
    group = body.group if body.group in ("day", "author") else "day"
    exp = int(time.time()) + 600
    return {"url": f"/api/zip/{trip_id}?group={group}&exp={exp}&sig={sign(f'zip:{trip_id}:{group}', exp)}"}


@api_router.get("/zip/{trip_id}")
async def download_zip(trip_id: str, group: str = Query("day"), exp: int = Query(...), sig: str = Query(...)):
    check_sig(f"zip:{trip_id}:{group}", exp, sig)
    trip = await db.trips.find_one({"id": trip_id, "is_deleted": False}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Not found")
    items = await db.media.find({"trip_id": trip_id, "is_deleted": False}, {"_id": 0}).sort("taken_at", 1).to_list(5000)
    profiles = await profiles_for([m["uploader_id"] for m in items])
    days = sorted({(m.get("taken_at") or "")[:10] for m in items})
    labels = trip.get("day_labels") or {}
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as zf:
        for i, m in enumerate(items):
            d = (m.get("taken_at") or "")[:10]
            if group == "day":
                folder = f"Dia {days.index(d) + 1:02d} - {d}" + (f" - {labels[d]}" if labels.get(d) else "")
            else:
                folder = profiles.get(m["uploader_id"], {}).get("name", "Viajante")
            folder = "".join(c for c in folder if c not in '\\/:*?"<>|')
            try:
                data, _ = await run_in_threadpool(get_object, m["storage_path"])
            except Exception as e:
                logger.error(f"zip fetch failed {m['id']}: {e}")
                continue
            zf.writestr(f"{folder}/{i + 1:04d}_{m['filename']}", data)
    safe = "".join(c for c in trip["name"] if c.isalnum() or c in " -_").strip() or "viagem"
    return Response(content=buf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="{safe}.zip"'})


app.include_router(api_router)
app.include_router(clerk_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.trips.create_index("id", unique=True)
    await db.trips.create_index("invite_token")
    await db.trip_members.create_index([("trip_id", 1), ("user_id", 1)], unique=True)
    await db.media.create_index([("trip_id", 1), ("taken_at", 1)])
    await db.media.create_index("id", unique=True)
    await db.users.create_index("user_id", unique=True)
    try:
        await run_in_threadpool(init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
