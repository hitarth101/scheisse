"""Builds the app's grammar data (product spec 4.4) into app/public/data/grammar.json.

Sources:
  tools/sources/nicos-weg.json      DW Nicos Weg lessons and grammar topics, names and links only (tools/fetch_nicos_weg.py)
  tools/sources/grammar-links.json  per topic: Grimm Grammar (UT Austin) and Schubert-Verlag exercise links, blank type
  tools/raw/kaikki-German.jsonl.gz  Wiktionary (CC BY-SA) via kaikki.org: every form in the reference tables
  Wikibooks German course           the prepositions-by-case table (CC BY-SA), page German/Grammar/Prepositions_and_Postpositions,
                                    fetched once into tools/raw/wikibooks-prepositions.json
  app/public/data/words.json        Wiktionary meanings of the Goethe words (from build_content.py)

Nothing here writes German: every German string in a table is a form Wiktionary lists, placed by its
grammatical tags (case, gender, number, person). Labels such as "Nominative" are English UI text.

Run from the repo root:  py tools/build_grammar.py
"""
from __future__ import annotations

import gzip
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "raw"
SRC = ROOT / "tools" / "sources"
OUT = ROOT / "app" / "public" / "data" / "grammar.json"

CASES = [("nominative", "Nominative"), ("accusative", "Accusative"), ("dative", "Dative"), ("genitive", "Genitive")]
GENDERS = ["masculine", "feminine", "neuter", "plural"]
GENDER_COLS = ["Masc.", "Fem.", "Neut.", "Plural"]
VERBS = ["sein", "haben", "werden", "können", "müssen", "dürfen", "sollen", "wollen", "mögen"]
POSSESSIVES = ["mein", "dein", "sein", "ihr", "unser", "euer", "Ihr"]
WANT = {"der", "ein", "ich", "gut", *VERBS, *POSSESSIVES}
WORD_RE = re.compile(r'"word": "((?:[^"\\]|\\.)*)", "lang": "German"')


def wikibooks_prepositions() -> dict[str, list[str]]:
    """The first table on the Wikibooks page: prepositions by case, exactly as listed there."""
    cache = RAW / "wikibooks-prepositions.json"
    if not cache.exists():
        url = "https://en.wikibooks.org/w/api.php?action=parse&page=German/Grammar/Prepositions_and_Postpositions&prop=wikitext|revid&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "Scheisse personal study app build script"})
        cache.write_bytes(urllib.request.urlopen(req, timeout=30).read())
    text = json.loads(cache.read_text(encoding="utf-8"))["parse"]["wikitext"]["*"]
    table = text.split("{|", 1)[1].split("|}", 1)[0]
    rows = [r.strip() for r in table.split("|-")[1:]]
    head = [h.strip() for h in rows[0].lstrip("!").split("!!")]
    cols: dict[str, list[str]] = {h: [] for h in head}
    for r in rows[1:]:
        cells = [html.unescape(c).strip() for c in r.lstrip("|").split("||")]
        for h, c in zip(head, cells):
            cols[h].extend(w.strip() for w in c.split(",") if w.strip())
    return cols


def scan():
    """Entries for the table words, and the first meaning of every German preposition."""
    found: dict[str, list[dict]] = {}
    preps: dict[str, str] = {}
    with gzip.open(RAW / "kaikki-German.jsonl.gz", "rt", encoding="utf-8") as f:
        for line in f:
            m = WORD_RE.search(line)
            if not m:
                continue
            word = json.loads(f'"{m.group(1)}"')
            is_prep = '"pos": "prep"' in line
            if word not in WANT and not is_prep:
                continue
            e = json.loads(line)
            if e.get("lang_code") != "de":
                continue
            if word in WANT:
                found.setdefault(word, []).append(e)
            if e.get("pos") == "prep" and e["word"] not in preps:
                for sense in e.get("senses", []):
                    gloss = (sense.get("glosses") or [""])[0]
                    gloss = re.sub(r"^\[[^\]]*\]\s*", "", gloss).strip()
                    if gloss and not set(sense.get("tags", [])) & {"obsolete", "archaic", "dated", "regional", "Austria", "Switzerland"}:
                        preps[e["word"]] = gloss
                        break
    return found, preps


def entry(found, word, pos, template=None):
    for e in found.get(word, []):
        if e.get("pos") != pos:
            continue
        if template and not any(f.get("form") == template for f in e.get("forms", [])):
            continue
        return e
    raise SystemExit(f"Wiktionary entry missing: {word} ({pos})")


def first_form(e, *need, without=()):
    """The first form carrying all the tags in `need` and none in `without`, in Wiktionary's table order."""
    for f in e.get("forms", []):
        tags = set(f.get("tags", []))
        if all(t in tags for t in need) and not any(t in tags for t in without) and not f["form"].startswith("-"):
            return f["form"]
    return None


def case_gender_rows(e, extra=(), without=(), cases=CASES):
    rows = []
    for case, label in cases:
        cells = []
        for g in GENDERS:
            need = (case, "plural") if g == "plural" else (case, g, "singular")
            form = first_form(e, *need, *extra, without=without)
            cells.append(None if form in (None, "-") else form)
        rows.append({"name": label, "cells": cells})
    return rows


def tables(found, preps, words):
    out = []
    der = entry(found, "der", "article")
    out.append({
        "id": "definite-articles", "title": "Definite articles", "sub": "“the”, by case", "group": "Articles and pronouns",
        "sections": [{"columns": GENDER_COLS, "gender": True, "rows": case_gender_rows(der, ("definite",))}],
        "source": "Wiktionary: der",
    })
    ein = entry(found, "ein", "article", template="de-decl-ein")
    out.append({
        "id": "indefinite-articles", "title": "Indefinite articles", "sub": "“a, an”, by case", "group": "Articles and pronouns",
        "sections": [{"columns": GENDER_COLS, "gender": True, "rows": case_gender_rows(ein)}],
        "foot": "There is no plural form.",
        "source": "Wiktionary: ein",
    })

    ich = entry(found, "ich", "pron")
    persons = ["I", "you", "he", "she", "it", "we", "you all", "they", "you (formal)"]
    by_case = {}
    for case, _ in CASES[:3]:
        forms = [f["form"] for f in ich["forms"] if case in f.get("tags", []) and "pronoun" in f.get("tags", []) and not f["form"].startswith("-")]
        by_case[case] = forms[:9]
    out.append({
        "id": "personal-pronouns", "title": "Personal pronouns", "sub": "by case", "group": "Articles and pronouns",
        "sections": [{"columns": [label for _, label in CASES[:3]], "nameLang": "en",
                      "rows": [{"name": persons[i], "cells": [by_case[c][i] for c, _ in CASES[:3]]} for i in range(9)]}],
        "source": "Wiktionary: ich (personal pronoun table)",
    })

    mein = entry(found, "mein", "det")
    gloss_rows = []
    for w in POSSESSIVES:
        glosses = []
        for e in found.get(w, []):
            if e.get("pos") == "det":
                for s in e.get("senses", []):
                    g = (s.get("glosses") or [None])[0]
                    if g and " of " not in g and g not in glosses:
                        glosses.append(g)
                        break
        if glosses:
            gloss_rows.append({"name": w, "cells": ["; ".join(glosses)]})
    out.append({
        "id": "possessives", "title": "Possessive words", "sub": "“my”, “your”…", "group": "Articles and pronouns",
        "sections": [
            {"title": "mein, by case", "columns": GENDER_COLS, "gender": True, "rows": case_gender_rows(mein)},
            {"title": "All possessive words", "columns": ["Meaning"], "nameLang": "de", "rows": gloss_rows},
        ],
        "foot": "The other possessive words take the same endings as mein.",
        "source": "Wiktionary: mein, dein, sein, ihr, unser, euer, Ihr",
    })

    meaning = {w["lemma"]: w["en"][0] for w in words if w["pos"] == "preposition"}
    titles = {"accusative": "With the accusative", "dative": "With the dative", "genitive": "With the genitive",
              "two-way": "With the accusative or the dative"}
    sections = []
    for head, items in wikibooks_prepositions().items():
        key = head.lower()
        rows = [{"name": p, "cells": [meaning.get(p) or preps.get(p)]} for p in items]
        sections.append({"title": titles.get(key, head), "columns": ["Meaning"], "nameLang": "de", "rows": rows})
    out.append({
        "id": "prepositions", "title": "Prepositions by case", "sub": "which case follows each one", "group": "Prepositions and endings",
        "sections": sections,
        "foot": "Two-way prepositions take the accusative for movement toward a place and the dative for a location.",
        "source": "Wikibooks German course, Grammar: Prepositions and Postpositions (CC BY-SA); meanings from Wiktionary",
    })

    gut = entry(found, "gut", "adj")
    deg = ("comparative", "superlative")
    out.append({
        "id": "adjective-endings", "title": "Adjective endings", "sub": "gut, “good”, as Wiktionary declines it", "group": "Prepositions and endings",
        "sections": [
            {"title": "After der, die, das", "columns": GENDER_COLS, "gender": True, "rows": case_gender_rows(gut, ("weak",), deg)},
            {"title": "After ein, eine, kein", "columns": GENDER_COLS, "gender": True, "rows": mixed_rows(gut)},
            {"title": "No article", "columns": GENDER_COLS, "gender": True, "rows": case_gender_rows(gut, ("strong",), deg)},
        ],
        "source": "Wiktionary: gut (declension table)",
    })

    def present(verbs):
        rows = []
        for label, tags in [("ich", ("first-person", "singular")), ("du", ("second-person", "singular")), ("er/sie/es", ("third-person", "singular")),
                            ("wir", ("first-person", "plural")), ("ihr", ("second-person", "plural")), ("sie/Sie", ("third-person", "plural"))]:
            rows.append({"name": label, "cells": [first_form(entry(found, v, "verb"), "present", "indicative", *tags) for v in verbs]})
        return rows
    out.append({
        "id": "present-tense", "title": "Present tense", "sub": "sein, haben, werden and the modal verbs", "group": "Verbs",
        "sections": [
            {"columns": VERBS[:3], "nameLang": "de", "rows": present(VERBS[:3])},
            {"title": "Modal verbs", "columns": VERBS[3:6], "nameLang": "de", "rows": present(VERBS[3:6])},
            {"columns": VERBS[6:], "nameLang": "de", "rows": present(VERBS[6:])},
        ],
        "source": "Wiktionary: " + ", ".join(VERBS),
    })
    for t in out:
        for s in t["sections"]:
            for r in s["rows"]:
                if all(c is None for c in r["cells"]):
                    raise SystemExit(f"Empty row in {t['id']}: {r['name']}")
    return out


def mixed_rows(gut):
    rows = []
    for case, label in CASES:
        cells = []
        for g in GENDERS:
            if g == "plural":
                cells.append(first_form(gut, case, "plural", "mixed", "negative", without=("comparative", "superlative")))
            else:
                cells.append(first_form(gut, case, g, "singular", "mixed", "includes-article", without=("comparative", "superlative")))
        rows.append({"name": label, "cells": cells})
    return rows


# ---------------------------------------------------------------- Nicos Weg lessons and topics
TABLE_FOR = [
    (r"articles?.*definite|definite article", "definite-articles"),
    (r"indefinite", "indefinite-articles"),
    (r"personal pronoun", "personal-pronouns"),
    (r"possessive", "possessives"),
    (r"preposition", "prepositions"),
    (r"adjective (declension|ending)", "adjective-endings"),
    (r"conjugation|modal verb|present tense|^sein|haben|werden|vowel change", "present-tense"),
]


def course():
    nw_path, links_path = SRC / "nicos-weg.json", SRC / "grammar-links.json"
    if not nw_path.exists() or not links_path.exists():
        print("Nicos Weg data not found yet; writing tables only")
        return [], []
    nw = json.loads(nw_path.read_text(encoding="utf-8"))
    links = {(t["title"], t["level"]): t for t in json.loads(links_path.read_text(encoding="utf-8"))["topics"]}
    by_title = {}
    for t in links.values():
        by_title.setdefault(t["title"], t)
    lessons, topics, seen = [], {}, {}
    for level in nw["levels"]:
        for ch in level["chapters"]:
            for ls in ch["lessons"]:
                lid = f"{level['level']}-{ls['n']}"
                tids = []
                for g in ls.get("grammar", []):
                    t = links.get((g["title"], level["level"])) or by_title.get(g["title"])
                    if not t:
                        continue
                    tid = t["id"]
                    if tid not in topics:
                        table = next((tab for pat, tab in TABLE_FOR if re.search(pat, t["title"], re.I)), None)
                        topics[tid] = {"id": tid, "title": t["title"], "level": t["level"], "lessons": [], "blank": t.get("blank"),
                                       "dw": g.get("url"), "grimm": t.get("grimm"), "schubert": t.get("schubert"), "table": table}
                    if lid not in topics[tid]["lessons"]:
                        topics[tid]["lessons"].append(lid)
                    tids.append(tid)
                chapter = f"{ch['n']} · {ch['title']}" if ch.get("n") else ch["title"]
                lessons.append({"id": lid, "level": level["level"], "chapter": chapter, "n": ls["n"], "title": ls["title"],
                                "subtitle": ls.get("subtitle"), "url": ls["url"], "topics": tids, "test": bool(ls.get("test"))})
    return lessons, list(topics.values())


def main():
    words = json.loads((ROOT / "app" / "public" / "data" / "words.json").read_text(encoding="utf-8"))["words"]
    found, preps = scan()
    lessons, topics = course()
    data = {
        "source": "Nicos Weg (DW): lesson and topic names and links only. Grimm Grammar (UT Austin) and Schubert-Verlag: links only. "
                  "Tables: Wiktionary (CC BY-SA 4.0) via kaikki.org.",
        "lessons": lessons, "topics": topics, "tables": tables(found, preps, words),
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"grammar.json: {len(lessons)} lessons, {len(topics)} topics, {len(data['tables'])} tables, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
