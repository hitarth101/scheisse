"""Reads the Goethe-Institut A1, A2 and B1 word lists (PDF) and returns their headword entries.

Only the headword column is read (word, article, plural marker, verb forms). Goethe's own example
sentences sit in a separate column and are never read, because they are copyrighted and not needed.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

import pymupdf

# Per list: pages of the alphabetical list (1-based, inclusive) and the x ranges (PDF points) of the
# headword columns. Measured from the PDFs; everything else on those pages is the example column.
LAYOUT = {
    "A1": {"file": "goethe-a1.pdf", "pages": (9, 27), "columns": [(100, 230)]},
    "A2": {"file": "goethe-a2.pdf", "pages": (8, 31), "columns": [(20, 100), (290, 370)]},
    "B1": {"file": "goethe-b1.pdf", "pages": (16, 102), "columns": [(20, 125), (300, 405)]},
}


@dataclass
class Entry:
    level: str
    raw: str
    page: int
    lemma: str = ""
    kind: str = ""            # noun | verb | other
    genders: list[str] = field(default_factory=list)   # m / f / n for nouns
    marker: str | None = None  # Goethe plural marker, e.g. "-e", "¨-e", "-Ä", "(Sg.)"
    reflexive: bool = False
    note: str = ""


def _lines(path: str, first: int, last: int, columns: list[tuple[int, int]]):
    """Yields (page, column, y, text) for headword-column lines, in reading order."""
    doc = pymupdf.open(path)
    for pno in range(first - 1, last):
        rows = []
        for block in doc[pno].get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                spans = [s for s in line["spans"] if s["text"].strip()]
                if not spans:
                    continue
                s0 = spans[0]
                if s0["size"] < 7.5 or "Bold" in s0["font"]:
                    continue  # page labels, headers
                x = s0["bbox"][0]
                col = next((i for i, (a, b) in enumerate(columns) if a <= x < b), None)
                if col is None:
                    continue
                text = "".join(s["text"] for s in spans)
                # An example sentence sometimes shares the headword's line: keep only the headword part.
                text = re.split(r"\t|\s{2,}", text.strip())[0].strip()
                if text:
                    rows.append((col, round(line["bbox"][1], 1), text))
        rows.sort()
        for col, y, text in rows:
            yield pno + 1, col, y, text


ARTICLE = {"der": "m", "die": "f", "das": "n"}


def _continues(prev: str, nxt: str) -> bool:
    p = prev.rstrip()
    n = nxt.lstrip()
    # Regional cross-references run on: "das Abitur (D) →A, CH:" + "Matura", "→CH: Velo", "Rad; CH: Velo"
    if n.startswith("→") or re.match(r"^\(?(A|CH|D)(, ?(A|CH|D))*[:)]", n):
        return True
    if "→" in p and not re.match(r"^(der|die|das) ", n) and (
            re.fullmatch(r"[A-ZÄÖÜ][\wäöüß()\-]*([;,].*)?", n) or ":" in n or p.endswith(("→", ":", ",", ";"))):
        return True
    if re.match(r"^(der|die|das)\b", n):
        return False  # a new noun always starts a new entry
    if p.endswith(",") or p.endswith("/") or p.endswith("der/die") or p.endswith("ist/hat"):
        return True
    if re.search(r"\b(ist|hat)$", p):
        return True
    if re.match(r"^\(sich\)\s*(,|\(|$)", n):
        return True  # "entschuldigen" + "(sich), entschuldigt, …"
    # A verb's forms run over several lines until the perfect ("hat …" / "ist …") is reached.
    first = p.split(",")[0].strip()
    if "," in p and re.fullmatch(r"(\(sich\) |sich )?[a-zäöüß][\wäöüß]*(en|ern|eln|tun|sein)( \(sich\))?", first) \
            and not re.search(r"\b(hat|ist)\b", p) and n[:1].islower():
        return True
    # Word wrapped with a hyphen: "das Einkaufs-" + "zentrum, -en"
    if re.search(r"[a-zäöüß]-$", p) and " " in p and n[:1].islower():
        return True
    return False


def read_list(level: str, raw_dir: str) -> list[Entry]:
    cfg = LAYOUT[level]
    entries: list[Entry] = []
    current: Entry | None = None
    for page, _col, _y, text in _lines(f"{raw_dir}/{cfg['file']}", *cfg["pages"], cfg["columns"]):
        if re.fullmatch(r"[A-ZÄÖÜ]", text):  # letter headings A, B, C …
            continue
        if current and _continues(current.raw, text):
            prev = current.raw.rstrip()
            if re.search(r"[a-zäöüß]-$", prev) and text[:1].islower():
                current.raw = prev[:-1] + text          # word broken across lines: "Kranken-" + "haus"
            else:
                current.raw = prev + " " + text
            continue
        current = Entry(level=level, raw=text, page=page)
        entries.append(current)
    out: list[Entry] = []
    for e in entries:
        out.extend(_parse(e))
    # A masculine noun listed right before its regional feminine form ("der Abwart" + "die Abwartin (CH)")
    # carries the same regional marker.
    for i in range(len(out) - 1):
        a, b = out[i], out[i + 1]
        if a.kind == "noun" and b.kind == "skip" and b.note == "Austrian or Swiss variant" \
                and re.match(rf"^die {re.escape(a.lemma[:5])}", _clean(b.raw)):
            out[i] = Entry(level=a.level, raw=a.raw, page=a.page, kind="skip", note="Austrian or Swiss variant")
    return [e for e in out if not (e.kind != "skip" and re.fullmatch(r"[A-ZÄÖÜ]{3,}", e.lemma))]


def _clean(s: str) -> str:
    s = s.replace("­", "").replace("‚", ",")
    s = re.sub(r"\s+", " ", s).strip()
    return s.strip(" ,;")


MARKER = re.compile(r"^(?:¨?-[a-zäöü]{0,3}|-[ÄÖÜäöü](?:, ?[a-z]{1,2})?)")


def _skip(e: Entry, why: str) -> list[Entry]:
    return [Entry(level=e.level, raw=e.raw, page=e.page, kind="skip", note=why)]


def _parse(e: Entry) -> list[Entry]:
    raw = _clean(e.raw)
    # Regional variants (Austria, Switzerland) are listed beside the German word; only words used in
    # Germany are kept. "(D)", "(D, A)" mark words used in Germany, so those stay.
    if re.match(r"^(A|CH|D)(, ?(A|CH|D))*:", raw) or raw.startswith("→"):
        return _skip(e, "Austrian or Swiss variant")
    for codes in re.findall(r"\(((?:A|CH|D)(?:, ?(?:A|CH|D))*)\)", raw):
        if "D" not in re.split(r", ?", codes):
            return _skip(e, "Austrian or Swiss variant")
    raw = re.split(r"\s*→", raw)[0]
    raw = re.sub(r"\s*\((?:A|CH|D)(?:, ?(?:A|CH|D))*\)", "", raw).strip()
    # Alternative spellings "die Fantasie/Phantasie", "gern/gerne": the first one is kept.
    raw = re.sub(r"^((?:der|die|das) )?([\wäöüßÄÖÜ\-]+)/ ?[\wäöüßÄÖÜ\-]+", r"\1\2", raw)
    # "der User, -/die Userin, -nen" → two nouns
    parts = re.split(r"\s*/\s*(?=(?:der|die|das) )", raw)
    if len(parts) > 1:
        return [x for p in parts for x in _parse(Entry(level=e.level, raw=p, page=e.page))]

    m = re.match(r"^(der|die|das)(?:/(der|die|das))? (.+)$", raw)
    if m:
        genders = [ARTICLE[m.group(1)]] + ([ARTICLE[m.group(2)]] if m.group(2) else [])
        rest = m.group(3)
        word, _, after = rest.partition(",")
        word = word.strip()
        mk = MARKER.match(after.strip())
        marker = mk.group(0) if mk else None
        num = re.search(r"\((Sg|Sing|Singular|Pl|pl|sg|Plural)\.?\)", word + " " + after)
        if num:
            marker = "(Pl.)" if num.group(1).lower().startswith("p") else "(Sg.)"
            word = re.sub(r"\s*\(.*?\)", "", word).strip()
        if marker == "(Pl.)":
            genders = []  # plural-only noun: "die" here is the plural article
        if not re.fullmatch(r"[A-ZÄÖÜ][\wäöüßÄÖÜ\-]*", word):
            return _skip(e, "noun is not a single word")
        return [Entry(level=e.level, raw=e.raw, page=e.page, lemma=word, kind="noun", genders=genders, marker=marker)]

    reflexive = False
    t = raw.rstrip("!")
    if t.startswith("(sich) ") or t.startswith("sich "):
        reflexive, t = True, t.split(" ", 1)[1]
    head = t.split(",")[0].strip()
    # "festnehmen nimmt fest, …": a missing comma in the source
    if " " in head and re.search(r"\b(hat|ist)\b", t) and re.match(r"^[a-zäöüß]+(en|ern|eln)\b", head):
        head = head.split(" ")[0]
    if head.endswith(" (sich)"):
        reflexive, head = True, head[:-7].strip()
    head = re.sub(r"\s*\(.*?\)\s*", " ", head).strip()  # remarks in brackets
    if not head or not re.fullmatch(r"[\wäöüßÄÖÜ\-]+", head):
        return _skip(e, "not a single word")
    word = head.rstrip("-")  # "all-", "ander-", "jed-": stems that take endings
    stem = head.endswith("-")
    looks_verb = bool(re.search(r"(en|ern|eln|n)$", word)) and ("," in t or word[:1].islower())
    has_forms = bool(re.search(r",\s*(hat|ist|\w+t\b)", t))
    kind = "verb" if (word[:1].islower() and has_forms) else ("verb?" if looks_verb else "other")
    return [Entry(level=e.level, raw=e.raw, page=e.page, lemma=word, kind=kind, reflexive=reflexive,
                  note="stem" if stem else "")]
