#!/usr/bin/env python3
"""Nicos Weg lesson list (DW Learn German, levels A1/A2/B1) and grammar-topic link table.

Rerunnable. Downloads are cached in tools/raw/dw/ (gitignored); pass --refresh to
fetch everything again.

  step "dw"    Reads the three Nicos Weg course pages on learngerman.dw.com. The site is
               a JavaScript app, but every page ships its data as JSON in
               window.__APOLLO_STATE__, so no rendered text is scraped. Opens every lesson
               page and every grammar page DW lists for it, checks HTTP 200 and that the
               page's own title/heading matches, and writes tools/sources/nicos-weg.json.
  step "links" Takes the distinct grammar topics from that file and the hand-made picks in
               tools/sources/grammar-link-picks.json (Grimm Grammar and Schubert-Verlag
               pages chosen by reading their indexes), re-fetches every picked page (HTTP
               200, title/heading read from the page) and writes
               tools/sources/grammar-links.json and tools/out/nicos-weg-report.md.

Nothing in here writes or translates German/English text. Titles and URLs are copied
from the source sites; anything the sources do not show is left null.

Usage:  py tools/fetch_nicos_weg.py [--refresh] [--step dw|links|all]
"""

import argparse
import datetime
import html as htmllib
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, OrderedDict
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
RAW = TOOLS / "raw" / "dw"
SOURCES = TOOLS / "sources"
OUT = TOOLS / "out"
PICKS = SOURCES / "grammar-link-picks.json"

BASE = "https://learngerman.dw.com"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
DELAY = 0.35  # seconds between requests to the same site

# (level, interface language the course exists in, DW course id)
# DW only offers B1 with its German interface: the /en/ course page answers HTTP 200
# but with no content.
COURSES = [
    ("A1", "en", 36519789),
    ("A2", "en", 36519797),
    ("B1", "de", 36519718),
]
COURSE_DK_LEVEL = {"A1": 2, "A2": 4, "B1": 8}  # dkLearningLevel in DW's data

GRIMM_BASE = "https://coerll.utexas.edu/gg/gr/"
GRIMM_INDEX = GRIMM_BASE + "index.html"
SV_BASE = "https://www.schubert-verlag.de/aufgaben/"
# Schubert exercise indexes: (level, series, path). 'Weitere Uebungen' pages carry a
# grammar label per exercise; the other two list exercises by textbook chapter.
SV_INDEXES = [
    ("A1", "Begegnungen A1+", "uebungen_a1/a1_uebungen_index.htm"),
    ("A1", "Weitere Übungen A1", "uebungen_a1/a1_uebungen_index_z.htm"),
    ("A1", "Spektrum Deutsch A1+", "uebungen_a1/sa1_uebungen_index.htm"),
    ("A2", "Begegnungen A2+", "uebungen_a2/a2_uebungen_index.htm"),
    ("A2", "Weitere Übungen A2", "uebungen_a2/a2_uebungen_index_z.htm"),
    ("A2", "Spektrum Deutsch A2+", "uebungen_a2/sa2_uebungen_index.htm"),
    ("B1", "Begegnungen B1+", "uebungen_b1/b1_uebungen_index.htm"),
    ("B1", "Weitere Übungen B1", "uebungen_b1/b1_uebungen_index_z.htm"),
    ("B1", "Spektrum Deutsch B1+", "uebungen_b1/sb1_uebungen_index.htm"),
]


# --------------------------------------------------------------------------- helpers

def log(*a):
    print(*a, flush=True)


def quote_path(path):
    """DW gives paths with raw umlauts/eszett; the fetchable form is percent-encoded."""
    return urllib.parse.quote(path, safe="/:@!$&'()*+,;=-._~%")


def decode(body):
    """UTF-8 first; Schubert's older pages are Windows-1252."""
    try:
        return body.decode("utf-8")
    except UnicodeDecodeError:
        return body.decode("cp1252", errors="replace")


def norm(s):
    """Whitespace-normalise for comparisons and keys (never changes wording)."""
    return re.sub(r"\s+", " ", htmllib.unescape(s or "").replace("\xa0", " ")).strip()


def clean_html(s):
    """Visible text of an HTML fragment, as a browser would show it."""
    return norm(re.sub(r"<[^>]+>", "", s))


def same_url(a, b):
    return urllib.parse.unquote(a).rstrip("/") == urllib.parse.unquote(b).rstrip("/")


def slugify(text):
    """Lowercase ASCII; umlauts as ae/oe/ue, eszett as ss; other characters to hyphens."""
    t = text
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("Ä", "ae"), ("Ö", "oe"),
                 ("Ü", "ue"), ("ß", "ss"), ("ẞ", "ss")):
        t = t.replace(a, b)
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


class Fetcher:
    """GET with a browser User-Agent, polite delay, retries, on-disk cache and a log
    (fetch-log.json next to the cache) recording status and final URL of every request."""

    def __init__(self, cache_dir, refresh=False, delay=DELAY):
        self.dir = Path(cache_dir)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.log_path = self.dir / "fetch-log.json"
        self.refresh = refresh
        self.delay = delay
        self._last = 0.0
        self.used = set()           # URLs requested through this instance (cache hits included)
        self.entries = {}
        if self.log_path.exists():
            self.entries = json.loads(self.log_path.read_text("utf-8"))

    def save_log(self):
        self.log_path.write_text(
            json.dumps(self.entries, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
            encoding="utf-8")

    def fetch_dates(self):
        """(earliest, latest) date on which the pages used in this run were actually fetched."""
        days = sorted(self.entries[u]["fetched"] for u in self.used if u in self.entries)
        return (days[0], days[-1]) if days else (None, None)

    def get(self, url, rel_name, lang="en"):
        """Return dict(status, final, text). The body is cached as dir/rel_name."""
        self.used.add(url)
        dest = self.dir / rel_name
        e = self.entries.get(url)
        if e and not self.refresh and dest.exists():
            return dict(status=e["status"], final=e["final"], text=decode(dest.read_bytes()))
        wait = self.delay - (time.time() - self._last)
        if wait > 0:
            time.sleep(wait)
        req = urllib.request.Request(url, headers={
            "User-Agent": UA, "Accept-Language": lang,
            "Accept": "text/html,application/xhtml+xml"})
        status, final, body = None, url, b""
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=40) as r:
                    status, final, body = r.status, r.geturl(), r.read()
                break
            except urllib.error.HTTPError as err:
                status, final = err.code, url
                body = err.read() if hasattr(err, "read") else b""
                if err.code < 500:
                    break
            except (urllib.error.URLError, TimeoutError, ConnectionError):
                status = None
            time.sleep(1.5 * (attempt + 1))
        self._last = time.time()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        self.entries[url] = dict(status=status, final=final, bytes=len(body), file=rel_name,
                                 fetched=datetime.date.today().isoformat())
        self.save_log()
        return dict(status=status, final=final, text=decode(body))


def apollo_state(page):
    """Parse the JSON that the JavaScript app embeds in every DW page."""
    marker = "window.__APOLLO_STATE__="
    i = page.find(marker)
    if i < 0:
        return None
    state, _ = json.JSONDecoder().raw_decode(page[i + len(marker):])
    return state


def page_meta(page):
    """Server-rendered <title>, first <h1>/<h2> and canonical link (DW grammar pages have them)."""
    def first(pat):
        m = re.search(pat, page, re.S)
        return clean_html(m.group(1)) if m else None
    canon = re.search(r'<link rel="canonical" href="([^"]*)"', page)
    return dict(title=first(r"<title>(.*?)</title>"), h1=first(r"<h1[^>]*>(.*?)</h1>"),
                h2=first(r"<h2[^>]*>(.*?)</h2>"),
                canonical=htmllib.unescape(canon.group(1)) if canon else None)


def dw_ui_text(state, lang, *path):
    """A string from DW's own translation table, which every DW page embeds. Used for the one
    label DW's course page shows that is not in the course data: the heading of lessons that
    have no chapter (course.otherLessons, 'More lessons'). Returns None if absent."""
    key = 'i18nByLang({"lang":"%s"})' % ("ENGLISH" if lang == "en" else "GERMAN")
    try:
        node = json.loads(state["ROOT_QUERY"][key]["all"])
        for p in path:
            node = node[p]
        return norm(node) if isinstance(node, str) else None
    except (KeyError, TypeError, ValueError):
        return None


# --------------------------------------------------------------------- DW: Task 1

def parse_group(group_name):
    """DW chapter heading -> (number, title). 'Welcome to A1!' has no number."""
    g = (group_name or "").strip()
    if not g:
        return None, None
    m = re.match(r"^(\d+)\s+(.*)$", g)
    if m:
        return int(m.group(1)), m.group(2).strip()
    return None, g


def course_items(state, course_id):
    course = state[f"Course:{course_id}"]
    key = next(k for k in course if k.startswith("contentLinks("))   # targetTypes LESSON
    items = []
    for ref in course[key]:
        link = state[ref["__ref"]]
        les = state[link["target"]["__ref"]]
        items.append(dict(
            id=les["id"], group=link.get("groupName"), info=link.get("additionalInformation"),
            title=les["shortTitle"], headline=les.get("learningTargetHeadline"),
            grammar_desc=les.get("grammarDescription"), path=les["namedUrl"]))
    return items


def lesson_grammar_parts(state, lesson_id):
    """All GRAMMAR entries DW lists on a lesson page, in DW's order."""
    les = state[f"Lesson:{lesson_id}"]
    out = []
    for part in les.get("overviewParts") or []:
        if part.get("lessonPart") != "GRAMMAR":
            continue
        t = part["target"]
        key = next((k for k in t if k.startswith("namedUrl(")), None)
        out.append(dict(id=part["targetId"], name=t["name"], path=t[key] if key else None))
    return out


def strip_numbering(title):
    """DW numbers pages of one family: 'Comparison (2)'. Returns the title without it."""
    return re.sub(r"\s*\(\d+\)\s*$", "", title)


def match_page(overview_title, pages):
    """Find the lesson page's grammar page that belongs to the course-overview grammar line.

    Tier 1: same title.  Tier 2: same title once DW's ' (n)' numbering is removed.
    Tier 3: both have a colon and the same text after it, and exactly one page has it
            ('Prepositions: in, auf' <-> 'Prepositions of place: in, auf').
    Tier 4: the overview line equals the text after the colon of a page title (ignoring
            case and numbering): 'Subordinate clauses' <-> 'Sentence construction:
            subordinate clauses (2)'.
    Returns (page or None, tier or None, number of candidate pages at that tier)."""
    want = norm(overview_title)
    for tier, key in ((1, lambda t: norm(t)), (2, lambda t: norm(strip_numbering(t)))):
        hits = [p for p in pages if key(p["title"]) == want]
        if hits:
            return hits[0], tier, len(hits)
    if ":" in want:
        tail = want.split(":", 1)[1].strip()
        hits = [p for p in pages if ":" in p["title"]
                and norm(p["title"].split(":", 1)[1]) == tail]
        if len(hits) == 1:
            return hits[0], 3, 1
    hits = [p for p in pages if ":" in p["title"]
            and norm(strip_numbering(p["title"].split(":", 1)[1])).lower() == want.lower()]
    if hits:
        return hits[0], 4, len(hits)
    return None, None, 0


def build_dw(fetch, problems, notes):
    """Download + verify everything for Task 1. Returns the 'levels' list."""
    levels = []
    for level, lang, course_id in COURSES:
        course_url = f"{BASE}/{lang}/nicos-weg/c-{course_id}"
        log(f"[{level}] course page {course_url}")
        r = fetch.get(course_url, f"{level.lower()}-course.html", lang)
        state = apollo_state(r["text"]) if r["status"] == 200 else None
        course = state.get(f"Course:{course_id}") if state else None
        if not course:
            problems.append(f"{level}: course page has no data (HTTP {r['status']})")
            continue
        if (course.get("dkLearningLevel") != COURSE_DK_LEVEL[level]
                or not same_url(BASE + course["namedUrl"], course_url)):
            problems.append(f"{level}: course page data does not match ({course.get('namedUrl')}, "
                            f"level {course.get('dkLearningLevel')})")
        items = course_items(state, course_id)
        log(f"[{level}] {len(items)} lessons listed")

        chapters = []
        other_lessons = dw_ui_text(state, lang, "course", "otherLessons")
        for n, it in enumerate(items, start=1):
            title = norm(it["title"])
            lesson_url = BASE + quote_path(it["path"])
            lr = fetch.get(lesson_url, f"lessons/{level}/{n:02d}-{it['id']}.html", lang)
            lstate = apollo_state(lr["text"]) if lr["status"] == 200 else None
            ldata = lstate.get(f"Lesson:{it['id']}") if lstate else None
            if lr["status"] != 200:
                problems.append(f"{level}-{n}: lesson page HTTP {lr['status']} {lesson_url}")
            elif not ldata:
                problems.append(f"{level}-{n}: lesson page has no lesson data {lesson_url}")
            else:
                if norm(ldata.get("name")) != norm(it["title"]):
                    problems.append(f"{level}-{n}: lesson page name {ldata.get('name')!r} "
                                    f"!= course page title {it['title']!r}")
                if not same_url(quote_path(ldata.get("canonicalUrl", "")), lesson_url):
                    problems.append(f"{level}-{n}: canonicalUrl {ldata.get('canonicalUrl')} "
                                    f"differs from {lesson_url}")
                if not same_url(lr["final"], lesson_url):
                    problems.append(f"{level}-{n}: redirected to {lr['final']}")

            # every grammar page DW lists on the lesson page (titles exactly as DW shows them)
            pages = []
            for gp in (lesson_grammar_parts(lstate, it["id"]) if ldata else []):
                gname = norm(gp["name"])
                gurl = None
                if gp["path"]:
                    cand = BASE + quote_path(gp["path"])
                    gr = fetch.get(cand, f"grammar/{level}/{n:02d}-{it['id']}-gr{gp['id']}.html", lang)
                    meta = page_meta(gr["text"]) if gr["status"] == 200 else {}
                    ok = (gr["status"] == 200 and same_url(gr["final"], cand)
                          and meta.get("h2") == norm(gname)
                          and (meta.get("title") or "").startswith(norm(gname))
                          and same_url(meta.get("canonical") or "", cand))
                    if ok:
                        gurl = cand
                    else:
                        problems.append(f"{level}-{n}: grammar page not verified "
                                        f"{cand} HTTP {gr['status']} meta={meta}")
                else:
                    problems.append(f"{level}-{n}: grammar {gname!r} has no URL on the lesson page")
                pages.append(dict(title=gname, url=gurl))

            # the one grammar line the course overview shows for this lesson
            grammar = []
            overview = norm(it["grammar_desc"])
            if overview:
                page, tier, cands = match_page(overview, pages)
                grammar.append(dict(title=overview, url=page["url"] if page else None))
                if page is None:
                    notes.append(f"{level}-{n}: no DW grammar page found for {overview!r} "
                                 f"(lesson pages: {[p['title'] for p in pages]})")
                elif tier in (3, 4):
                    notes.append(f"{level}-{n}: {overview!r} matched to page {page['title']!r} "
                                 f"by the text after the colon (tier {tier})")
                elif cands > 1:
                    notes.append(f"{level}-{n}: {overview!r} matches {cands} DW pages with the "
                                 f"same title; first one used")

            num, ctitle = parse_group(norm(it["group"]))
            if ctitle is None and other_lessons:
                # lessons without a chapter: DW's page heads them with its own label
                ctitle = other_lessons
            if not chapters or chapters[-1]["_key"] != (it["group"] or ""):
                chapters.append(dict(_key=it["group"] or "", n=num, title=ctitle, lessons=[]))
            headline = norm(it["headline"]) or None
            lesson = dict(n=n, title=title)
            if lang == "en":
                lesson["subtitle"] = headline
            else:
                # DW has no English version of B1: its only subtitle is German, copied as shown.
                lesson["subtitle"] = None
                lesson["subtitleDe"] = headline
            lesson.update(url=lesson_url, grammar=grammar, grammarPages=pages,
                          test=it["info"] == "final_test")
            chapters[-1]["lessons"].append(lesson)
            log(f"  {level}-{n:02d} {title!r} grammar={[g['title'] for g in grammar]} "
                f"pages={len(pages)}")

        for c in chapters:
            c.pop("_key")
        levels.append(dict(level=level, url=course_url, lang=lang, chapters=chapters))
    return levels


# ------------------------------------------------------------- topics (Task 2 base)

def classify_blank(title):
    """Label from the topic name only (see grammar-links.json spec):
    article / preposition / verb / adjective, else None."""
    t = title.lower()
    # judgement calls first
    if re.search(r"relative clauses \+ preposition", t):      # about relative clauses
        return None
    if re.search(r"\barticles?\b|\bartikel\b", t):
        return "article"
    if re.search(r"preposition|präposition", t):               # also 'Verbs + preposition'
        return "preposition"
    if re.search(r"^adjective declension|^adjektivdeklination|adjective endings|adjektivendungen", t):
        return "adjective"
    if re.search(r"^conjugation:|^vowel change:|^modal verbs|^modalverben|^müssen or sollen\?", t):
        return "verb"
    return None


def collect_topics(levels):
    """Distinct course-overview grammar lines, in DW order, tagged with the level where they
    first appear. Returns a list of dicts (without the outside links)."""
    topics = OrderedDict()
    for lv in levels:
        for ch in lv["chapters"]:
            for les in ch["lessons"]:
                for g in les["grammar"]:
                    key = norm(g["title"])
                    ref = f"{lv['level']}-{les['n']}"
                    if key not in topics:
                        tid = f"{lv['level'].lower()}-{slugify(key)}"
                        topics[key] = dict(id=tid, title=key, level=lv["level"],
                                           firstLesson=ref, lessons=[])
                    topics[key]["lessons"].append(ref)
    out = list(topics.values())
    ids = Counter(t["id"] for t in out)
    clash = [i for i, c in ids.items() if c > 1]
    if clash:
        raise SystemExit(f"topic id clash: {clash}")
    return out


# -------------------------------------------------- outside links: Grimm / Schubert

def verify_grimm(fetch, url):
    """HTTP 200 and a title that starts with 'Grimm Grammar :'. Returns (title or None, status)."""
    r = fetch.get(url, "grimm/" + url.rsplit("/", 1)[1])
    meta = page_meta(r["text"]) if r["status"] == 200 else {}
    title = meta.get("title")
    ok = (r["status"] == 200 and same_url(r["final"], url)
          and title and title.startswith("Grimm Grammar :"))
    return (title if ok else None), r["status"]


# Schubert exercise pages show their name as the first bold text in the content block.
SV_HEAD = re.compile(r"<font size=3><br><b>(.*?)</b>", re.S)


def sv_catalog(fetch):
    """Every exercise listed on the Schubert index pages: url -> dict(level, series, detail).
    detail is Schubert's own one-line description on the index: the grammar label for the
    'Weitere Übungen' pages, the instruction line for the textbook-chapter pages."""
    cat = {}
    for level, series, rel in SV_INDEXES:
        idx_url = SV_BASE + rel
        r = fetch.get(idx_url, "schubert/" + rel, "de")
        if r["status"] != 200:
            raise SystemExit(f"Schubert index {idx_url} -> HTTP {r['status']}")
        for row in re.findall(r"<tr[^>]*>(.*?)</tr>", r["text"], re.S):
            tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
            a = re.search(r'<a href="([^"]+\.htm)"[^>]*>(.*?)</a>', row, re.S)
            if not a or len(tds) < 3 or a.group(1).startswith("http"):
                continue
            url = urllib.parse.urljoin(idx_url, a.group(1))
            # 'Weitere Übungen': Übung N | grammar label | instruction
            # textbook chapters: Kapitel  | exercise title | instruction
            detail = clean_html(tds[1] if "/xg/" in url else tds[2])
            cat.setdefault(url, dict(level=level, series=series, detail=detail))
    return cat


def verify_schubert(fetch, url, cat, problems):
    """The page must be listed on a Schubert index, answer HTTP 200 and show a heading.
    title = the heading exactly as the page shows it."""
    entry = cat.get(url)
    if not entry:
        problems.append(f"Schubert {url}: not listed on any Schubert exercise index")
        return None
    r = fetch.get(url, "schubert/" + url[len(SV_BASE):], "de")
    if r["status"] != 200 or not same_url(r["final"], url):
        problems.append(f"Schubert {url}: HTTP {r['status']} final {r['final']}")
        return None
    m = SV_HEAD.search(r["text"])
    heading = clean_html(m.group(1)) if m else ""
    if len(heading) < 3 or heading == "?":
        problems.append(f"Schubert {url}: no usable heading on the page ({heading!r})")
        return None
    return dict(url=url, title=heading, detail=entry["detail"])


def build_links(levels, topics, fetch_ext, problems):
    """Apply the hand-made picks (tools/sources/grammar-link-picks.json), verifying each page.
    Returns (topics with links, extra info for the report)."""
    picks = json.loads(PICKS.read_text("utf-8")) if PICKS.exists() else {}
    ids = {t["id"] for t in topics}
    for k in picks:
        if not k.startswith("_") and k not in ids:
            problems.append(f"picks file has an unknown topic id {k}")
    cat = sv_catalog(fetch_ext)
    log(f"Schubert catalogue: {len(cat)} exercises on the index pages")
    out, weak, cross = [], [], []
    for t in topics:
        p = picks.get(t["id"], {})
        grimm = schubert = None
        if p.get("grimm"):
            title, status = verify_grimm(fetch_ext, p["grimm"])
            if title:
                grimm = OrderedDict(url=p["grimm"], title=title)
            else:
                problems.append(f"{t['id']}: Grimm page not verified {p['grimm']} (HTTP {status})")
        if p.get("schubert"):
            s = verify_schubert(fetch_ext, p["schubert"], cat, problems)
            if s:
                schubert = OrderedDict(url=s["url"], title=s["title"], detail=s["detail"])
                lvl = cat[p["schubert"]]["level"]
                if lvl != t["level"]:
                    cross.append(f"{t['id']} ({lvl})")
        for which in p.get("weak", []):
            if (grimm if which == "grimm" else schubert):
                weak.append(f"{t['id']} ({which})")
        out.append(OrderedDict(id=t["id"], title=t["title"], level=t["level"],
                               firstLesson=t["firstLesson"], lessons=t["lessons"],
                               blank=classify_blank(t["title"]), grimm=grimm,
                               schubert=schubert))
    return out, dict(weak=weak, cross=cross)


# ----------------------------------------------------------------------- report

NOTES_STATIC = [
    "- B1 exists on DW only with the German interface (the /en/ course page returns HTTP 200 but "
    "no content). B1 chapter names, grammar names and subtitles are German, exactly as DW shows "
    "them. `subtitle` is null for B1 and the German subtitle is in `subtitleDe`. No English "
    "subtitle exists for B1.",
    "- Chapters: 'Welcome to A1!', 'Welcome to A2!' and 'Intro zu B1' are DW's unnumbered intro "
    "chapters (`n` null). The A1/A2 final test has no group in DW's data; DW's page heads it with "
    "its own label (course.otherLessons), which is copied from DW's translation table into the "
    "chapter `title` (`n` null). The B1 final test is in the group 'Abschlusstest'.",
    "- Topic = the one grammar line DW's course overview shows per lesson (A1: 62 distinct, "
    "matching the design spec). DW's lesson pages list more grammar pages, with DW's own "
    "numbering (for example 'Informal and formal (1)'); all of them, titles exactly as DW shows "
    "them, are in each lesson's `grammarPages`. `grammar[].url` is the page that belongs to the "
    "overview line (see matching notes at the end).",
    "- Schubert-Verlag has no grammar-topic index. Its exercises are listed by textbook chapter; "
    "only the 'Weitere Übungen' pages carry a grammar label per exercise. Picks are by exercise "
    "heading, instruction line and content; `schubert.detail` is Schubert's own index line. "
    "Grimm Grammar has no pages for numbers or indefinite pronouns.",
    "- Fields added to the specified shape: level `lang`; lesson `subtitleDe` (B1 only) and "
    "`grammarPages`; topic `lessons` (every lesson where it appears); outside link `detail` "
    "(Schubert's own index line for the exercise).",
    "- `blank` comes from the topic name only: article = articles; preposition = prepositions, "
    "including 'Verbs + preposition' and 'Adjective(s) + preposition'; verb = present-tense "
    "conjugation, vowel change and modal verbs; adjective = 'Adjective declension'. Past-tense "
    "topics, 'Separable verbs', 'Imperative', 'Possessive determiners', 'The dative', 'Nouns: "
    "gender' and 'Relative clauses + preposition' are null.",
    "- A topic is linked only where a page's title, heading or section clearly names it. "
    "Partial matches (one preposition of two, one verb of several) are listed below so they can "
    "be dropped if unwanted.",
    "- Not linked although close (heading or label does not name the topic, or the core of the "
    "topic is missing from the page): Schubert 'Begrüßung und Verabschiedung' (a1_k01_gruessen) "
    "for 'Informal and formal'; Schubert 'An welchem Tag?' (xg05_06) and 'Nationale Feiertage' "
    "(a1_k09_feiertage) for the ordinal topics; Schubert 'Zahlen' listening pages for the number "
    "topics (audio, numbers not verifiable); Schubert 'Nomen mit typischen Endungen' "
    "(b1_kap1_artikel) for the noun-ending topics; Grimm 'dative' for 'Expressions with the "
    "dative'; Grimm 'present regular verbs' for 'Conjugation: bügeln' (the -eln rule is not "
    "there); Grimm 'sich lassen' (vpass_04) for 'lassen + Infinitiv'; Grimm 'telling time', "
    "'days of the week' and 'months and seasons' for 'Temporale Präpositionen'.",
]


def write_report(path, dates, levels, topics_out, extra, problems, notes):
    lo, hi = dates
    when = lo if lo == hi else f"{lo} to {hi}"
    lines = [f"# Nicos Weg link data (pages fetched {when})", ""]
    lines += ["Built by `tools/fetch_nicos_weg.py`. Sources: learngerman.dw.com, "
              "coerll.utexas.edu/gg (Grimm Grammar), schubert-verlag.de/aufgaben. Every URL in the "
              "two JSON files answered HTTP 200. DW lesson and grammar pages were also checked "
              "against the page's own title, heading and canonical link; the Grimm and Schubert "
              "titles in `grammar-links.json` are read from the pages themselves (fetch logs: "
              "`tools/raw/dw/fetch-log.json`, `tools/raw/dw/ext/fetch-log.json`).", ""]
    lines += ["## Lessons", "",
              "| Level | Lessons | Final test | Chapters | Lessons with a grammar line | "
              "DW grammar pages on lesson pages (distinct titles) |", "|---|---|---|---|---|---|"]
    tot = 0
    for lv in levels:
        les = [l for c in lv["chapters"] for l in c["lessons"]]
        pages = [p["title"] for l in les for p in l["grammarPages"]]
        lines.append(f"| {lv['level']} | {len(les)} | {sum(l['test'] for l in les)} | "
                     f"{len(lv['chapters'])} | {sum(bool(l['grammar']) for l in les)} | "
                     f"{len(pages)} ({len(set(pages))}) |")
        tot += len(les)
    lines += ["", f"Total {tot} lessons.", ""]
    n = len(topics_out)
    g = sum(t["grimm"] is not None for t in topics_out)
    s = sum(t["schubert"] is not None for t in topics_out)
    both = sum(t["grimm"] is not None and t["schubert"] is not None for t in topics_out)
    none = sum(t["grimm"] is None and t["schubert"] is None for t in topics_out)
    lines += ["## Grammar topics", "",
              f"{n} distinct topics, counted once at the level where they first appear.", "",
              "| Level | Topics | Grimm link | Schubert link | blank label |",
              "|---|---|---|---|---|"]
    for lvl in ("A1", "A2", "B1"):
        ts = [t for t in topics_out if t["level"] == lvl]
        lines.append(f"| {lvl} | {len(ts)} | {sum(t['grimm'] is not None for t in ts)} | "
                     f"{sum(t['schubert'] is not None for t in ts)} | "
                     f"{sum(t['blank'] is not None for t in ts)} |")
    lines.append(f"| all | {n} | {g} | {s} | {sum(t['blank'] is not None for t in topics_out)} |")
    bl = Counter(t["blank"] for t in topics_out if t["blank"])
    lines += ["", f"Both links: {both}. Neither: {none}. blank labels: "
              + ", ".join(f"{k} {v}" for k, v in sorted(bl.items())) + ".", ""]
    lines += ["## Missing or uncertain", ""] + NOTES_STATIC + [""]
    lines += [f"- Weaker matches ({len(extra['weak'])}): " + "; ".join(extra["weak"]) + ".", ""]
    lines += [f"- Schubert picks from a different level than the topic ({len(extra['cross'])}): "
              + "; ".join(extra["cross"]) + ".", ""]
    lines += [f"- Topics without a Grimm link ({n - g}): "
              + "; ".join(t["id"] for t in topics_out if t["grimm"] is None) + ".", ""]
    lines += [f"- Topics without a Schubert link ({n - s}): "
              + "; ".join(t["id"] for t in topics_out if t["schubert"] is None) + ".", ""]
    if notes:
        lines += ["## DW matching notes", ""] + [f"- {x}" for x in notes] + [""]
    lines += [f"## Verification problems on the last run: {len(problems)}", ""] \
        + [f"- {x}" for x in problems] + [""]
    path.write_text("\n".join(lines), encoding="utf-8")


# ------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--refresh", action="store_true", help="ignore the download cache")
    ap.add_argument("--step", choices=["dw", "links", "all"], default="all")
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    SOURCES.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)

    problems, notes = [], []
    nw_path = SOURCES / "nicos-weg.json"
    dates = []
    if args.step in ("dw", "all"):
        fetch = Fetcher(RAW, refresh=args.refresh)
        levels = build_dw(fetch, problems, notes)
        lo, hi = fetch.fetch_dates()
        dates += [lo, hi]
        data = OrderedDict(source="DW Nicos Weg", fetched=hi, levels=levels)
        nw_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        log(f"wrote {nw_path}")
    else:
        data = json.loads(nw_path.read_text("utf-8"))
        levels = data["levels"]
        dates += [data["fetched"], data["fetched"]]

    if args.step in ("links", "all"):
        topics = collect_topics(levels)
        log(f"{len(topics)} distinct grammar topics")
        fetch_ext = Fetcher(RAW / "ext", refresh=args.refresh)
        topics_out, extra = build_links(levels, topics, fetch_ext, problems)
        lo, hi = fetch_ext.fetch_dates()
        dates += [lo, hi]
        dates = sorted(d for d in dates if d)
        gl = OrderedDict(fetched=hi, topics=topics_out)
        (SOURCES / "grammar-links.json").write_text(
            json.dumps(gl, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        write_report(OUT / "nicos-weg-report.md", (dates[0], dates[-1]), levels, topics_out,
                     extra, problems, notes)
        log("wrote grammar-links.json and nicos-weg-report.md")

    log(f"{len(problems)} problem(s), {len(notes)} note(s)")
    for p in problems:
        log("  PROBLEM:", p)


if __name__ == "__main__":
    main()
