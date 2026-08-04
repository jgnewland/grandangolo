#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Costruisce news.json (e scarica le foto in feed-images/) leggendo il feed RSS.
Solo libreria standard: nessuna dipendenza da installare.
Eseguito da GitHub Actions; il file news.json e le immagini vengono poi
serviti dallo stesso sito, quindi il gestionale li legge senza CORS e senza proxy.
"""

import os, re, json, hashlib, shutil, urllib.request, xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

FEED = os.environ.get("FEED_URL", "https://www.grandangoloagrigento.it/feed")
MAX_ITEMS = int(os.environ.get("MAX_ITEMS", "20"))
IMG_DIR = "feed-images"
OUT = "news.json"

NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "media":   "http://search.yahoo.com/mrss/",
    "dc":      "http://purl.org/dc/elements/1.1/",
    "atom":    "http://www.w3.org/2005/Atom",
}

UA = {"User-Agent": "Mozilla/5.0 (GrandangoloBot; +https://github.com)"}


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def strip_html(s):
    if not s:
        return ""
    s = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", s)
    s = re.sub(r"(?s)<[^>]+>", " ", s)
    s = (s.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<")
           .replace("&gt;", ">").replace("&quot;", '"').replace("&#8217;", "\u2019")
           .replace("&#8216;", "\u2018").replace("&#8220;", "\u201c").replace("&#8221;", "\u201d")
           .replace("&#8230;", "\u2026").replace("&#039;", "'").replace("&apos;", "'"))
    s = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), s)
    return re.sub(r"\s+", " ", s).strip()


def clip(s, n=200):
    s = strip_html(s)
    if len(s) <= n:
        return s
    t = s[:n]
    sp = t.rfind(" ")
    if sp > 40:
        t = t[:sp]
    return t.rstrip(" ,;:.") + "\u2026"


def first_img(html):
    if not html:
        return None
    m = re.search(r'(?i)<img[^>]+src=["\']([^"\']+)["\']', html)
    return m.group(1) if m else None


def to_iso(datestr):
    if not datestr:
        return ""
    try:
        return parsedate_to_datetime(datestr).isoformat()
    except Exception:
        return datestr.strip()


def text_of(el):
    return (el.text or "").strip() if el is not None else ""


def item_image(item):
    # 1) media:content / media:thumbnail
    for tag in ("media:content", "media:thumbnail"):
        pre, name = tag.split(":")
        for m in item.findall("{%s}%s" % (NS[pre], name)):
            u = m.get("url")
            if u:
                return u
    # 2) enclosure di tipo immagine
    for enc in item.findall("enclosure"):
        if (enc.get("type") or "").startswith("image"):
            u = enc.get("url")
            if u:
                return u
    # 3) prima <img> dentro content:encoded o description
    content = item.find("{%s}encoded" % NS["content"])
    img = first_img(text_of(content))
    if img:
        return img
    return first_img(text_of(item.find("description")))


def ext_from(url, ctype=""):
    m = re.search(r"\.(jpe?g|png|webp|gif)(?:\?|$)", url, re.I)
    if m:
        return "." + m.group(1).lower().replace("jpeg", "jpg")
    ct = (ctype or "").lower()
    if "png" in ct: return ".png"
    if "webp" in ct: return ".webp"
    if "gif" in ct: return ".gif"
    return ".jpg"


def download_image(url):
    """Scarica l'immagine in feed-images/ e restituisce il percorso relativo, o '' se fallisce."""
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            data = r.read()
            ctype = r.headers.get("Content-Type", "")
        if not data or len(data) < 500:
            return ""
        name = hashlib.sha1(url.encode("utf-8")).hexdigest()[:16] + ext_from(url, ctype)
        path = os.path.join(IMG_DIR, name)
        with open(path, "wb") as f:
            f.write(data)
        return path
    except Exception as e:
        print("  ! immagine non scaricata:", url, "->", e)
        return ""


def parse_items(xml_bytes):
    root = ET.fromstring(xml_bytes)
    # RSS: channel/item ; Atom: entry
    items = root.findall(".//item")
    if not items:
        items = root.findall(".//{%s}entry" % NS["atom"])
    return items


def main():
    print("Feed:", FEED)
    xml_bytes = fetch(FEED)

    # ripulisci la cartella immagini per non farla crescere all'infinito
    if os.path.isdir(IMG_DIR):
        shutil.rmtree(IMG_DIR)
    os.makedirs(IMG_DIR, exist_ok=True)

    items = parse_items(xml_bytes)[:MAX_ITEMS]
    out = []
    for it in items:
        title = strip_html(text_of(it.find("title")))
        if not title:
            # Atom title può avere namespace
            title = strip_html(text_of(it.find("{%s}title" % NS["atom"])))
        if not title:
            continue
        link = text_of(it.find("link")) or (it.find("{%s}link" % NS["atom"]).get("href") if it.find("{%s}link" % NS["atom"]) is not None else "")
        desc = text_of(it.find("description")) or text_of(it.find("{%s}summary" % NS["atom"]))
        if not desc:
            desc = text_of(it.find("{%s}encoded" % NS["content"]))
        date = text_of(it.find("pubDate")) or text_of(it.find("{%s}date" % NS["dc"])) or text_of(it.find("{%s}updated" % NS["atom"]))

        img_url = item_image(it)
        img_path = download_image(img_url) if img_url else ""

        out.append({
            "title": title,
            "summary": clip(desc, 200),
            "date": to_iso(date),
            "link": link.strip(),
            "img": img_path,
        })
        print("  +", ("[foto] " if img_path else "[----] "), title[:70])

    import datetime as _dt
    data = {
        "updated": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "source": FEED,
        "count": len(out),
        "items": out,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Scritte", len(out), "notizie in", OUT)


if __name__ == "__main__":
    main()
