"""Builds the app's word and sentence data from the downloaded sources (product spec 5 and 7).

Sources (in tools/raw/, never uploaded):
  Goethe-Institut A1/A2/B1 word lists  -> which words, article, plural marker, level
  Wiktionary via kaikki.org            -> English meanings, gender, plural, word forms, recordings
  DeReWo (IDS Mannheim)                -> frequency order of new words
  Tatoeba                              -> native-speaker German sentences with human English translations

Outputs (published with the app, in app/public/data/):
  words.json        one entry per word, in learning order
  word-forms.json   full declension and conjugation tables for the "All forms" sheet
  sentences.json    Tatoeba sentence pairs made of Goethe A1-B1 words, with the positions of words that
                    fill-in-the-blank cards may remove (product spec 5.3)
  engineering.json  the engineering deck (product spec 5.4): Wiktionary words whose senses carry an
                    engineering-related topic label, most frequent first (DeReWo), Goethe words left out
  manifest.json     content version and counts
Report for the owner: tools/out/content-report.md

Nothing here writes German: every German string is copied from a source. Where a source lacks
English, the item is skipped and listed in the report.

Run from the repo root:  py tools/build_content.py
"""
from __future__ import annotations

import bz2
import collections
import gzip
import hashlib
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from goethe import read_list  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "raw"
OUT = ROOT / "app" / "public" / "data"
REPORT = ROOT / "tools" / "out" / "content-report.md"

LEVELS = ("A1", "A2", "B1")
POS_LABEL = {
    "noun": "noun", "verb": "verb", "adj": "adjective", "adv": "adverb", "prep": "preposition",
    "conj": "conjunction", "pron": "pronoun", "det": "determiner", "article": "article", "num": "numeral",
    "intj": "interjection", "particle": "particle", "postp": "postposition", "contraction": "contraction",
}
NON_NOUN_ORDER = ["verb", "adj", "adv", "prep", "conj", "pron", "det", "article", "num", "particle", "intj", "postp", "contraction"]
# Senses never used. Wiktionary often attaches tags such as "Switzerland" or "rare" to a whole sense when
# only a gender or spelling variant is regional, so those only move a sense later, they don't remove it.
SKIP_SENSE_TAGS = {"obsolete", "archaic", "historical", "misspelling", "vulgar", "offensive", "derogatory"}
LATER_SENSE_TAGS = {
    "dated", "rare", "nonstandard", "dialectal", "regional", "slang", "Austria", "Switzerland", "Swiss",
    "Austrian", "Southern-Germany", "Northern-Germany", "uncommon", "pejorative", "euphemistic", "humorous", "poetic",
}
UMLAUT = {"a": "ä", "o": "ö", "u": "ü", "A": "Ä", "O": "Ö", "U": "Ü"}
TOKEN = re.compile(r"[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*")
ALLOWED_AUDIO = {"CC BY 4.0", "CC BY-NC 4.0"}


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# ---------------------------------------------------------------- Goethe
def goethe_words():
    """Goethe entries merged across levels; the lowest level wins."""
    words: dict[str, dict] = {}
    skipped = []
    for level in LEVELS:
        for e in read_list(level, str(RAW)):
            if e.kind == "skip":
                skipped.append((level, e.note))
                continue
            if e.kind == "noun":
                g = "".join(e.genders) or "pl"
                wid = f"{e.lemma}|{g}"
            else:
                wid = e.lemma
            if wid in words:
                continue
            words[wid] = {"id": wid, "lemma": e.lemma, "kind": e.kind, "genders": e.genders,
                          "marker": e.marker, "level": level, "reflexive": e.reflexive, "stem": e.note == "stem"}
    # A capitalised non-noun duplicate of a noun (fragment of a regional note) is dropped.
    nouns = {w["lemma"] for w in words.values() if w["kind"] == "noun"}
    for wid in [k for k, w in words.items() if w["kind"] != "noun" and w["lemma"] in nouns]:
        del words[wid]
    return words, skipped


# ---------------------------------------------------------------- Wiktionary
WORD_RE = re.compile(r'"word": "((?:[^"\\]|\\.)*)", "lang": "German"')


def wiktionary(lemmas: set[str]):
    """Entries whose headword is one of the lemmas (case variants included)."""
    want = lemmas | {l.lower() for l in lemmas} | {l[:1].upper() + l[1:] for l in lemmas}
    found: dict[str, list[dict]] = collections.defaultdict(list)
    n = 0
    with gzip.open(RAW / "kaikki-German.jsonl.gz", "rt", encoding="utf-8") as f:
        for line in f:
            n += 1
            m = WORD_RE.search(line)
            if not m:
                continue
            word = json.loads(f'"{m.group(1)}"')
            if word not in want:
                continue
            e = json.loads(line)
            if e.get("lang_code") != "de":
                continue
            found[e["word"]].append(e)
    log(f"Wiktionary: scanned {n} entries, kept {sum(len(v) for v in found.values())}")
    return found


def noun_genders(e: dict) -> set[str]:
    out = set()
    for ht in e.get("head_templates", []):
        exp = ht.get("expansion", "")
        head = exp.split(" (")[0]
        toks = head.split()[1:]
        for t in toks:
            if t in ("m", "f", "n"):
                out.add(t)
            if t == "pl":
                out.add("pl")
    return out


def head_forms(e: dict, tags: set[str]) -> list[str]:
    return [f["form"] for f in e.get("forms", []) if "source" not in f and set(f.get("tags", [])) == tags]


def clean_gloss(g: str) -> str:
    # Remarks in brackets go, except a quoted English meaning: "female equivalent of Lehrer (“teacher”)".
    for _ in range(2):
        g = re.sub(r"\s*\((?![^()]*[“\"])[^()]*\)", "", g)
    g = g.split(";")[0].strip().rstrip(".:").strip()
    return g


def sense_texts(s: dict) -> list[str]:
    """The English of one sense: for nested senses the heading first, then the specific meaning."""
    gl = s.get("glosses") or []
    if len(gl) > 1 and not ("form_of" in s or "alt_of" in s or {"form-of", "alt-of"} & set(s.get("tags", []))):
        out = []
        for g in (gl[0], gl[-1]):
            c = clean_gloss(g)
            if c and len(c) <= 140 and not re.search(r"\b(inflection|plural|participle|gerund|form|forms) of\b", c):
                out.append(c)
        return out
    c = sense_text(s)
    return [c] if c else []


def sense_text(s: dict) -> str | None:
    """The English of one sense, or None when it only points to another word."""
    gl = s.get("glosses") or []
    if not gl:
        return None
    g = gl[0]
    tags = set(s.get("tags", []))
    if "form_of" in s or "alt_of" in s or "form-of" in tags or "alt-of" in tags:
        # "agent noun of fahren; driver" / "female equivalent of Freund: female friend" /
        # "comparative degree of gut; better": Wiktionary's own meaning follows the pointer.
        m = re.match(r"^[^:;]*[:;]\s*(.+)$", g)
        if m and m.group(1).strip():
            g = m.group(1)
        elif re.match(r"^(fe)?male equivalent of ", g):
            pass  # "female equivalent of Lehrer (“teacher”)" is itself the English definition
        else:
            return None
    elif len(gl) > 1:
        # Nested senses: ["As a copulative verb", "to be"] -> the specific meaning under the heading
        g = gl[-1]
    c = clean_gloss(g)
    if not c or len(c) > 140 or re.search(r"\b(inflection|plural|participle|gerund|form|forms) of\b", c):
        return None
    return c


def form_of_targets(entries: list[dict]) -> list[str]:
    out = []
    for e in entries:
        for s in e.get("senses", []):
            for f in s.get("form_of", []) or []:
                w = f.get("word")
                if w and w not in out:
                    out.append(w)
    return out


# Senses that describe grammar rather than give a meaning ("forms the perfect aspect",
# "nominative masculine singular definite article") go after plain meanings ("to have").
DESCRIPTIVE = re.compile(r"^(forms?|describes?|used|indicates?|expresses|denotes|introduces?|marks?|serves|refers|links|as an? |"
                         r"nominative|accusative|dative|genitive|a particle|an? (intensifier|modal particle)|"
                         r"\(?(with|plus|\+) )", re.I)


def glosses(entries: list[dict], limit: int = 4) -> list[str]:
    main: list[str] = []
    later: list[str] = []
    for e in entries:
        for s in e.get("senses", []):
            tags = set(s.get("tags", []))
            if tags & SKIP_SENSE_TAGS:
                continue
            for c in sense_texts(s):
                c = re.sub(r"^\[[^\]]*\]\s*", "", c)  # "[with dative] in, inside" -> "in, inside"
                if not c:
                    continue
                bucket = later if (tags & LATER_SENSE_TAGS or DESCRIPTIVE.match(c)) else main
                if c not in main and c not in later:
                    bucket.append(c)
    return (main + later)[:limit]


def plural_from_marker(word: str, marker: str | None) -> str | None:
    """Reads Goethe's plural notation ("-e", "¨-e", "-Ä, e", "-") as the plural spelling."""
    if marker is None:
        return None
    if marker == "(Sg.)":
        return ""
    if marker == "(Pl.)":
        return word
    m = marker.replace(" ", "")
    umlaut = "¨" in m or bool(re.match(r"^-[ÄÖÜäöü]", m))
    suffix = re.sub(r"^¨?-[ÄÖÜäöü]?,?", "", m) if re.match(r"^-[ÄÖÜäöü]", m) else re.sub(r"^¨?-", "", m)
    stem = word
    if umlaut:
        # umlaut the last full vowel ("au" -> "äu")
        for i in range(len(stem) - 1, -1, -1):
            c = stem[i]
            if c in UMLAUT:
                if c in "uU" and i > 0 and stem[i - 1] in "aA":
                    stem = stem[: i - 1] + UMLAUT[stem[i - 1]] + stem[i:]
                elif c in "aA" and i + 1 < len(stem) and stem[i + 1] == "a":
                    stem = stem[:i] + UMLAUT[c] + stem[i + 2:]
                else:
                    stem = stem[:i] + UMLAUT[c] + stem[i + 1:]
                break
    return stem + suffix


def soft_hyphens(lemma: str, entries: list[dict]) -> str | None:
    """Soft hyphens at compound joints from Wiktionary's etymology ("Geschwindigkeits-begrenzung")."""
    if len(lemma) < 12:
        return None
    for e in entries:
        for t in e.get("etymology_templates", []):
            if t.get("name") not in ("compound", "com", "af", "affix", "com+"):
                continue
            args = t.get("args", {})
            parts = [args[k] for k in sorted((k for k in args if k.isdigit() and k != "1"), key=int)]
            parts = [re.sub(r"[^\wäöüß]", "", p.lower()) for p in parts if p and not p.startswith("-")]
            parts = [p for p in parts if p]
            if len(parts) < 2:
                continue
            low, pos, cuts = lemma.lower(), 0, []
            ok = True
            for i, p in enumerate(parts):
                j = low.find(p[: max(3, len(p) - 1)], pos)  # tolerate a changed last letter
                if j < 0 or j - pos > 3:
                    ok = False
                    break
                if i > 0:
                    cuts.append(j)
                pos = j + len(p) - 1
            if not ok:
                continue
            cuts = [c for c in cuts if c >= 3 and len(lemma) - c >= 3]
            if not cuts:
                continue
            out, last = "", 0
            for c in cuts:
                out += lemma[last:c] + "­"
                last = c
            return out + lemma[last:]
    return None


def recording(entries: list[dict]) -> str | None:
    best = None
    for e in entries:
        for s in e.get("sounds", []):
            url = s.get("mp3_url")
            if not url:
                continue
            tags = set(s.get("tags", []))
            if tags & {"Austria", "Switzerland", "Swiss", "Austrian"}:
                continue
            if not tags or "Germany" in tags:
                return url
            best = best or url
    return best


def form_tables(entry: dict, pos: str) -> dict | None:
    forms = [f for f in entry.get("forms", []) if f.get("source") in ("declension", "conjugation")]
    if pos == "noun":
        table = {}
        for case in ("nominative", "accusative", "dative", "genitive"):
            row = []
            for num in ("singular", "plural"):
                vals = [f["form"] for f in forms if case in f["tags"] and num in f["tags"] and "indefinite" not in f["tags"]]
                row.append(vals[0] if vals else None)
            table[case] = row
        return table if any(v for r in table.values() for v in r) else None
    if pos == "verb":
        persons = [("first-person", "singular"), ("second-person", "singular"), ("third-person", "singular"),
                   ("first-person", "plural"), ("second-person", "plural"), ("third-person", "plural")]
        out = {}
        for tense, tag in (("present", "present"), ("past", "preterite")):
            row = []
            for p, n in persons:
                vals = [f["form"] for f in forms if {p, n, tag, "indicative"} <= set(f["tags"])]
                row.append(vals[0] if vals else None)
            out[tense] = row
        pp = [f["form"] for f in forms if {"participle", "past"} <= set(f["tags"])]
        aux = [f["form"] for f in forms if "auxiliary" in f["tags"]]
        out["participle"] = pp[0] if pp else None
        out["auxiliary"] = aux[0] if aux else None
        return out if any(out["present"]) else None
    return None


def all_forms(entries: list[dict]) -> set[str]:
    out = set()
    for e in entries:
        out.add(e["word"])
        for f in e.get("forms", []):
            tags = set(f.get("tags", []))
            if tags & {"table-tags", "inflection-template", "auxiliary", "romanization"}:
                continue
            form = f.get("form", "")
            if form and " " not in form and re.fullmatch(r"[A-Za-zÄÖÜäöüß\-]+", form):
                out.add(form)
    return out


# Closed list of article forms for article blanks (product spec 5.3).
ARTICLES = {"der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines"}


def blank_forms(entries: list[dict], pos: str, lemma: str) -> set[str]:
    """Forms a blank may remove, by Wiktionary's tags: finite verb forms (present or past, with a person)
    other than the infinitive; declined adjective forms (strong, weak or mixed endings)."""
    out = set()
    for e in entries:
        for f in e.get("forms", []):
            tags = set(f.get("tags", []))
            form = f.get("form", "")
            if not re.fullmatch(r"[A-Za-zÄÖÜäöüß]+", form) or form == lemma:
                continue
            if pos == "verb" and tags & {"present", "past"} and tags & {"first-person", "second-person", "third-person"} \
                    and not tags & {"subjunctive-i", "subjunctive-ii", "imperative", "participle", "dependent"}:
                out.add(form)
            if pos == "adj" and tags & {"strong", "weak", "mixed"} and not tags & {"comparative", "superlative", "includes-article", "predicative"}:
                out.add(form)
    return out


# ---------------------------------------------------------------- Engineering deck (product spec 5.4)
# Wiktionary's topic labels nest ("computing" and "firearms" senses also carry "engineering"), so a sense
# counts when it has an engineering label and none of the unrelated fields that share it.
ENGINEERING_TOPICS = {
    "engineering", "mechanical-engineering", "electrical-engineering", "civil-engineering", "manufacturing",
    "construction", "tools", "technical", "electronics", "electricity", "electromagnetism", "energy",
    "physics", "mechanics", "metalworking", "materials-science", "hydraulics", "machinery",
}
NOT_ENGINEERING = {
    "computing", "software", "programming", "mathematics", "firearms", "weaponry", "military", "war", "aviation",
    "aeronautics", "aerospace", "nautical", "law", "fashion", "textiles", "clothing", "sports", "automotive",
    "vehicles", "government", "politics", "arts", "design", "medicine", "anatomy", "media", "entertainment",
}
ENGINEERING_SIZE = 600


def engineering_words(goethe_lemmas: set[str], ranks: dict[str, int]) -> list[dict]:
    """German nouns, verbs and adjectives with at least one engineering-labelled sense. The English comes
    from those senses only, so a word appears with its technical meaning."""
    found: dict[tuple[str, str], dict] = {}
    with gzip.open(RAW / "kaikki-German.jsonl.gz", "rt", encoding="utf-8") as f:
        for line in f:
            if '"topics"' not in line:
                continue
            e = json.loads(line)
            word, pos = e.get("word", ""), e.get("pos")
            if e.get("lang_code") != "de" or pos not in ("noun", "verb", "adj") or " " in word or word in goethe_lemmas:
                continue
            senses = [x for x in e.get("senses", []) if set(x.get("topics", [])) & ENGINEERING_TOPICS
                      and not set(x.get("topics", [])) & NOT_ENGINEERING and not set(x.get("tags", [])) & SKIP_SENSE_TAGS
                      and not (x.get("glosses") or ["A"])[0][:1].isupper()]
            if not senses or not re.fullmatch(r"[A-Za-zÄÖÜäöüß]+", word):
                continue
            en = glosses([{**e, "senses": senses}])
            if not en:
                continue
            key = (word, pos)
            item = found.get(key) or {"lemma": word, "pos": POS_LABEL[pos], "en": []}
            item["en"] = (item["en"] + [g for g in en if g not in item["en"]])[:4]
            if pos == "noun" and "gender" not in item:
                g = sorted(noun_genders(e) - {"pl"})
                if not g:
                    continue
                item["gender"] = g[0]
                pl = head_forms(e, {"plural"})
                item["plural"] = pl[0] if pl else None
            if pos == "verb" and "forms" not in item:
                pres = head_forms(e, {"present", "singular", "third-person"})
                past = head_forms(e, {"past"})
                pp = head_forms(e, {"participle", "past"})
                if pres and past and pp:
                    aux = "ist" if "sein" in head_forms(e, {"auxiliary"}) else "hat"
                    item["forms"] = [pres[0], past[0], f"{aux} {pp[0]}"]
            found[key] = item
    ranked = sorted(found.values(), key=lambda x: (ranks.get(x["lemma"], 10**7), x["lemma"]))
    out = [x for x in ranked if x["lemma"] in ranks][:ENGINEERING_SIZE]
    for i, x in enumerate(out):
        x["id"] = f"{x['lemma']}|{x['gender']}" if x["pos"] == "noun" else x["lemma"]
        x["order"] = i
    return out


# ---------------------------------------------------------------- DeReWo
def derewo_ranks() -> dict[str, int]:
    path = next((RAW / "derewo").glob("derewo-v-ww-bll-*.txt"))
    ranks: dict[str, int] = {}
    i = 0
    with open(path, encoding="latin-1") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            lemma = line.split()[0]
            for part in lemma.split(","):
                ranks.setdefault(part, i)
            i += 1
    log(f"DeReWo: {i} lemmas")
    return ranks


# ---------------------------------------------------------------- Tatoeba
def tatoeba():
    natives = set()
    with open(RAW / "user_languages.csv", encoding="utf-8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) >= 3 and p[0] == "deu" and p[1] == "5":
                natives.add(p[2])
    deu = {}
    with bz2.open(RAW / "deu_sentences_detailed.tsv.bz2", "rt", encoding="utf-8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) >= 4 and p[3] in natives:
                deu[int(p[0])] = p[2].strip()
    links = collections.defaultdict(list)
    with bz2.open(RAW / "deu-eng_links.tsv.bz2", "rt", encoding="utf-8") as f:
        for line in f:
            a, b = line.split()
            a, b = int(a), int(b)
            if a in deu:
                links[a].append(b)
    need = {b for v in links.values() for b in v}
    eng = {}
    with bz2.open(RAW / "eng_sentences.tsv.bz2", "rt", encoding="utf-8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            i = int(p[0])
            if i in need:
                eng[i] = p[2].strip()
    audio = {}
    with bz2.open(RAW / "deu_sentences_with_audio.tsv.bz2", "rt", encoding="utf-8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) >= 4 and p[3] in ALLOWED_AUDIO:
                audio.setdefault(int(p[0]), {"id": int(p[1]), "by": p[2], "lic": p[3]})
    log(f"Tatoeba: {len(natives)} native speakers, {len(deu)} native German sentences, "
        f"{len(links)} with English links, {len(audio)} open-licence recordings")
    return deu, links, eng, audio


# ---------------------------------------------------------------- build
def main():
    t0 = time.time()
    report: list[str] = []
    words, goethe_skipped = goethe_words()
    log(f"Goethe: {len(words)} words, {len(goethe_skipped)} lines skipped")

    stems = {w["lemma"] + end for w in words.values() if w["stem"] for end in ("er", "e")}
    wk = wiktionary({w["lemma"] for w in words.values()} | stems)
    targets = {t for w in words.values() if w["kind"] == "noun"
               for t in form_of_targets([e for e in wk.get(w["lemma"], []) if e.get("pos") == "noun"])}
    follow = wiktionary(targets - set(wk)) if targets - set(wk) else {}
    ranks = derewo_ranks()

    out_words: list[dict] = []
    forms_out: dict[str, dict] = {}
    form_map: dict[str, list[str]] = collections.defaultdict(list)
    blankable: dict[str, dict[str, str]] = {"verb": {}, "adj": {}}
    no_entry, no_english, plural_notes, gender_notes = [], [], [], []

    for w in words.values():
        lemma = w["lemma"]
        cands = wk.get(lemma, [])
        if w["kind"] == "noun":
            nouns = [e for e in cands if e.get("pos") == "noun"]
            if w["genders"]:
                match = [e for e in nouns if noun_genders(e) & set(w["genders"])]
            else:
                match = [e for e in nouns if "pl" in noun_genders(e)] or nouns
            if nouns and not match:
                gender_notes.append(f"{lemma}: Goethe {'/'.join(w['genders'])}, Wiktionary {'/'.join(sorted(set().union(*map(noun_genders, nouns)))) or '?'}")
                match = nouns
            if w["genders"]:  # the entry for Goethe's (first) article first
                match.sort(key=lambda e: 0 if w["genders"][0] in noun_genders(e) else 1)
            chosen = match
            pos = "noun"
        elif lemma[:1].isupper() and not any(e.get("pos") in NON_NOUN_ORDER for e in cands) \
                and any(e.get("pos") == "noun" for e in cands):
            # Listed without an article ("Grad (Celsius)"): the noun, with Wiktionary's gender.
            chosen = [e for e in cands if e.get("pos") == "noun"]
            g = sorted(noun_genders(chosen[0]) - {"pl"})
            w["genders"] = g[:1]
            gender_notes.append(f"{lemma}: listed without an article; Wiktionary gender {'/'.join(g) or '?'} used")
            pos = "noun"
        else:
            pool = [e for e in cands if e.get("pos") in NON_NOUN_ORDER and e["word"] == lemma] or \
                   [e for e in cands if e.get("pos") in NON_NOUN_ORDER]
            if w["stem"] and not any(glosses([e]) for e in pool):
                # Goethe lists some words as stems ("jed-", "letzt-"); Wiktionary's headword is used.
                for end in ("er", "e"):
                    alt = [e for e in wk.get(lemma + end, []) if e.get("pos") in NON_NOUN_ORDER]
                    if any(glosses([e]) for e in alt):
                        pool, lemma = alt, lemma + end
                        break
            if w["kind"] in ("verb", "verb?") and any(e.get("pos") == "verb" for e in pool):
                pool = [e for e in pool if e.get("pos") == "verb"] + [e for e in pool if e.get("pos") != "verb"]
            chosen = pool
            pos = pool[0]["pos"] if pool else ""
        if not chosen:
            no_entry.append(f"{lemma} ({w['level']})")
            continue
        primary = [e for e in chosen if e.get("pos") == pos]
        if pos == "noun":
            # Adjectival and plural-listed nouns ("Erwachsene", "Abgase") only point to their lemma
            # ("Erwachsener", "Abgas"); that lemma's English is used.
            first = primary[:1]
            en = glosses(first)
            if not en:
                en = glosses([e for t in form_of_targets(first) for e in (wk.get(t, []) + follow.get(t, [])) if e.get("pos") == "noun"])
            en = en or glosses(primary)
        else:
            en = glosses(primary) or glosses(chosen)
        if not en:
            no_english.append(f"{lemma} ({w['level']})")
            continue

        item = {"id": w["id"], "lemma": lemma, "pos": POS_LABEL.get(pos, pos), "level": w["level"], "en": en}
        if pos == "noun":
            if w["genders"]:
                item["gender"] = w["genders"][0]
                if len(w["genders"]) > 1:
                    item["gender2"] = w["genders"][1]
            wk_pl = []
            for e in primary:
                wk_pl += [p for p in head_forms(e, {"plural"}) if p not in wk_pl]
            goethe_pl = plural_from_marker(lemma, w["marker"])
            if w["marker"] == "(Pl.)":
                item["plural"] = lemma
                item["pluralOnly"] = True
            elif goethe_pl == "":
                item["plural"] = None
            elif goethe_pl and goethe_pl in wk_pl:
                item["plural"] = goethe_pl
            elif wk_pl:
                item["plural"] = wk_pl[0]
                if goethe_pl:
                    plural_notes.append(f"{lemma}: Goethe marker {w['marker']} reads as {goethe_pl}; Wiktionary has {', '.join(wk_pl)}; used {wk_pl[0]}")
            elif goethe_pl:
                item["plural"] = goethe_pl
                plural_notes.append(f"{lemma}: no plural in Wiktionary; used Goethe's {w['marker']} = {goethe_pl}")
            else:
                item["plural"] = None
            gen = head_forms(primary[0], {"genitive"})
            if gen:
                item["genitive"] = gen[0]
        if pos == "verb":
            e = primary[0]
            pres = head_forms(e, {"present", "singular", "third-person"})
            past = head_forms(e, {"past"})
            pp = head_forms(e, {"participle", "past"})
            aux = head_forms(e, {"auxiliary"})
            if pres and past and pp:
                # Perfect as in the Goethe lists and the design spec: "hat gekocht", "ist/hat gefahren".
                third = {"haben": "hat", "sein": "ist"}
                auxes = [third[a] for a in dict.fromkeys(aux) if a in third] or ["hat"]
                item["forms"] = [pres[0], past[0], f"{'/'.join(sorted(auxes, reverse=True))} {pp[0]}"]
            if w["reflexive"]:
                item["reflexive"] = True
        hy = soft_hyphens(lemma, chosen)
        if hy:
            item["hy"] = hy
        rec = recording(chosen)
        if rec:
            item["audio"] = rec
        table = form_tables(primary[0], pos)
        if table:
            forms_out[w["id"]] = table
        item["rank"] = ranks.get(lemma, ranks.get(lemma.lower(), 10**7))
        out_words.append(item)
        for f in all_forms(chosen):
            if w["id"] not in form_map[f]:
                form_map[f].append(w["id"])
        if pos in blankable:
            for f in blank_forms(primary, pos, lemma):
                blankable[pos].setdefault(f, w["id"])

    # Learning order: level, then real-world frequency (DeReWo); product spec 5.5.
    out_words.sort(key=lambda x: (LEVELS.index(x["level"]), x["rank"], x["lemma"]))
    for i, x in enumerate(out_words):
        x["order"] = i
        del x["rank"]

    # Hint where two words share the same English (product spec 5.1): Wiktionary's next meaning.
    by_en = collections.defaultdict(list)
    for x in out_words:
        by_en[(x["en"][0].lower(), x["pos"])].append(x)
    for group in by_en.values():
        if len(group) > 1:
            for x in group:
                other = next((g for g in x["en"][1:] if all(g not in y["en"][:1] for y in group)), None)
                if other:
                    x["hint"] = other
    log(f"Words: {len(out_words)} kept, {len(no_entry)} without a Wiktionary entry, {len(no_english)} without English")

    # ---------------- sentences
    deu, links, eng, audio = tatoeba()
    word_ids = {x["id"] for x in out_words}

    def ids_for(tok: str, first: bool) -> list[str]:
        ids = [i for i in form_map.get(tok, []) if i in word_ids]
        if not ids and first:
            ids = [i for i in form_map.get(tok.lower(), []) if i in word_ids]
        return ids

    pos_of = {x["id"]: x["pos"] for x in out_words}
    prep_lemmas = {x["lemma"] for x in out_words if x["pos"] == "preposition"}

    def blanks(toks: list[str]) -> dict:
        """Token positions (in TOKEN order) a fill-in-the-blank card may remove: a = article before a noun,
        p = preposition itself (not a split-off verb prefix at the end, not "zu" before a verb), v = conjugated verb,
        j = adjective with an ending, before a noun. The first of each kind is used; verbs and adjectives
        also carry their word id, so the card can show the base form as a hint."""
        out: dict[str, int] = {}
        for k, t in enumerate(toks):
            low = t.lower()
            nxt = ids_for(toks[k + 1], False) if k + 1 < len(toks) else []
            if "a" not in out and low in ARTICLES and any(pos_of.get(i) == "noun" for i in nxt):
                out["a"] = k
            if "p" not in out and k + 1 < len(toks) and low in prep_lemmas \
                    and not (low == "zu" and any(pos_of.get(i) == "verb" for i in nxt)):
                out["p"] = k
            verb = blankable["verb"].get(t if k else low, blankable["verb"].get(t))
            if "v" not in out and verb in word_ids:
                out["v"] = [k, verb]
            adj = blankable["adj"].get(low)
            if "j" not in out and adj in word_ids and any(pos_of.get(i) == "noun" for i in nxt):
                out["j"] = [k, adj]
        return out

    sentences = []
    for sid, text in deu.items():
        en_ids = [e for e in links.get(sid, []) if e in eng]
        if not en_ids:
            continue
        toks = TOKEN.findall(text)
        if not 2 <= len(toks) <= 14 or len(text) > 120:
            continue
        w_ids, unk, tok_word = [], 0, []
        for k, t in enumerate(toks):
            ids = ids_for(t, k == 0)
            if ids:
                if ids[0] not in w_ids:
                    w_ids.append(ids[0])
                tok_word.append(w_ids.index(ids[0]))
            else:
                unk += 1
        if unk > 1:
            continue
        if unk or not 3 <= len(toks) <= 10:
            continue
        en_id = en_ids[0]
        # k: for each word of the sentence (in TOKEN order), its position in w, so Reading can show it.
        s = {"id": sid, "de": text, "en": eng[en_id], "enId": en_id, "w": w_ids, "k": tok_word}
        c = blanks(toks)
        if c:
            s["c"] = c
        if sid in audio:
            s["a"] = audio[sid]
        sentences.append(s)
    candidates = len(sentences)

    # Keep a manageable set: for every word, its shortest few sentences (recordings first).
    # These serve as example sentences and as the pool for sentence cards.
    PER_WORD = 6
    by_word: dict[str, list[dict]] = collections.defaultdict(list)
    for s in sentences:
        for wid in s["w"]:
            by_word[wid].append(s)
    rank = lambda s: (0 if "a" in s else 1, len(s["de"]), s["id"])  # noqa: E731
    keep: dict[int, dict] = {}
    for wid, lst in by_word.items():
        for s in sorted(lst, key=rank)[:PER_WORD]:
            keep[s["id"]] = s
    sentences = sorted(keep.values(), key=lambda s: s["id"])
    log(f"Sentences: {candidates} pairs use only Goethe words; kept {len(sentences)} ({PER_WORD} per word at most)")

    # Example sentence per word: the best-ranked kept sentence. Short function words have many forms
    # ("der" also covers "das"; Wiktionary lists "vor" as an old form of "für"), so for them the
    # example must contain the word itself, and not as a split-off verb prefix at the end ("Ich nehme ab.").
    FUNCTION = {"article", "determiner", "pronoun", "preposition", "conjunction", "adverb", "particle", "postposition"}

    def shows(word: dict, s: dict) -> bool:
        if word["pos"] not in FUNCTION:
            return True
        toks = [t.lower() for t in TOKEN.findall(s["de"])]
        lemma = word["lemma"].lower()
        if lemma not in toks:
            return False
        return not (word["pos"] in ("preposition", "adverb") and toks[-1] == lemma and toks.count(lemma) == 1)

    for x in out_words:
        lst = [s for s in by_word.get(x["id"], []) if shows(x, s)]
        if lst:
            s = min(lst, key=rank)
            x["example"] = {"id": s["id"], "de": s["de"], "en": s["en"]}

    eng = engineering_words({x["lemma"] for x in out_words}, ranks)
    log(f"Engineering deck: {len(eng)} words")

    # ---------------- write
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        "words.json": {"source": "Goethe-Institut word lists A1-B1; Wiktionary (CC BY-SA 4.0) via kaikki.org; order: DeReWo (IDS Mannheim, CC BY-NC 3.0)", "words": out_words},
        "word-forms.json": {"source": "Wiktionary (CC BY-SA 4.0) via kaikki.org", "forms": forms_out},
        "sentences.json": {"source": "Tatoeba (CC BY 2.0 FR); recordings CC BY 4.0 or CC BY-NC 4.0 by the named speaker", "sentences": sentences},
        "engineering.json": {"source": "Wiktionary (CC BY-SA 4.0) via kaikki.org, senses labelled with engineering-related topics; order: DeReWo", "words": eng},
    }
    digest = hashlib.sha256()
    sizes = {}
    for name, data in files.items():
        text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        (OUT / name).write_text(text, encoding="utf-8")
        digest.update(text.encode("utf-8"))
        sizes[name] = len(text.encode("utf-8"))
    version = digest.hexdigest()[:12]
    manifest = {"version": version, "files": list(files), "counts": {
        "words": len(out_words), "sentences": len(sentences), "engineering": len(eng),
        "wordsByLevel": dict(collections.Counter(x["level"] for x in out_words)),
    }}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"Wrote {', '.join(f'{k} {v // 1024} KB' for k, v in sizes.items())}; version {version}")

    # ---------------- report
    lv = collections.Counter(x["level"] for x in out_words)
    with_pl = sum(1 for x in out_words if x["pos"] == "noun" and x.get("plural"))
    nouns = sum(1 for x in out_words if x["pos"] == "noun")
    report += [
        "# Content report",
        "",
        f"Built {time.strftime('%Y-%m-%d %H:%M')} by `tools/build_content.py`. Content version `{version}`.",
        "",
        "## Words",
        "",
        "| Level | Words |", "|---|---|",
        *[f"| {l} | {lv.get(l, 0)} |" for l in LEVELS],
        f"| Total | {len(out_words)} |",
        "",
        f"- Nouns: {nouns}, of which {with_pl} have a plural (the rest are singular-only by source).",
        f"- With an example sentence from Tatoeba: {sum(1 for x in out_words if 'example' in x)}.",
        f"- With a human recording (Wikimedia Commons via Wiktionary): {sum(1 for x in out_words if 'audio' in x)}.",
        f"- With a full forms table: {len(forms_out)}.",
        "",
        "### Not imported",
        "",
        f"- Goethe lines that are not single words (phrases such as *an sein*, Austrian/Swiss variants, notes): {len(goethe_skipped)}.",
        f"- No Wiktionary entry ({len(no_entry)}): " + (", ".join(no_entry) if no_entry else "none") + ".",
        f"- Wiktionary entry without a usable English meaning ({len(no_english)}): " + (", ".join(no_english) if no_english else "none") + ".",
        "",
        "### Checks",
        "",
        f"Gender differs between Goethe and Wiktionary ({len(gender_notes)}); Goethe's article is used:",
        "",
        *[f"- {g}" for g in gender_notes],
        "",
        f"Plural differs or comes from Goethe only ({len(plural_notes)}):",
        "",
        *[f"- {p}" for p in plural_notes],
        "",
        "## Sentences",
        "",
        f"- Native-speaker German sentences with an English translation, 3-10 words, every word from the A1-B1 lists: {candidates}. Kept for the app (shortest 6 per word, recordings first): {len(sentences)}.",
        f"- Of these, with an open-licence recording: {sum(1 for s in sentences if 'a' in s)}.",
        "",
        "## Engineering deck",
        "",
        f"- {len(eng)} words (the most frequent by DeReWo) with a Wiktionary sense labelled with one of: {', '.join(sorted(ENGINEERING_TOPICS))}; and none of: {', '.join(sorted(NOT_ENGINEERING))}. Senses whose English starts with a capital (names, brands) are left out. Goethe words are left out because the main deck has them.",
        "- First 30: " + ", ".join(x["lemma"] for x in eng[:30]) + ".",
        "- Words a fill-in-the-blank card may remove: " + ", ".join(
            f"{name} {sum(1 for s in sentences if k in s.get('c', {}))}" for k, name in
            (("a", "article"), ("p", "preposition"), ("v", "conjugated verb"), ("j", "adjective ending"))) + ".",
        "",
    ]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(report), encoding="utf-8")
    log(f"Report: {REPORT.relative_to(ROOT)} ({time.time() - t0:.0f} s)")


if __name__ == "__main__":
    main()
