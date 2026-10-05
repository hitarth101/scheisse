"""Builds the Reading texts (product spec 4.5) into app/public/data/reading/.

Input:  tools/sources/reading/*.json  aligned German/English texts (tools/build_reading_sources.py)
        tools/sources/librivox.json  public-domain LibriVox readings, linked (streamed from archive.org), if found
        tools/raw/kaikki-German.jsonl.gz  Wiktionary (CC BY-SA) via kaikki.org, for the word popups
        app/public/data/words.json  the Goethe words, so popups and coverage use the same words as the cards
Output: reading/index.json  one row per text with its word counts by lemma (for the known-word percentage)
        reading/<id>.json   paragraphs, English, and a popup entry for every word form in the text

Nothing here writes German or English: texts are copied, popup meanings come from Wiktionary or the Goethe
word data, and each word form is linked to its dictionary word by Wiktionary's own "form of" entries.

Run from the repo root:  py tools/build_reading.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_content import form_of_targets, glosses, head_forms, log, noun_genders, wiktionary  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "sources" / "reading"
OUT = ROOT / "app" / "public" / "data" / "reading"
TOKEN = re.compile(r"[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*")
FUNCTION_POS = {"article", "determiner", "pronoun", "preposition", "conjunction"}
POS_LABEL = {"noun": "noun", "verb": "verb", "adj": "adjective", "adv": "adverb", "prep": "preposition", "conj": "conjunction",
             "pron": "pronoun", "det": "determiner", "article": "article", "num": "numeral", "intj": "interjection",
             "particle": "particle", "contraction": "contraction", "name": "name"}
ORDER = ["verb", "noun", "adj", "adv", "prep", "conj", "pron", "det", "article", "num", "particle", "intj", "contraction"]


def texts():
    index = json.loads((SRC / "index.json").read_text(encoding="utf-8"))
    for row in index:
        yield json.loads((SRC / f"{row['id']}.json").read_text(encoding="utf-8"))


def recordings():
    """LibriVox readings (tools/fetch_librivox.py), each recorded with the id of the text it reads."""
    path = ROOT / "tools" / "sources" / "librivox.json"
    if not path.exists():
        return lambda text: None
    data = json.loads(path.read_text(encoding="utf-8"))
    by_text = {r["text"]: r for r in data.get("grimm", []) + data.get("heidi", []) if r.get("text")}

    def find(text: dict):
        r = by_text.get(text["id"])
        if not r:
            return None
        return {k: r[k] for k in ("url", "reader", "duration", "book", "librivox") if r.get(k)}
    return find


def verb_forms(e: dict) -> list[str] | None:
    pres = head_forms(e, {"present", "singular", "third-person"})
    past = head_forms(e, {"past"})
    pp = head_forms(e, {"participle", "past"})
    aux = head_forms(e, {"auxiliary"})
    if not (pres and past and pp):
        return None
    third = {"haben": "hat", "sein": "ist"}
    auxes = [third[a] for a in dict.fromkeys(aux) if a in third] or ["hat"]
    return [pres[0], past[0], f"{'/'.join(sorted(auxes, reverse=True))} {pp[0]}"]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    words = json.loads((ROOT / "app" / "public" / "data" / "words.json").read_text(encoding="utf-8"))["words"]
    goethe: dict[str, list[dict]] = {}
    for w in words:
        goethe.setdefault(w["lemma"], []).append(w)
    is_function = lambda w: w["pos"] in FUNCTION_POS or (w["pos"] == "numeral" and w["lemma"] == "ein")  # noqa: E731

    all_texts = list(texts())
    tokens = {t for x in all_texts for p in x["paragraphs"] for s in p["de"] for t in TOKEN.findall(s)}
    wk = wiktionary(tokens)
    targets = set(form_of_targets([e for v in wk.values() for e in v])) - set(wk)
    follow = wiktionary(targets) if targets else {}
    entries = lambda w: wk.get(w, []) + follow.get(w, [])  # noqa: E731

    def candidates(tok: str):
        """(lemma, pos) pairs for a form, best first: Wiktionary's own form-of links, nouns first for capitals."""
        out = []
        for variant in (tok, tok.lower()) if tok[:1].isupper() else (tok,):
            for e in entries(variant):
                pos = e.get("pos")
                tg = form_of_targets([e])
                for lemma in tg or [variant]:
                    if (lemma, pos) not in out:
                        out.append((lemma, pos))
        cap = tok[:1].isupper()
        def rank(c):
            lemma, pos = c
            return (0 if lemma in goethe else 1, 0 if (pos == "noun") == cap else 1, ORDER.index(pos) if pos in ORDER else 99)
        return sorted(out, key=rank)

    def gloss_for(tok: str) -> dict | None:
        cands = candidates(tok)
        for lemma, pos in cands:
            if pos == "name":
                continue
            for w in goethe.get(lemma, []):
                if POS_LABEL.get(pos, pos) == w["pos"] or len(goethe[lemma]) == 1:
                    g = {"l": w["lemma"], "p": w["pos"], "en": w["en"][:4], "w": w["id"]}
                    for k_in, k_out in (("gender", "g"), ("plural", "pl"), ("forms", "f")):
                        if w.get(k_in):
                            g[k_out] = w[k_in]
                    if w.get("pluralOnly"):
                        g["po"] = 1
                    if is_function(w):
                        g["fw"] = 1
                    return g
            es = [e for e in entries(lemma) if e.get("pos") == pos]
            en = glosses(es)
            if not en:
                continue
            g = {"l": lemma, "p": POS_LABEL.get(pos, pos), "en": en}
            if pos == "noun":
                gs = sorted(noun_genders(es[0]) - {"pl"})
                if gs:
                    g["g"] = gs[0]
                pl = head_forms(es[0], {"plural"})
                if pl:
                    g["pl"] = pl[0]
            if pos == "verb":
                f = verb_forms(es[0])
                if f:
                    g["f"] = f
            if pos in ("prep", "conj", "pron", "det", "article"):
                g["fw"] = 1
            return g
        if any(pos == "name" for _, pos in cands):
            return {"l": tok, "p": "name", "en": glosses([e for e in entries(tok) if e.get("pos") == "name"]) or [], "nm": 1}
        return None

    OUT.mkdir(parents=True, exist_ok=True)
    index, cache = [], {}
    recording_for = recordings()
    for x in all_texts:
        gloss, counts, total, missing = {}, {}, 0, 0
        for p in x["paragraphs"]:
            for s in p["de"]:
                for tok in TOKEN.findall(s):
                    if tok not in cache:
                        cache[tok] = gloss_for(tok)
                    g = cache[tok]
                    if g:
                        gloss[tok] = g
                    if g and g.get("nm"):
                        continue
                    total += 1
                    key = g["l"] if g else tok.lower()
                    missing += 0 if g else 1
                    counts[key] = counts.get(key, 0) + 1
        out = {k: x[k] for k in ("id", "stage", "title", "titleEn", "author", "year", "historicalSpelling", "de", "en") if k in x}
        if x.get("stage") == 2:
            out.pop("year", None)  # a wiki page has no edition year
        out["paragraphs"] = x["paragraphs"]
        out["gloss"] = gloss
        rec = recording_for(x)
        if rec:
            out["audio"] = rec
        (OUT / f"{x['id']}.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        aligned = sum(1 for p in x["paragraphs"] if "en" in p) / max(1, len(x["paragraphs"]))
        index.append({**{k: out[k] for k in ("id", "stage", "title", "titleEn", "author", "year", "historicalSpelling") if k in out},
                      "words": total, "lemmas": counts, "aligned": round(aligned, 2), **({"audio": 1} if rec else {})})
        log(f"{x['id']}: {total} words, {len(counts)} lemmas, {missing} without a dictionary entry, {aligned:.0%} sentence-aligned")
    (OUT / "index.json").write_text(json.dumps({"texts": index}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    keep = {f"{t['id']}.json" for t in index} | {"index.json"}
    for f in OUT.glob("*.json"):
        if f.name not in keep:
            f.unlink()  # a text no longer in the sources
    log(f"Wrote {len(index)} texts")


if __name__ == "__main__":
    main()
