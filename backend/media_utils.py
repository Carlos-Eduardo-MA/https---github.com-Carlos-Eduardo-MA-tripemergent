import io
from datetime import datetime

import requests
from PIL import Image, ImageOps, ExifTags


def _gps_to_deg(value, ref):
    d, m, s = [float(x) for x in value]
    deg = d + m / 60 + s / 3600
    return -deg if ref in ("S", "W") else deg


def extract_exif(img: Image.Image) -> dict:
    out = {}
    try:
        exif = img.getexif()
        if not exif:
            return out
        ifd = exif.get_ifd(ExifTags.IFD.Exif)
        dt = ifd.get(36867) or exif.get(306)
        if dt:
            out["taken_at"] = datetime.strptime(str(dt).strip()[:19], "%Y:%m:%d %H:%M:%S").isoformat()
        out["camera"] = " ".join(filter(None, [str(exif.get(271) or "").strip(), str(exif.get(272) or "").strip()])) or None
        gps = exif.get_ifd(ExifTags.IFD.GPSInfo)
        if gps and 2 in gps and 4 in gps:
            out["lat"] = _gps_to_deg(gps[2], gps.get(1, "N"))
            out["lng"] = _gps_to_deg(gps[4], gps.get(3, "E"))
    except Exception:
        pass
    return out


def process_image(data: bytes):
    """Return (thumb_bytes, width, height, exif) or None if not decodable."""
    try:
        img = Image.open(io.BytesIO(data))
        exif = extract_exif(img)
        img = ImageOps.exif_transpose(img)
        w, h = img.size
        img = img.convert("RGB")
        img.thumbnail((720, 720))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=78, optimize=True)
        return buf.getvalue(), w, h, exif
    except Exception:
        return None


def reverse_geocode(lat: float, lng: float) -> dict:
    try:
        r = requests.get("https://nominatim.openstreetmap.org/reverse",
                         params={"format": "json", "lat": lat, "lon": lng, "zoom": 12, "accept-language": "pt"},
                         headers={"User-Agent": "TripGallery/1.0"}, timeout=6)
        a = r.json().get("address", {})
        city = a.get("city") or a.get("town") or a.get("village") or a.get("municipality") or a.get("county")
        return {"city": city, "country": a.get("country")}
    except Exception:
        return {}
