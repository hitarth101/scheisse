"""Finds public-domain LibriVox readings (in German) of the app's reading texts: the Grimm tales and the
chapters of Heidi part 1. Links only: the app streams the MP3s from archive.org; nothing is downloaded here.

Source: the LibriVox catalogue API (librivox.org/api/feed/audiobooks, author search with sections),
cached in tools/raw/librivox/. Every chosen URL is checked to answer with audio.
Output: tools/sources/librivox.json, report tools/out/librivox-report.md

Run from the repo root:  py tools/fetch_librivox.py
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "raw" / "librivox"
READING = ROOT / "tools" / "sources" / "reading"
OUT = ROOT / "tools" / "sources" / "librivox.json"
REPORT = ROOT / "tools" / "out" / "librivox-report.md"
UA = {"User-Agent": "Scheisse personal study app build script"}
# Grimm books in the order they are searched: the complete final edition first; the 1812/15 first edition
# (LibriVox 6599, 6765, 7072) is left out because its text differs most from the app's editions.
GRIMM_BOOKS = [11369, 445, 444, 1075, 1674, 1935, 8946]
HEIDI_BOOK = 869  # Heidis Lehr- und Wanderjahre, 14 chapters


def catalogue(author: str) -> list[dict]:
    RAW.mkdir(parents=True, exist_ok=True)
    path = RAW / f"author-{author}.json"
    if not path.exists():
        url = f"https://librivox.org/api/feed/audiobooks?author={author}&format=json&extended=1&limit=200"
        path.write_bytes(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read())
    return json.loads(path.read_text(encoding="utf-8"))["books"]


def fold(t: str) -> str:
    t = t.lower().replace("ß", "ss").replace("th", "t")
    for a, b in (("ä", "a"), ("ö", "o"), ("ü", "u")):
        t = t.replace(a, b)
    return re.sub(r"[^a-z]+", " ", t).strip()


def audio_ok(url: str) -> bool:
    req = urllib.request.Request(url, headers={**UA, "Range": "bytes=0-1023"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status in (200, 206) and "audio" in r.headers.get("Content-Type", "audio")
    except Exception:
        return False


def clock(secs: str | int | None) -> str | None:
    try:
        s = int(secs)
    except (TypeError, ValueError):
        return None
    return f"{s // 60}:{s % 60:02d}"


def entry(book: dict, sec: dict, **extra) -> dict:
    readers = ", ".join(r.get("display_name", "") for r in sec.get("readers", []) if r.get("display_name"))
    return {**extra, "title": sec["title"].strip(), "url": sec["listen_url"], "reader": readers or "LibriVox volunteer",
            "duration": clock(sec.get("playtime")), "book": book["title"], "librivox": book.get("url_librivox")}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    texts = json.loads((READING / "index.json").read_text(encoding="utf-8"))
    books = {b["id"]: b for b in catalogue("Grimm") + catalogue("Spyri") if b.get("language") == "German"}
    out = {"fetched": time.strftime("%Y-%m-%d"), "license": "Public domain (LibriVox)", "grimm": [], "heidi": []}
    report = ["# LibriVox readings", "", f"Built {time.strftime('%Y-%m-%d %H:%M')} by `tools/fetch_librivox.py`. Links only; the app streams from archive.org.", ""]

    for t in [x for x in texts if x["id"].startswith("grimm-")]:
        want = fold(t["title"])
        found = None
        for bid in GRIMM_BOOKS:
            for sec in books.get(str(bid), books.get(bid, {})).get("sections", []):
                got = fold(sec["title"])
                if got == want or got.startswith(want) or want.startswith(got) and len(got) > 8:
                    found = (books.get(str(bid)) or books.get(bid), sec)
                    break
            if found:
                break
        if found and audio_ok(found[1]["listen_url"]):
            out["grimm"].append(entry(*found, text=t["id"]))
            report.append(f"- {t['title']}: {found[1]['title']} ({found[0]['title']})")
        else:
            report.append(f"- {t['title']}: no German reading found")

    heidi = books.get(str(HEIDI_BOOK)) or books.get(HEIDI_BOOK)
    for sec in sorted(heidi.get("sections", []), key=lambda s: int(s["section_number"])):
        n = int(sec["section_number"])
        if audio_ok(sec["listen_url"]):
            out["heidi"].append(entry(heidi, sec, part=1, chapter=n, text=f"heidi-1-{n:02d}"))
            report.append(f"- Heidi, part 1, chapter {n}: {sec['title'].strip()}")
        else:
            report.append(f"- Heidi, part 1, chapter {n}: audio did not answer")

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    report.insert(4, f"Grimm tales with a reading: {len(out['grimm'])} of {sum(1 for x in texts if x['id'].startswith('grimm-'))}. Heidi chapters: {len(out['heidi'])}.\n")
    REPORT.write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
