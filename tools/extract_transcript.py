"""Extracts English -> German sentence pairs per track from the volunteer Language Transfer transcript.

Source: "Complete German Transcript" (languagetransfer.org, 2020 version). The transcript warns it
contains many errors, so the app shows these pairs on the tick screen and only the pairs the owner
ticks as matching the audio become cards (product spec 4.2). Nothing is written or translated here:
both sides are copied from the transcript.

The course follows one rhythm: the teacher asks for a sentence in English, the student answers in
German, and the teacher repeats the correct German. A pair is the English request plus the teacher's
repetition (or the student's answer when the teacher does not repeat it).

Run from the repo root:  py tools/extract_transcript.py
Output: app/public/data/lt-pairs.json, report in tools/out/transcript-report.md
"""
from __future__ import annotations

import bz2
import collections
import json
import re
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "raw"
OUT = ROOT / "app" / "public" / "data" / "lt-pairs.json"
REPORT = ROOT / "tools" / "out" / "transcript-report.md"
PDF = RAW / "lt-transcript-2020.pdf"

WORD = re.compile(r"[A-Za-zÄÖÜäöüß]+(?:['’][a-z]+)?")


# ---------------------------------------------------------------- language scoring from Tatoeba
def vocab(path: Path, min_count: int) -> collections.Counter:
    c = collections.Counter()
    with bz2.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) >= 3:
                for w in WORD.findall(p[2]):
                    c[w.lower()] += 1
    return collections.Counter({w: n for w, n in c.items() if n >= min_count})


DE = vocab(RAW / "deu_sentences_detailed.tsv.bz2", 3)
EN = vocab(RAW / "eng_sentences.tsv.bz2", 3)
DE_TOTAL, EN_TOTAL = sum(DE.values()), sum(EN.values())
# Words that are frequent in English commentary and never a German answer on their own.
EN_MARKERS = {"the", "you", "is", "are", "to", "how", "what", "good", "very", "that", "this", "with", "we", "it's",
              "i'm", "would", "say", "of", "and", "yes", "no", "okay", "ok", "great", "perfect", "exactly", "right",
              "now", "again", "here", "because", "think", "know", "word", "means", "like", "or", "for", "my", "your"}


def lang_score(text: str) -> float:
    """+1 = clearly German, -1 = clearly English."""
    toks = [t.lower() for t in WORD.findall(text)]
    if not toks:
        return 0.0
    s = 0.0
    for t in toks:
        d = DE.get(t, 0) / DE_TOTAL
        e = EN.get(t, 0) / EN_TOTAL
        if t in EN_MARKERS:
            e *= 4
        if d == e == 0:
            continue
        s += (d - e) / (d + e)
    return s / len(toks)


def is_german(text: str) -> bool:
    toks = WORD.findall(text)
    return 1 <= len(toks) <= 16 and lang_score(text) >= 0.35 and not ({t.lower() for t in toks} & EN_MARKERS - {"was", "will", "so", "in", "also"})


def is_english(text: str) -> bool:
    toks = WORD.findall(text)
    return 2 <= len(toks) <= 18 and lang_score(text) <= -0.25


# ---------------------------------------------------------------- reading the PDF
HEADING = re.compile(
    r"^\s*(?:track\s*0?(\d{1,2})|lesson\s*0?(\d{1,2})\s*:?|0?(\d{1,2})|0?(\d{1,2})\s*-\s*language transfer.*"
    r"|.*complete german\W+(?:course\W+)?track\s*0?(\d{1,2}).*|.*\bgerman\W+track\s*0?(\d{1,2}).*)\s*$", re.I)


def pdf_lines():
    """(text, is_blank) for every line, with Teacher/Student labels kept as plain text."""
    doc = pymupdf.open(PDF)
    for page in doc:
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                text = "".join(s["text"] for s in line["spans"]).replace("​", "").replace("\xa0", " ")
                yield text.rstrip(), not text.strip()
            yield "", True  # block end counts as a paragraph break


def tracks() -> dict[int, list[tuple[str, bool]]]:
    out: dict[int, list] = {}
    current = 0
    for text, blank in pdf_lines():
        m = HEADING.match(text) if text and len(text) < 75 else None
        if m:
            n = int(next(g for g in m.groups() if g))
            if n == current + 1:
                current = n
                out[n] = []
                continue
        if current:
            out[current].append((text, blank))
    return out


def turns(lines: list[tuple[str, bool]]) -> list[tuple[str, str]]:
    """Splits a track into (speaker, text) turns. Speaker is 'T', 'S' or '?' when unlabelled."""
    labelled = sum(1 for t, _ in lines if re.match(r"^\s*(Teacher|Student)\s*:", t)) >= 5
    out: list[list[str]] = []
    cur: list[str] | None = None
    for text, blank in lines:
        if labelled:
            m = re.match(r"^\s*(Teacher|Student)\s*:\s*(.*)$", text)
            if m:
                cur = [m.group(1)[0], m.group(2)]
                out.append(cur)
            elif cur is not None and text.strip():
                cur[1] += " " + text.strip()
            continue
        if blank:
            cur = None
            continue
        if cur is None:
            cur = ["?", text.strip()]
            out.append(cur)
        else:
            cur[1] += " " + text.strip()
        # Unlabelled tracks without blank lines: a short line ends the turn (long lines wrap).
        if len(text) < 62:
            cur = None
    return [(s, re.sub(r"\s+", " ", t).strip()) for s, t in out if t.strip()]


# ---------------------------------------------------------------- pairs
LEAD = re.compile(
    r"^(?:(?:so|and|now|ok|okay|good|very good|great|then|well|right)[,.]?\s+)*"
    r"(?:(?:how|what)\s+(?:would|do|could|can|will|might)\s+(?:you|we)\s+say|how\s+(?:do|would)\s+(?:you|we)\s+say|how about|what about"
    r"|say|try|and|or|what'?s|what is|what was|what were)?\s*(?:in german)?\s*[:,]?\s*", re.I)
# Requests with no English content of their own ("How would that be in German?")
VAGUE = re.compile(r"\b(in german|how would (that|it|this) be|how (do|does|would) (you|one|we) say (it|that|this)|how is (that|it)|what (was|is) (that|it))\b", re.I)


def prompt_from(teacher: str) -> str | None:
    sentences = re.findall(r"[^.!?]+[.!?]?", teacher)
    for s in reversed(sentences[-2:]):
        s = s.strip()
        if not s:
            continue
        p = LEAD.sub("", s.lstrip("-–— ")).strip(" ,:;\"“”'-–—")
        p = re.sub(r"\s+-\s+.*$", "", p)          # "Can I not help? - Can I not help?" -> first
        if is_english(p) and p.endswith("?") and not VAGUE.search(p) and not re.search(r"[ÄÖÜäöüß]", p):
            return p
    return None


def german_lead(teacher: str) -> str | None:
    """The German the teacher repeats at the start of a turn ("Ich will schlafen, so you have…")."""
    first = re.split(r"(?<=[.!?])\s|,\s|\s-\s", teacher, maxsplit=1)[0].strip()
    return first if is_german(first) else None


def norm(s: str) -> list[str]:
    return [w.lower() for w in WORD.findall(s)]


def similar(a: str, b: str) -> bool:
    x, y = set(norm(a)), set(norm(b))
    return bool(x and y) and len(x & y) / len(x | y) >= 0.6


def tidy(s: str) -> str:
    s = s.strip().strip("\"“”'").strip()
    # Student self-corrections in the transcript: "Wo…Wo ist", "Blouse- Bluse", "unterbre... unterbricht"
    s = re.sub(r"\b[\wäöüßÄÖÜ]+(?:-\s+|…\s*|\.\.\.\s*)(?=[\wäöüßÄÖÜ])", "", s)
    s = re.sub(r"\s+([,.!?])", r"\1", s)
    s = s.rstrip(",;:")
    if s and s[-1] not in ".!?":
        s += "."
    return s[:1].upper() + s[1:]


def pairs_for(ts: list[tuple[str, str]]) -> list[dict]:
    out, seen = [], set()
    for i in range(1, len(ts)):
        sp, text = ts[i]
        if sp == "T" or not is_german(text) or len(norm(text)) < 2:
            continue
        prev_sp, prev = ts[i - 1]
        if prev_sp == "S":
            continue
        en = prompt_from(prev)
        if not en:
            continue
        answer = text
        if i + 1 < len(ts) and ts[i + 1][0] != "S":
            lead = german_lead(ts[i + 1][1])
            if lead and similar(lead, text) and len(norm(lead)) >= 2:
                answer = lead  # the teacher's repetition is the corrected version
        answer = re.split(r",\s*(?=[a-z])", answer)[0] if len(norm(answer)) > 3 else answer
        de = tidy(answer)
        key = " ".join(norm(de))
        # Unfinished answers ("Es ist...", "für – für-…") are left out.
        if key in seen or len(norm(de)) < 2 or re.search(r"…|\.\.\.|\s[–-]\s|[–-][.…]?$", de):
            continue
        seen.add(key)
        out.append({"en": tidy(en), "de": de})
    return out


def main():
    tr = tracks()
    missing = [n for n in range(1, 51) if n not in tr]
    result, rows = {}, []
    for n in range(1, 51):
        ts = turns(tr.get(n, []))
        ps = pairs_for(ts)
        result[str(n)] = ps
        rows.append(f"| {n:02d} | {len(ts)} | {len(ps)} |")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"source": "Language Transfer, Complete German Transcript (volunteer transcript, 2020), languagetransfer.org",
                               "tracks": result}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total = sum(len(v) for v in result.values())
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join([
        "# Transcript report",
        "",
        "Pairs extracted from the volunteer Language Transfer transcript by `tools/extract_transcript.py`.",
        "The transcript has many errors; every pair is checked by ear on the tick screen before it becomes a card.",
        "",
        f"Tracks found in the transcript: {50 - len(missing)} of 50" + (f" (missing: {missing})" if missing else "") + f". Pairs: {total}.",
        "",
        "| Track | Turns | Pairs |", "|---|---|---|", *rows, "",
    ]), encoding="utf-8")
    print(f"tracks {50 - len(missing)}/50, pairs {total}; missing {missing}")


if __name__ == "__main__":
    main()
