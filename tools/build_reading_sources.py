"""Builds the Reading texts (product spec 4.5, stages 2-4) from public-domain / open-licence sources.

Nothing here writes, translates or corrects German or English. Every string in the output is copied
from a named source; the only changes are (a) whitespace is normalised, (b) layout markup that is not
text is removed (Project Gutenberg illustration markers, spaced-print tildes, italic underscores,
footnote stars, the "* * *" divider lines, wiki tags), and (c) the 1921 Grimm print's speaker-change
dash " -- " is treated as a break between speeches and is not kept. A check at the end of the run proves
that every output string is a plain substring of its source text after those removals.

Sources (downloaded once into tools/raw/reading/, never published):
  Stage 2  Wikibooks German course, Level I lessons 1-3 (CC BY-SA 4.0): the German dialogue and the
           English translation that the same page gives in its exercise answers.
  Stage 3  Grimm fairy tales. German: Project Gutenberg #77905 (Langewiesche-Brandt print of 1921, modern
           spelling) for most tales; German Wikisource, "Kinder- und Haus-Märchen" 7th edition 1857
           (historical spelling) for tales the 1921 print does not contain.
           English: Margaret Hunt 1884, Project Gutenberg #5314 "Household Tales by Brothers Grimm".
  Stage 4  Heidi by Johanna Spyri. German: Project Gutenberg #7500 (modernised spelling), part 1,
           14 chapters. English: Marian Edwardes' translation, Project Gutenberg #1448.

Method (per text)
  1. Cut the German and the English text into paragraphs.
  2. Align the paragraphs with a length-based dynamic programme in the style of Gale & Church (1993):
     allowed groups 1-1, 1-2, 2-1, 1-0, 0-1; the English/German length ratio is measured per text.
  3. For each group, cut both sides into sentences (quotation marks and abbreviations handled). If the
     two sides have the same number of sentences and every pair has a believable length ratio, the
     group is stored as sentence pairs ("en"). Otherwise the German sentences are stored with the whole
     English paragraph(s) ("enPara"). A German paragraph with no English counterpart gets "enPara": null.
     No sentence pairing is ever forced.
  For the Grimm tales the 1921 print runs speeches together with " -- ", while Hunt (like the 1857 print)
  often gives each speech its own paragraph. The script therefore tries both readings of the German
  paragraphs and keeps the one that yields more sentence pairs.

Outputs
  tools/sources/reading/<id>.json   one file per text
  tools/sources/reading/index.json  the list in reading-ladder order
  tools/out/reading-report.md       counts, alignment shares, problems

Run from the repo root:  py tools/build_reading_sources.py        (add --refresh to download again)
"""
from __future__ import annotations

import argparse
import collections
import html as html_lib
import json
import math
import re
import statistics
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "raw" / "reading"
OUT = ROOT / "tools" / "sources" / "reading"
REPORT = ROOT / "tools" / "out" / "reading-report.md"

USER_AGENT = "german-reading-builder/1.0 (personal study project; polite, cached downloads)"


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# ---------------------------------------------------------------- downloads
def download(url: str, dest: Path, refresh: bool = False) -> Path:
    """Downloads url to dest once; later runs reuse the file unless --refresh is given."""
    if dest.exists() and dest.stat().st_size > 0 and not refresh:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    log(f"downloading {url}")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    dest.write_bytes(data)
    time.sleep(1.0)  # be polite to the servers
    return dest


def pg_text(ebook: int, refresh: bool = False) -> str:
    """Plain text of a Project Gutenberg ebook, cut to the part between the START and END lines."""
    path = download(f"https://www.gutenberg.org/cache/epub/{ebook}/pg{ebook}.txt", RAW / f"pg{ebook}.txt", refresh)
    raw = path.read_text(encoding="utf-8")
    a = raw.find("*** START OF")
    a = raw.find("\n", a) + 1
    b = raw.find("*** END OF")
    return raw[a:b].replace("\r\n", "\n")


def wiki_parse(host: str, page: str, dest: Path, refresh: bool = False) -> dict:
    """Rendered HTML and revision id of a wiki page, through the MediaWiki API (cached as JSON)."""
    params = {"action": "parse", "page": page, "prop": "text|revid", "format": "json", "formatversion": "2",
              "disablelimitreport": "1"}
    url = f"https://{host}/w/api.php?" + urllib.parse.urlencode(params)
    return json.loads(download(url, dest, refresh).read_text(encoding="utf-8"))["parse"]


# ---------------------------------------------------------------- text helpers
def collapse(s: str) -> str:
    """Normalises whitespace (including no-break spaces) to single spaces."""
    return re.sub(r"\s+", " ", s.replace(" ", " ").replace(" ", " ")).strip()


def plain_key(s: str) -> str:
    """Lower-case ASCII key for matching titles: ß -> ss, umlauts dropped to their base letter, letters only."""
    s = s.lower().replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if c.isalpha())


def slug(s: str) -> str:
    """Lower-case ASCII id part: ä -> ae, ö -> oe, ü -> ue, ß -> ss, everything else non-alphanumeric -> '-'."""
    s = s.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def join_lines(lines: list[str]) -> str:
    """Joins the lines of one paragraph. A line that ends in a hyphen is a real compound hyphen
    (Project Gutenberg proofreaders rejoin ordinary line-end hyphenation), so no space is added."""
    out = ""
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        if out and out[-1] == "-" and len(out) > 1 and out[-2].isalpha() and ln[0].islower():
            out += ln
        else:
            out = f"{out} {ln}" if out else ln
    return collapse(out)


def paragraphs_from_lines(lines: list[str]) -> list[str]:
    """Blank-line separated blocks -> paragraphs (lines joined)."""
    paras, cur = [], []
    for ln in lines:
        if ln.strip():
            cur.append(ln)
        elif cur:
            paras.append(join_lines(cur))
            cur = []
    if cur:
        paras.append(join_lines(cur))
    return [p for p in paras if p]


# ---------------------------------------------------------------- sentence splitting
# One splitter for both languages. A sentence ends at . ! ? or an ellipsis, plus any closing quotation marks,
# when the next word starts with a capital letter (or an opening quotation mark and then a capital).
# German nouns are capitalised too, so after ?" or !" (direct speech) a lower-case word means "he said", i.e.
# the sentence goes on. A comma right after the closing quote also means it goes on.
GER_ABBREV = {
    "z", "b", "d", "h", "u", "a", "o", "ä", "bzw", "usw", "etc", "ca", "nr", "dr", "st", "hr", "fr", "frl", "vgl", "prof",
    "geb", "gest", "ff", "s", "mt", "tit", "evang", "kath", "jh", "jhd", "bd", "no", "mr", "mrs", "ms", "sr", "jr",
}
ENG_ABBREV = {"mr", "mrs", "ms", "dr", "st", "mt", "vs", "etc", "i.e", "e.g", "no", "messrs", "capt", "col", "gen", "sr", "jr", "viz"}
OPEN_Q = set("»„“‘‚\"'")           # characters that can open a quotation after a sentence end
CLOSE_Q = set("»«“”‘’\"')]›‹")     # characters that can close one right after . ! ?
DASHES = ("--", "—", "–")


def _is_open_straight_quote(text: str, i: int) -> bool:
    """True if the straight quote at text[i] opens a quotation (space or bracket before it, a letter after it)."""
    before = text[i - 1] if i > 0 else " "
    after = text[i + 1] if i + 1 < len(text) else " "
    return (before.isspace() or before in "(—-–[") and not after.isspace()


def _word_before(text: str, i: int) -> str:
    j = i
    while j > 0 and not text[j - 1].isspace() and text[j - 1] not in "«»„“”‘’\"'([":
        j -= 1
    return text[j:i]


def _quote_depths(text: str, lang: str) -> list[int] | None:
    """Quotation depth before each character (index len(text) = depth at the end), or None if the marks do not balance.
    German: the guillemet » and the low quote „ open, the guillemet « and the high quote “ close. English: “ opens,
    ” closes. A straight " opens after a space or bracket and closes otherwise. Single quotation marks are ignored
    (they double as apostrophes)."""
    opens = "»„" if lang == "de" else "“"
    closes = "«“" if lang == "de" else "”"
    depth, out = 0, []
    for i, ch in enumerate(text):
        out.append(depth)
        if ch in opens:
            depth += 1
        elif ch in closes or (lang == "de" and ch == "”"):
            depth = max(0, depth - 1)
        elif ch == '"':
            depth = depth + 1 if _is_open_straight_quote(text, i) else max(0, depth - 1)
    out.append(depth)
    return out if depth == 0 else None


def split_sentences_ex(text: str, lang: str, coarse: bool = False) -> list[tuple[str, bool]]:
    """Cuts one paragraph into sentences without changing any character (the spaces between sentences are dropped).
    lang is "de" or "en". Returns (sentence, hard) where hard is True if the sentence follows the dash " -- " that
    the 1921 Grimm print puts between two speeches. That dash ends a sentence and is dropped when the break is
    made, because it is a speaker-change mark and not part of the text; two sentences with a dash between them
    are never joined later.
    coarse=True keeps every quotation in one piece: a full stop inside quotation marks does not end the sentence
    (so a speech of three sentences and the words that introduce it are one piece). If the quotation marks of the
    paragraph do not balance, the fine split is returned instead."""
    abbrev = GER_ABBREV if lang == "de" else ENG_ABBREV
    text = collapse(text)
    n = len(text)
    depth_at: list[int] | None = None
    if coarse:
        depth_at = _quote_depths(text, lang)
        if depth_at is None:
            return split_sentences_ex(text, lang, False)
    sents: list[tuple[str, bool]] = []
    pending_hard = False
    start = 0
    i = 0

    def emit(seg: str, next_hard: bool):
        nonlocal pending_hard
        seg = seg.strip()
        if seg:
            sents.append((seg, pending_hard))
            pending_hard = next_hard
        elif next_hard:
            pending_hard = True

    while i < n:
        ch = text[i]
        # speaker-change dash of the 1921 print without a full stop before it:  ... ," -- "Next speech
        if ch == "-" and text.startswith(" -- ", i - 1) and i - 1 > start:
            nxt = text[i + 3:i + 4]
            if nxt and (nxt in OPEN_Q or nxt.isupper()):
                emit(text[start:i - 1], True)
                start = i + 3
                i = start
                continue
        if ch in ".!?…":
            j = i
            while j + 1 < n and text[j + 1] in ".!?…":
                j += 1
            run = text[i:j + 1]
            k = j + 1
            while k < n and text[k] in CLOSE_Q and not (text[k] in "\"'" and _is_open_straight_quote(text, k)):
                k += 1
            if k >= n:
                break
            if text[k].isspace():
                p = k
                while p < n and text[p].isspace():
                    p += 1
                q = p                       # q = start of the next speech/sentence after an optional dash
                for d in DASHES:
                    if text.startswith(d, q):
                        q += len(d)
                        while q < n and text[q].isspace():
                            q += 1
                        break
                r = q                       # r = first letter after any opening quotation marks
                while r < n and text[r] in OPEN_Q:
                    r += 1
                nxt = text[r] if r < n else ""
                boundary = bool(nxt) and (nxt.isupper() or nxt.isdigit())
                if boundary and depth_at is not None and depth_at[k] > 0:
                    boundary = False        # still inside a quotation
                if boundary and run == "." and k == j + 1:
                    # a bare full stop: abbreviation, initial or (German) ordinal number?
                    w = _word_before(text, i)
                    if (w.lower() in abbrev
                            or (len(w) == 1 and w.isupper() and w not in "IA")
                            or (lang == "de" and re.fullmatch(r"\d+", w))
                            or re.fullmatch(r"(?:[a-zA-Z]\.)+[a-zA-Z]", w)):
                        boundary = False
                if boundary:
                    emit(text[start:k], q != p)
                    start = q
                    i = start
                    continue
            i = k
            continue
        i += 1
    emit(text[start:], False)
    return sents


def split_sentences(text: str, lang: str) -> list[str]:
    return [s for s, _ in split_sentences_ex(text, lang)]


# ---------------------------------------------------------------- alignment (Gale & Church style)
@dataclass
class Model:
    """Length model of one text pair: c = English characters per German character, s2 = variance per character."""
    c: float = 1.0
    s2: float = 6.8


def z_score(l1: int, l2: int, m: Model) -> float:
    """Gale & Church (1993): how far l2 English characters are from what l1 German characters predict."""
    mean = (l1 + l2 / m.c) / 2
    return (m.c * l1 - l2) / math.sqrt(max(mean, 10.0) * m.s2)


def match_cost(l1: int, l2: int, m: Model, prior: float) -> float:
    if l1 == 0 and l2 == 0:
        return -math.log(prior)
    return -math.log(max(math.erfc(abs(z_score(l1, l2, m)) / math.sqrt(2)), 1e-12)) - math.log(prior)


# Paragraph groups: the spec's 1-1, 1-2, 2-1, 1-0 and 0-1 (Gale & Church's own priors), plus 2-2 and 1-k / k-1 up to 1-8.
# The 1921 print puts several short speeches into one paragraph where Hunt starts a new paragraph for each speech, so
# without wider groups the English paragraphs drift against the German ones and the whole-paragraph fallback would
# show the wrong English. Wider groups never loosen the rule for sentence pairs (that stays: equal counts).
PARA_MOVES: dict[tuple[int, int], float] = {(1, 1): 0.89, (1, 0): 0.01, (0, 1): 0.01, (2, 1): 0.045, (1, 2): 0.045,
                                            (2, 2): 0.01}
for _k in range(3, 9):
    PARA_MOVES[(1, _k)] = PARA_MOVES[(_k, 1)] = 0.02 * 0.4 ** (_k - 3)
# Sentence groups inside one paragraph group: no deletions; a step may join up to four sentences on each side (a long
# German sentence that the translator cut in four, the other way round, or a sentence boundary that sits at a
# different place in the two texts).
_SENT_PRIOR = {2: 0.85, 3: 0.06, 4: 0.01, 5: 0.003, 6: 0.0015, 7: 0.0008, 8: 0.0004}
SENT_MOVES: dict[tuple[int, int], float] = {(k, l): _SENT_PRIOR[k + l] for k in range(1, 5) for l in range(1, 5)}


def _dp_align(l1: list[int], l2: list[int], m: Model, moves: dict[tuple[int, int], float],
              cross_ok=None, extra=None) -> list[tuple[int, int, int, int]] | None:
    """Length-based dynamic programme. Returns steps (i0, i1, j0, j1) or None when no path exists.
    cross_ok(side, a, b) may veto a step that spans items a..b-1 of side 0 (German) or 1 (English);
    extra(i0, i1, j0, j1) may add a cost to a step."""
    n, k = len(l1), len(l2)
    p1, p2 = [0], [0]
    for x in l1:
        p1.append(p1[-1] + x)
    for x in l2:
        p2.append(p2[-1] + x)
    inf = float("inf")
    cost = [[inf] * (k + 1) for _ in range(n + 1)]
    back: list[list[tuple[int, int] | None]] = [[None] * (k + 1) for _ in range(n + 1)]
    cost[0][0] = 0.0
    for i in range(n + 1):
        for j in range(k + 1):
            base = cost[i][j]
            if base == inf:
                continue
            for (di, dj), prior in moves.items():
                ni, nj = i + di, j + dj
                if ni > n or nj > k:
                    continue
                if cross_ok is not None and ((di > 1 and not cross_ok(0, i, ni)) or (dj > 1 and not cross_ok(1, j, nj))):
                    continue
                v = base + match_cost(p1[ni] - p1[i], p2[nj] - p2[j], m, prior)
                if extra is not None:
                    v += extra(i, ni, j, nj)
                if v < cost[ni][nj]:
                    cost[ni][nj] = v
                    back[ni][nj] = (i, j)
    if cost[n][k] == inf:
        return None
    steps = []
    i, j = n, k
    while (i, j) != (0, 0):
        pi, pj = back[i][j]  # type: ignore[misc]
        steps.append((pi, i, pj, j))
        i, j = pi, pj
    steps.reverse()
    return steps


TERMINAL = re.compile(r"([.!?…]+)[\s»«„“”‘’\"')\]›‹]*$")
QUOTE_MARKS = set("»«„“”\"")


def ends_with_question(s: str) -> bool:
    mt = TERMINAL.search(s)
    return bool(mt) and mt.group(1).endswith("?")


def quote_count(s: str) -> int:
    return sum(1 for ch in s if ch in QUOTE_MARKS)


def align_paragraphs(de_paras: list[str], en_paras: list[str], m: Model) -> list[tuple[list[int], list[int]]]:
    """Aligns two lists of paragraphs by their lengths. Quotation marks and question marks add to a group's cost when
    the two sides disagree, because paragraph lengths alone are ambiguous in dialogue. Returns the groups
    [(german indices, english indices)] in order."""
    def prefix(paras: list[str], f) -> list[int]:
        out = [0]
        for p in paras:
            out.append(out[-1] + f(p))
        return out

    qd, qe = prefix(de_paras, quote_count), prefix(en_paras, quote_count)
    md, me = prefix(de_paras, lambda p: p.count("?")), prefix(en_paras, lambda p: p.count("?"))

    def extra(i0: int, i1: int, j0: int, j1: int) -> float:
        return (min(abs((qd[i1] - qd[i0]) - (qe[j1] - qe[j0])), 6)
                + min(abs((md[i1] - md[i0]) - (me[j1] - me[j0])), 4))

    steps = _dp_align([len(p) for p in de_paras], [len(p) for p in en_paras], m, PARA_MOVES, None, extra) or []
    return [(list(range(i0, i1)), list(range(j0, j1))) for i0, i1, j0, j1 in steps]


# ---------------------------------------------------------------- sentence pairs inside a paragraph group
# A step is trusted when its length is within Z_MAX of what the text's usual ratio predicts. The variance is measured
# on the text itself (see calibrate), so a very literal translation is held to a tighter standard than a free one.
# Three signals count against a pair: a length far from the usual (SOFT_Z), a question that is not a question on the
# other side, a different number of quotation marks. One signal in a few pairs is normal in a translation (SLACK);
# two signals in one pair, signals in two neighbouring pairs, or neighbouring pairs that are off in opposite
# directions mean a sentence boundary that sits at a different place in the two books, and the group is not trusted.
Z_MAX = 3.5             # a step further than this from the usual length ratio is never trusted
SOFT_Z = 2.0            # a step further than this carries one signal
SLACK = 0.15            # share of steps that may carry a signal; at least one step once a group has two
SHIFT_Z = 0.8            # neighbouring pairs off in opposite directions by more than this (and one by more than SOFT_Z) are a shifted boundary
MAX_MERGED_SHARE = 0.5  # in groups of six or more steps, more merged units than this means the group is not trusted
MERGED_UNITS = False     # the spec pairs sentences only when the counts are equal; True also allows steps that join sentences
USE_COARSE = True        # try the coarse split (each quotation in one piece) when the fine split gives different counts
REPAIR_WIDTHS = (2, 3, 4)  # a failed group is joined with up to this many neighbouring groups and tried again
MAX_S2 = 4.0             # the variance per character is never taken larger than this (Gale & Church measured 6.8 on other texts)
FIRST_PASS_S2 = 3.0      # variance for the first pass, before the text has been measured


def judge_steps(de_sents: list[str], en_sents: list[str], steps: list[tuple[int, int, int, int]],
                m: Model) -> tuple[list[bool], list[bool]]:
    """For each step (German sentences i0:i1 against English sentences j0:j1): is it bad, and does it carry a signal?
    Bad: far outside the usual length ratio (Z_MAX), two signals in one pair, a signal next to a signal in the
    neighbouring pair, or neighbours that are too long and too short (the sentence boundary of one text sits a clause
    away from the other's, and each pair carries part of its neighbour's translation)."""
    bad, flagged = [], []
    prev_z, prev_flag = 0.0, False
    for i0, i1, j0, j1 in steps:
        d = " ".join(de_sents[i0:i1])
        e = " ".join(en_sents[j0:j1])
        signed = z_score(len(d), len(e), m)
        z = abs(signed)
        flags = int(z > SOFT_Z)
        flags += ends_with_question(de_sents[i1 - 1]) != ends_with_question(en_sents[j1 - 1])
        extra_quotes = quote_count(d) - quote_count(e)          # German marks minus English marks
        flags += (extra_quotes >= 2) * 2 + (extra_quotes <= -2)  # a speech missing in the English counts double
        is_bad = (z > Z_MAX or flags >= 2 or (flags > 0 and prev_flag)
                  or (prev_z * signed < 0 and min(abs(prev_z), z) > SHIFT_Z and max(abs(prev_z), z) > SOFT_Z))
        if is_bad and flags and prev_flag and bad:
            bad[-1] = True                 # the neighbour that started the cluster is not trusted either
        bad.append(is_bad)
        flagged.append(bool(flags))
        prev_z, prev_flag = signed, bool(flags)
    return bad, flagged


def steps_are_believable(de_sents: list[str], en_sents: list[str], steps: list[tuple[int, int, int, int]], m: Model) -> bool:
    """Group-level verdict (used when steps may join sentences): no bad step, few signals, not too many merged steps."""
    bad, flagged = judge_steps(de_sents, en_sents, steps, m)
    n = len(steps)
    if any(bad) or (n >= 2 and sum(flagged) > max(1, int(SLACK * n))):
        return False
    merged = sum(1 for i0, i1, j0, j1 in steps if (i1 - i0, j1 - j0) != (1, 1))
    return n < 6 or merged <= MAX_MERGED_SHARE * n


def paragraphs_that_pass(de_sents: list[str], en_sents: list[str], de_para: list[int], n_paras: int, m: Model) -> list[bool]:
    """The spec's rule for a group whose German and English sentence counts are equal: sentence k is paired with
    sentence k. The pairs of each German paragraph are kept when none of them is bad and not too many carry a
    signal; a paragraph next to a doubtful pair gets the whole English paragraph instead (never a forced pairing)."""
    de_len = sum(map(len, de_sents))
    if de_len >= 40 and not 0.65 <= sum(map(len, en_sents)) / (m.c * de_len) <= 1.55:
        return [False] * n_paras
    steps = [(k, k + 1, k, k + 1) for k in range(len(de_sents))]
    bad, flagged = judge_steps(de_sents, en_sents, steps, m)
    passes = []
    for q in range(n_paras):
        idx = [k for k, p in enumerate(de_para) if p == q]
        ok = not any(bad[k] for k in idx)
        if ok and len(idx) >= 2 and sum(flagged[k] for k in idx) > max(1, int(SLACK * len(idx))):
            ok = False
        passes.append(ok)
    return passes


def _units(de_sents, de_para, de_hard, en_sents, en_para, m: Model) -> list[tuple[int, int, int, int]] | None:
    """Sentence-level Gale-Church inside a group, where a step may join up to four sentences of one side (never across
    a paragraph break and never across a dropped speaker-change dash). Quotation marks and question marks add to a
    step's cost, so speeches and questions help to keep the two sides in step. Returns the steps if the whole
    alignment is believable, else None. Used to locate English paragraphs, and for the output only with
    MERGED_UNITS."""
    def cross_ok(side: int, a: int, b: int) -> bool:
        para = de_para if side == 0 else en_para
        if len({para[x] for x in range(a, b)}) > 1:
            return False
        return not (side == 0 and any(de_hard[x] for x in range(a + 1, b)))

    qd = [0]
    for sent in de_sents:
        qd.append(qd[-1] + quote_count(sent))
    qe = [0]
    for sent in en_sents:
        qe.append(qe[-1] + quote_count(sent))
    de_q = [ends_with_question(x) for x in de_sents]
    en_q = [ends_with_question(x) for x in en_sents]
    de_last = [x + 1 == len(de_para) or de_para[x + 1] != de_para[x] for x in range(len(de_para))]
    en_last = [x + 1 == len(en_para) or en_para[x + 1] != en_para[x] for x in range(len(en_para))]

    def extra(i0: int, i1: int, j0: int, j1: int) -> float:
        cost = 1.0 * abs((qd[i1] - qd[i0]) - (qe[j1] - qe[j0]))
        if de_q[i1 - 1] != en_q[j1 - 1]:
            cost += 1.5
        if de_last[i1 - 1] and en_last[j1 - 1] and (i1 < len(de_para) or j1 < len(en_para)):
            cost -= 0.7                 # both paragraphs end here: a good place for a step to end
        return cost

    steps = _dp_align([len(x) for x in de_sents], [len(x) for x in en_sents], m, SENT_MOVES, cross_ok, extra)
    if steps and steps_are_believable(de_sents, en_sents, steps, m):
        return steps
    return None


@dataclass
class Group:
    """German paragraphs di and English paragraphs ei that were aligned with each other."""
    di: list[int]
    ei: list[int]
    objects: list[dict | None] | None = None   # per German paragraph: object with sentence-level "en", or None; None = no paragraph passed
    exact: bool = False                 # True if the sentence counts were equal (the spec's rule)
    coarse: bool = False                # True if the coarse split (quotations in one piece) was needed
    enparas: dict[int, str | None] = field(default_factory=dict)   # German paragraph -> English paragraphs located for it

    def failed(self) -> bool:
        return self.objects is None or any(o is None for o in self.objects)


def _try_sentences(g: Group, de_sent, en_sent, m: Model) -> bool:
    """Tries to give the paragraphs of group g sentence-level English. Sets g.objects (one entry per German
    paragraph; None for a paragraph that did not pass) and returns True if at least one paragraph passed. The spec's
    rule: equal sentence counts and believable lengths. If the sentences do not match one for one, the same test is
    made on the coarse split, where each quotation stays in one piece; the split that lets more text through wins.
    With MERGED_UNITS a step may also join sentences of one side (off by default)."""
    if not g.di or not g.ei:
        return False
    best = None            # (German characters that passed, objects, exact, coarse)
    for mode in ((0, 1) if USE_COARSE else (0,)):
        de_split = [de_sent[mode][i] for i in g.di]
        en_split = [en_sent[mode][j] for j in g.ei]
        de_sents = [s for x in de_split for s, _ in x]
        de_para = [k for k, x in enumerate(de_split) for _ in x]
        de_hard = [h for x in de_split for _, h in x]
        en_sents = [s for x in en_split for s, _ in x]
        en_para = [k for k, x in enumerate(en_split) for _ in x]
        candidates = []
        if de_sents and len(de_sents) == len(en_sents):
            steps = [(k, k + 1, k, k + 1) for k in range(len(de_sents))]
            candidates.append((steps, paragraphs_that_pass(de_sents, en_sents, de_para, len(g.di), m), True))
        if MERGED_UNITS and mode == 0:
            steps = _units(de_sents, de_para, de_hard, en_sents, en_para, m)
            if steps:
                candidates.append((steps, [True] * len(g.di), False))
        for steps, passes, exact in candidates:
            if not any(passes):
                continue
            by_para: dict[int, tuple[list[str], list[str]]] = {}
            for i0, i1, j0, j1 in steps:               # every step lies inside one German paragraph
                d_units, e_units = by_para.setdefault(de_para[i0], ([], []))
                d_units.append(" ".join(de_sents[i0:i1]))
                e_units.append(" ".join(en_sents[j0:j1]))
            objects = [{"de": by_para[k][0], "en": by_para[k][1]} if passes[k] else None for k in range(len(g.di))]
            score = sum(len(" ".join(o["de"])) for o in objects if o)
            if best is None or score > best[0]:
                best = (score, objects, exact, mode == 1)
    if best is None:
        return False
    _, g.objects, g.exact, g.coarse = best
    return True


def _locate_fallbacks(groups: list[Group], de_sent, en_sent, en_paras: list[str], m: Model) -> None:
    """Where paragraph breaks sit at different places in the two books, the English paragraphs of a failed group can
    start or end a sentence or two off (the English of a neighbouring German paragraph shows up in this one). For each
    run of groups with failed paragraphs, together with the groups next to it, a sentence-level alignment (steps may
    join sentences) is made only to find which English paragraphs hold the translation of each German paragraph;
    the whole English paragraphs are then stored as "enPara". If no believable alignment exists the group's own
    English paragraphs are kept. No sentence pair comes from this step."""
    n = len(groups)
    k = 0
    while k < n:
        if not groups[k].failed():
            k += 1
            continue
        a = k
        while k < n and groups[k].failed():
            k += 1
        lo, hi = max(0, a - 1), min(n, k + 1)
        di = [i for g in groups[lo:hi] for i in g.di]
        ei = [j for g in groups[lo:hi] for j in g.ei]
        if not di or not ei:
            continue
        de_split = [de_sent[0][i] for i in di]
        en_split = [en_sent[0][j] for j in ei]
        de_sents = [t for x in de_split for t, _ in x]
        de_para = [q for q, x in enumerate(de_split) for _ in x]
        de_hard = [h for x in de_split for _, h in x]
        en_sents = [t for x in en_split for t, _ in x]
        en_para = [q for q, x in enumerate(en_split) for _ in x]
        steps = _units(de_sents, de_para, de_hard, en_sents, en_para, m)
        if not steps:
            continue
        touched: dict[int, set[int]] = {i: set() for i in di}
        for i0, i1, j0, j1 in steps:
            touched[di[de_para[i0]]].update(ei[en_para[j]] for j in range(j0, j1))
        for g in groups[a:k]:
            for q, i in enumerate(g.di):
                if g.objects is None or g.objects[q] is None:
                    js = touched[i]
                    g.enparas[i] = " ".join(en_paras[j] for j in range(min(js), max(js) + 1)) if js else None


@dataclass
class Built:
    """Aligned paragraphs of one text plus the numbers for the report."""
    paragraphs: list[dict]
    model: Model = field(default_factory=Model)
    units: int = 0                     # entries in all "de" lists
    units_aligned: int = 0             # entries in paragraphs that have sentence-level English
    paragraphs_aligned: int = 0
    exact_units: int = 0               # ... of which in groups with equal sentence counts (the spec's rule)
    coarse_units: int = 0              # ... of which needed the coarse split (each quotation in one piece)
    unmatched_en: int = 0              # English paragraphs with no German counterpart (left out)
    repaired: int = 0                  # paragraph groups that were joined with a neighbour to make them fit
    group_kinds: collections.Counter = field(default_factory=collections.Counter)
    turns_split: bool = False          # True if the German speech turns were split into paragraphs


def split_turns(paras: list[str]) -> list[str]:
    """The 1921 print runs speeches together with " -- ". Here each speech becomes its own paragraph (the dash is
    not kept), the way Hunt and most modern editions print dialogue."""
    out: list[str] = []
    for p in paras:
        parts = re.split(r"(?<=[.!?…»«,]) -- (?=[»A-ZÄÖÜ„“\"])", p)
        out.extend(x.strip() for x in parts if x.strip())
    return out


def build_aligned(de_paras: list[str], en_paras: list[str], m: Model, direct: bool = False) -> Built:
    """Paragraph alignment, then sentence pairs (or whole English paragraphs) for each group. A group in which no
    paragraph passes is joined with its neighbours (up to four groups) when the paragraph breaks of the two texts sit
    at different places, and tried again; what still does not pass keeps the whole English paragraph(s).
    direct=True pairs paragraph i with paragraph i (dialogue turns) instead of aligning them."""
    de_sent = [[split_sentences_ex(p, "de", co) for p in de_paras] for co in (False, True)]
    en_sent = [[split_sentences_ex(p, "en", co) for p in en_paras] for co in (False, True)]
    if direct:
        groups = [Group([i], [i]) for i in range(len(de_paras))]
    else:
        groups = [Group(di, ei) for di, ei in align_paragraphs(de_paras, en_paras, m)]
    for g in groups:
        _try_sentences(g, de_sent, en_sent, m)
    built = Built(paragraphs=[], model=m)
    done = direct
    while not done:
        done = True
        for idx, g in enumerate(groups):
            if g.objects is not None:
                continue
            for width in REPAIR_WIDTHS:
                found = None
                for a in range(max(0, idx - width + 1), min(idx, len(groups) - width) + 1):
                    union = Group([i for x in groups[a:a + width] for i in x.di], [j for x in groups[a:a + width] for j in x.ei])
                    if _try_sentences(union, de_sent, en_sent, m):
                        found = (a, a + width, union)
                        break
                if found:
                    a, b, union = found
                    groups[a:b] = [union]
                    built.repaired += 1
                    done = False
                    break
            if not done:
                break
    if not direct:
        _locate_fallbacks(groups, de_sent, en_sent, en_paras, m)
    for g in groups:
        built.group_kinds[f"{len(g.di)}-{len(g.ei)}"] += 1
        if not g.di:
            built.unmatched_en += len(g.ei)
            continue
        en_text = " ".join(en_paras[j] for j in g.ei) if g.ei else None
        for q, i in enumerate(g.di):
            obj = g.objects[q] if g.objects is not None else None
            if obj is not None:
                built.paragraphs.append(obj)
                built.paragraphs_aligned += 1
                built.units_aligned += len(obj["de"])
                if g.exact:
                    built.exact_units += len(obj["de"])
                if g.coarse:
                    built.coarse_units += len(obj["de"])
            else:
                built.paragraphs.append({"de": [t for t, _ in de_sent[0][i]], "enPara": g.enparas.get(i, en_text)})
    built.units = sum(len(p["de"]) for p in built.paragraphs)
    return built


def calibrate(built: Built, default: float = 3.0) -> Model:
    """Measures the length model on the units that were paired: c = English characters per German character (ratio of
    sums, so English material without a German counterpart does not distort it) and a robust estimate (median
    absolute deviation) of the per-character variance, kept between 1 and MAX_S2. With fewer
    than 20 pairs the first model is kept and the variance is set to a middle value."""
    m = built.model
    pairs = [(d, e) for p in built.paragraphs if "en" in p for d, e in zip(p["de"], p["en"])]
    long_pairs = [(d, e) for d, e in pairs if len(d) >= 40]
    if len(pairs) < 20 or len(long_pairs) < 10:
        return Model(m.c, default)
    c = sum(len(e) for _, e in pairs) / sum(len(d) for d, _ in pairs)
    v = [(len(e) - c * len(d)) / math.sqrt(len(d)) for d, e in long_pairs]
    return Model(c, min(MAX_S2, max(1.0, (statistics.median(abs(x) for x in v) / 0.6745) ** 2)))


def align_text(de_paras: list[str], en_paras: list[str], try_turn_split: bool = False) -> Built:
    """Full alignment of one text: the length ratio c is measured on the whole text; a first pass with the generous
    starting variance gives the pairs from which c and the variance of this particular translation are measured;
    a second pass uses them. For the 1921 Grimm print both readings of the speech turns are tried and the better kept."""
    c = sum(map(len, en_paras)) / max(1, sum(map(len, de_paras)))
    variants = [(de_paras, False)]
    if try_turn_split:
        split = split_turns(de_paras)
        if len(split) != len(de_paras):
            variants.append((split, True))
    best: Built | None = None
    for paras, split in variants:
        first = build_aligned(paras, en_paras, Model(c, FIRST_PASS_S2))
        built = build_aligned(paras, en_paras, calibrate(first))
        built.turns_split = split
        if best is None or built.units_aligned > best.units_aligned:
            best = built
    assert best is not None
    return best


# ---------------------------------------------------------------- Project Gutenberg parsers
def pg_blocks(lines: list[str]) -> list[tuple[int, int, list[str]]]:
    """Blank-line separated blocks as (first line index, last line index + 1, lines)."""
    blocks, cur, first = [], [], 0
    for i, ln in enumerate(lines):
        if ln.strip():
            if not cur:
                first = i
            cur.append(ln)
        elif cur:
            blocks.append((first, i, cur))
            cur = []
    if cur:
        blocks.append((first, len(lines), cur))
    return blocks


HUNT_CONTENTS = re.compile(r"^\s*(\d+\*?|Legend \d+)\s+(.+?)\s*\((.+)\)\s*$")


def parse_hunt(refresh: bool = False) -> dict[str, dict]:
    """Hunt 1884, Project Gutenberg #5314: {tale key -> title, German title from the contents list, paragraphs}.
    Keys are the Grimm numbers ("5", "151*") and "Legend 1" ... "Legend 10"."""
    lines = pg_text(5314, refresh).split("\n")
    ci = next(i for i, ln in enumerate(lines) if ln.strip() == "CONTENTS")
    contents, last = [], ci
    for i in range(ci + 1, ci + 300):
        m = HUNT_CONTENTS.match(lines[i])
        if m:
            contents.append((m.group(1), m.group(2), m.group(3)))
            last = i
    heads: dict[str, tuple[int, str]] = {}
    pos = last + 1
    for key, _, _ in contents:
        for i in range(pos, len(lines) - 1):
            ln = lines[i]
            if ln.startswith(key + " ") and not lines[i - 1].strip() and not lines[i + 1].strip():
                heads[key] = (i, ln[len(key):].strip())
                pos = i + 1
                break
        else:
            raise RuntimeError(f"Hunt: heading for tale {key} not found")
    keys = [k for k, _, _ in contents]
    out = {}
    for n, key in enumerate(keys):
        i, title = heads[key]
        end = heads[keys[n + 1]][0] if n + 1 < len(keys) else len(lines)
        paras = paragraphs_from_lines(lines[i + 1:end])
        cleaned = []
        for p in paras:
            if re.fullmatch(r"[\s*]+", p):          # "* * * * * * *" divider
                continue
            p = re.sub(r"(?<=[A-Za-z.,;:!?”’])\*(?=\s|$)", "", p)   # footnote star (the note itself is not in the file)
            cleaned.append(p)
        de_title = next(d for k, _, d in contents if k == key)
        out[key] = {"key": key, "title": title, "titleDe": de_title, "paragraphs": cleaned}
    return out


def parse_grimm_1921(refresh: bool = False) -> dict[str, dict]:
    """Langewiesche-Brandt print of 1921, Project Gutenberg #77905: {plain title key -> title, paragraphs}."""
    lines = pg_text(77905, refresh).split("\n")
    ii = max(i for i, ln in enumerate(lines) if ln.strip() == "Inhalt")
    inhalt = {}
    for ln in lines[ii + 1:]:
        m = re.match(r"^\s*(\S.*?)\s{2,}(\d+)\s*$", ln)
        if m:
            inhalt[plain_key(m.group(1))] = m.group(1).strip()
    marks = []
    for i, ln in enumerate(lines[:ii]):
        if ln.strip() in ("[Illustration]", "[Illustration:]"):
            j = i + 1
            while not lines[j].strip():
                j += 1
            k = j
            while lines[k].strip():
                k += 1
            title = collapse(" ".join(lines[j:k]).replace("·", " "))
            if title != "Inhalt":
                marks.append((i, k, title))
    out = {}
    for n, (i, k, raw_title) in enumerate(marks):
        end = marks[n + 1][0] if n + 1 < len(marks) else ii
        body = [ln for ln in lines[k:end] if not ln.strip().startswith("[Illustration")]
        paras = [collapse(p.replace("~", "")) for p in paragraphs_from_lines(body)]
        key = plain_key(raw_title)
        title = inhalt.get(key, raw_title)
        out[key] = {"title": title, "paragraphs": [p for p in paras if p]}
    return out


ROMAN = {"I": 1, "V": 5, "X": 10, "L": 50}


def roman_to_int(r: str) -> int:
    total = 0
    for a, b in zip(r, r[1:] + " "):
        total += -ROMAN[a] if b != " " and ROMAN[a] < ROMAN[b] else ROMAN[a]
    return total


def parse_heidi_de(refresh: bool = False) -> list[dict]:
    """Heidis Lehr- und Wanderjahre (part 1, 14 chapters), Project Gutenberg #7500: [{n, title, paragraphs}]."""
    lines = pg_text(7500, refresh).split("\n")
    toc = []
    for ln in lines[:80]:
        m = re.match(r"^\s{2}(\d+)\s+(\S.*)$", ln)
        if m:
            toc.append((int(m.group(1)), collapse(m.group(2))))
    blocks = pg_blocks(lines)
    heads = []
    pos = 0
    for n, title in toc:
        for bi in range(pos, len(blocks)):
            first, end, blk = blocks[bi]
            if collapse(" ".join(blk)) == title:      # a one- or two-line heading (the contents list is one big block)
                heads.append((n, title, bi))
                pos = bi + 1
                break
        else:
            raise RuntimeError(f"Heidi (de): chapter {n} heading not found")
    out = []
    for k, (n, title, bi) in enumerate(heads):
        end_bi = heads[k + 1][2] if k + 1 < len(heads) else len(blocks)
        paras = [join_lines(blk) for _, _, blk in blocks[bi + 1:end_bi]]
        paras = [re.sub(r"_([^_]+)_", r"\1", p) for p in paras]           # _italic_ markers
        out.append({"n": n, "title": title, "paragraphs": [p for p in paras if p]})
    return out


def parse_heidi_en(refresh: bool = False) -> list[dict]:
    """Heidi in Marian Edwardes' translation, Project Gutenberg #1448: [{n, title, paragraphs}] for chapters I-XXIII."""
    lines = pg_text(1448, refresh).split("\n")
    ci = next(i for i, ln in enumerate(lines) if ln.strip() == "CONTENTS")
    titles = {}
    for ln in lines[ci + 1:ci + 40]:
        m = re.match(r"^([IVXL]+)\s{2,}(\S.*)$", ln)
        if m:
            titles[roman_to_int(m.group(1))] = collapse(m.group(2))
    starts = [(i, roman_to_int(m.group(1))) for i, ln in enumerate(lines) if (m := re.match(r"^CHAPTER ([IVXL]+)\.", ln))]
    out = []
    for k, (i, n) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(lines)
        out.append({"n": n, "title": titles[n], "paragraphs": paragraphs_from_lines(lines[i + 1:end])})
    return out


# ---------------------------------------------------------------- German Wikisource (1857 edition)
def parse_wikisource_tale(page: str, refresh: bool = False) -> dict:
    """One tale of the 7th edition (1857) from German Wikisource, e.g. "Der süße Brei (1857)". The page body is
    transcluded from proofread scans; page-number marks are removed. Returns title, paragraphs, revision id."""
    from lxml import html as lxml_html

    d = wiki_parse("de.wikisource.org", page, RAW / "wikisource" / (slug(page) + ".json"), refresh)
    root = lxml_html.fromstring(d["text"])
    box = next(div for div in root.iter("div") if "display:table" in (div.get("style") or ""))
    for span in list(box.iter("span")):
        if "PageNumber" in (span.get("class") or ""):
            span.drop_tree()
    for br in box.iter("br"):
        br.tail = " " + (br.tail or "")
    paras = [collapse(p.text_content()) for p in box.iter("p")]
    return {"title": re.sub(r"\s*\(1857\)$", "", page), "paragraphs": [p for p in paras if p], "revid": d["revid"],
            "flat": collapse(box.text_content()),
            "url": f"https://de.wikisource.org/w/index.php?title={urllib.parse.quote(page.replace(' ', '_'))}&oldid={d['revid']}"}


# ---------------------------------------------------------------- Wikibooks German course, Level I dialogues
# The lessons whose page gives an English translation of the dialogue in its exercise answers ("Translation to
# English:"). Everything else in the course was inspected and left out; the reasons are in the report.
WIKIBOOKS_LESSONS = [      # page, id, lesson number and title as the Level I contents page prints them
    ("German/Level I/Wie heißt du", "wikibooks-wie-heisst-du-1", 1, "Wie heißt du? (1. Teil)"),
    ("German/Level I/Wie heißt du 2", "wikibooks-wie-heisst-du-2", 2, "Wie heißt du? (2. Teil)"),
    ("German/Level I/Bitte buchstabieren Sie", "wikibooks-bitte-buchstabieren-sie", 3, "Bitte buchstabieren Sie"),
]


def wiki_revision_year(host: str, revid: int, refresh: bool = False) -> int:
    """Year of a wiki revision, through the MediaWiki API."""
    params = {"action": "query", "prop": "revisions", "revids": str(revid), "rvprop": "timestamp", "format": "json",
              "formatversion": "2"}
    url = f"https://{host}/w/api.php?" + urllib.parse.urlencode(params)
    data = json.loads(download(url, RAW / "wikibooks" / f"revision-{revid}.json", refresh).read_text(encoding="utf-8"))
    return int(data["query"]["pages"][0]["revisions"][0]["timestamp"][:4])


def parse_wikibooks_dialogue(page: str, refresh: bool = False) -> dict:
    """The dialogue table of a Level I lesson and the translation from its exercise answers. Returns title, English
    title, turns [{speaker, de, speakerEn, en}], the visible page text (for the copy check) and the revision."""
    from lxml import html as lxml_html

    d = wiki_parse("en.wikibooks.org", page, RAW / "wikibooks" / (slug(page) + ".json"), refresh)
    root = lxml_html.fromstring(d["text"])
    table = next(tb for tb in root.iter("table")
                 if (tb.find(".//th") is not None and collapse(tb.find(".//th").text_content()).startswith("Dialogue:")))
    header = collapse(table.find(".//th").text_content())[len("Dialogue:"):]
    title_en, title_de = (x.strip() for x in header.split("—"))
    turns: list[dict] = []
    for tr in table.findall(".//tr")[1:]:
        th = tr.find("th")
        text = collapse(" ".join(td.text_content() for td in tr.findall("td")))
        if th is not None:
            turns.append({"speaker": collapse(th.text_content()), "de": text})
        elif turns:                                   # a speech that the table breaks over several rows
            turns[-1]["de"] = collapse(turns[-1]["de"] + " " + text)
    answer = next(li for li in root.iter("li") if collapse(li.text or "").startswith("Translation to English"))
    lines = [collapse(dd.text_content()) for dd in answer.iter("dd")]
    if len(lines) != len(turns):
        raise RuntimeError(f"{page}: {len(turns)} dialogue turns but {len(lines)} translated lines")
    for turn, line in zip(turns, lines):
        label, _, text = line.partition(": ")
        turn["speakerEn"], turn["en"] = label.strip(), text.strip()
    return {"title": title_de, "titleEn": title_en, "turns": turns, "page_text": collapse(root.text_content()),
            "revid": d["revid"], "year": wiki_revision_year("en.wikibooks.org", d["revid"], refresh),
            "url": "https://en.wikibooks.org/w/index.php?title=" + urllib.parse.quote(page.replace(" ", "_")) + f"&oldid={d['revid']}",
            "history": "https://en.wikibooks.org/w/index.php?title=" + urllib.parse.quote(page.replace(" ", "_")) + "&action=history"}


# ---------------------------------------------------------------- documents
HUNT_SOURCE = {"source": "Project Gutenberg #5314", "edition": "Household Tales by Brothers Grimm", "translator": "Margaret Hunt",
               "year": 1884, "url": "https://www.gutenberg.org/ebooks/5314", "license": "Public domain"}
GRIMM_1921_SOURCE = {"source": "Project Gutenberg #77905",
                     "edition": "Deutsche Märchen gesammelt durch die Brüder Grimm, ed. M. Thilo-Luyken, Ebenhausen: Wilhelm Langewiesche-Brandt, 1921",
                     "url": "https://www.gutenberg.org/ebooks/77905", "license": "Public domain"}
HEIDI_DE_SOURCE = {"source": "Project Gutenberg #7500", "edition": "Heidis Lehr- und Wanderjahre (Gutenberg Projekt-DE text, modernised spelling)",
                   "url": "https://www.gutenberg.org/ebooks/7500", "license": "Public domain"}
HEIDI_EN_SOURCE = {"source": "Project Gutenberg #1448", "edition": "Heidi", "translator": "Marian Edwardes (listed there as Marion Edwards)",
                   "year": 1910, "url": "https://www.gutenberg.org/ebooks/1448", "license": "Public domain"}

# Stage 3: the tales, in the order they were chosen (the files are then sorted shortest first). source "1921" = the
# Langewiesche-Brandt print on Project Gutenberg (modern spelling); "wikisource" = the 1857 text, used for the tales
# the 1921 print does not contain. The third item is the tale's number in Hunt's book (Project Gutenberg #5314).
GRIMM_SELECTION = [
    ("1921", "diebrautschau", "155"),
    ("1921", "diescholle", "172"),
    ("wikisource", "Der süße Brei (1857)", "103"),
    ("wikisource", "Die Sternthaler (1857)", "153"),
    ("1921", "dasaltemutterchen", "Legend 8"),
    ("1921", "desherrnunddesteufelsgetier", "148"),
    ("1921", "vomtodedeshuhnchens", "80"),
    ("wikisource", "Das Lumpengesindel (1857)", "10"),
    ("1921", "derwolfunddiesiebenjungengeisslein", "5"),
    ("1921", "rumpelstilzchen", "55"),
    ("1921", "diewichtelmanner", "39"),
    ("1921", "frauholle", "24"),
    ("1921", "diebremerstadtmusikanten", "27"),
    ("1921", "derfroschkonigoderdereiserneheinrich", "1"),
    ("1921", "hanselundgretel", "15"),
]
# Hunt's contents list gives a different German title for these three 1921 tales.
HUNT_KEY_OVERRIDES = {"vomtodedeshuhnchens": "80", "dasaltemutterchen": "Legend 8", "diedreivugelkens": "96"}


def stats_of(paragraphs: list[dict]) -> dict:
    """Counts from the finished paragraph objects: entries in "de" (sentences; with the coarse split an entry can hold a
    whole speech), paragraphs, and the share that has sentence-level English."""
    entries = sum(len(p["de"]) for p in paragraphs)
    aligned = sum(len(p["de"]) for p in paragraphs if "en" in p)
    words = sum(len(s.split()) for p in paragraphs for s in p["de"])
    words_aligned = sum(len(s.split()) for p in paragraphs if "en" in p for s in p["de"])
    return {"paragraphs": len(paragraphs), "paragraphsAligned": sum(1 for p in paragraphs if "en" in p), "sentences": entries,
            "sentencesAligned": aligned, "words": words, "wordsAligned": words_aligned,
            "sentenceAligned": round(aligned / max(1, entries), 3),
            "enParaNull": sum(1 for p in paragraphs if "enPara" in p and p["enPara"] is None)}


def count_true_sentences(paragraphs: list[dict]) -> int:
    return sum(len(split_sentences(s, "de")) for p in paragraphs for s in p["de"])


def pg_flat(ebook: int, refresh: bool = False) -> str:
    """The whole Project Gutenberg text with only the layout markup removed that the parsers remove too: compound
    hyphens at line ends joined, illustration markers, spaced-print tildes, italic underscores, footnote stars.
    Every output string must be found in it."""
    raw = pg_text(ebook, refresh)
    raw = re.sub(r"(?<=[^\W\d_])-\n[ \t]*(?=[a-zäöüß])", "-", raw)
    raw = re.sub(r"^[ \t]*\[Illustration[^\]]*\][ \t]*$", "", raw, flags=re.M)
    raw = raw.replace("~", "")
    raw = re.sub(r"(?<=[A-Za-z.,;:!?”’])\*(?=\s|$)", "", raw)
    raw = re.sub(r"_([^_]+)_", r"\1", raw)
    if "_" in raw:
        raise RuntimeError(f"ebook {ebook}: unpaired underscore left after removing italic markers")
    return collapse(raw)


def check_copy(doc: dict, flat_de: str, flat_en: str) -> list[tuple[str, str]]:
    """Strings of a finished text that are not plain substrings of their source text (should be none)."""
    bad = []
    for p in doc["paragraphs"]:
        for s in p["de"]:
            if s not in flat_de:
                bad.append(("de", s))
        for s in p.get("en", []):
            if s not in flat_en:
                bad.append(("en", s))
        if p.get("enPara") and p["enPara"] not in flat_en:
            bad.append(("enPara", p["enPara"]))
    return bad


def make_doc(doc_id: str, stage: int, title: str, title_en: str, author: str, year, historical: bool, de: dict, en: dict,
             paragraphs: list[dict], extra: dict | None = None) -> dict:
    doc = {"id": doc_id, "stage": stage, "title": title, "titleEn": title_en, "author": author, "year": year,
           "historicalSpelling": historical}
    doc.update(extra or {})
    doc.update({"de": de, "en": en, "paragraphs": paragraphs})
    return doc


@dataclass
class Result:
    """One finished text with everything the report needs."""
    doc: dict
    built: Built | None
    stats: dict
    flat_de: str
    flat_en: str
    merged_share: float | None = None     # share of German words that would be paired if sentences could be joined
    notes: list[str] = field(default_factory=list)


def merged_word_share(de_paras: list[str], en_paras: list[str], try_turn_split: bool, direct: bool = False) -> float:
    """Information only: the share of German words that would get sentence-level English if the programme were
    allowed to join sentences (MERGED_UNITS). Not used for the output."""
    global MERGED_UNITS
    old = MERGED_UNITS
    MERGED_UNITS = True
    try:
        if direct:
            c = statistics.median(len(e) / len(d) for d, e in zip(de_paras, en_paras))
            built = build_aligned(de_paras, en_paras, Model(c, 3.0), direct=True)
        else:
            built = align_text(de_paras, en_paras, try_turn_split)
    finally:
        MERGED_UNITS = old
    return stats_of(built.paragraphs)["wordsAligned"] / max(1, stats_of(built.paragraphs)["words"])


def build_wikibooks(refresh: bool, merged: bool) -> list[Result]:
    results = []
    for page, doc_id, n, lesson_title in WIKIBOOKS_LESSONS:
        w = parse_wikibooks_dialogue(page, refresh)
        de_paras = [t["de"] for t in w["turns"]]
        en_paras = [t["en"] for t in w["turns"]]
        c = statistics.median(len(e) / len(d) for d, e in zip(de_paras, en_paras))   # median: one abridged turn must not skew it
        built = build_aligned(de_paras, en_paras, Model(c, 3.0), direct=True)
        paragraphs = []
        for turn, p in zip(w["turns"], built.paragraphs):
            head = {"speaker": turn["speaker"]}
            if turn["speakerEn"] != turn["speaker"]:
                head["speakerEn"] = turn["speakerEn"]
            paragraphs.append({**head, **p})
        src = {"source": "Wikibooks, German course, Level I lesson " + str(n), "url": w["url"], "license": "CC BY-SA 4.0",
               "attribution": "Wikibooks contributors; page history " + w["history"]}
        de = dict(src)
        en = {**src, "translator": "Wikibooks contributors", "year": w["year"]}
        doc = make_doc(doc_id, 2, w["title"], w["titleEn"], "Wikibooks contributors", w["year"], False, de, en, paragraphs,
                       {"lesson": f"I.{n}", "lessonTitle": lesson_title})
        res = Result(doc, built, stats_of(paragraphs), w["page_text"], w["page_text"])
        if merged:
            res.merged_share = merged_word_share(de_paras, en_paras, False, direct=True)
        results.append(res)
    return results


def hunt_key_for(key: str, hunt: dict[str, dict]) -> str | None:
    if key in HUNT_KEY_OVERRIDES:
        return HUNT_KEY_OVERRIDES[key]
    for k, v in hunt.items():
        if plain_key(v["titleDe"]) == key:
            return k
    return None


def survey_grimm(hunt: dict, g1921: dict, refresh: bool) -> list[dict]:
    """Aligns every tale that exists in both the 1921 print and Hunt (and the three Wikisource tales) so that the report can
    show all candidates and why the chosen ones were chosen."""
    rows = []
    for key, tale in g1921.items():
        hk = hunt_key_for(key, hunt)
        if hk is None:
            rows.append({"title": tale["title"], "hunt": None, "source": "1921", "note": "no counterpart in Hunt's list"})
            continue
        built = align_text(tale["paragraphs"], hunt[hk]["paragraphs"], True)
        st = stats_of(built.paragraphs)
        rows.append({"title": tale["title"], "titleEn": hunt[hk]["title"], "hunt": hk, "source": "1921", "key": key,
                     "c": round(built.model.c, 2), **st, "turnsSplit": built.turns_split})
    for kind, page, hk in GRIMM_SELECTION:
        if kind != "wikisource":
            continue
        t = parse_wikisource_tale(page, refresh)
        built = align_text(t["paragraphs"], hunt[hk]["paragraphs"], False)
        st = stats_of(built.paragraphs)
        rows.append({"title": t["title"], "titleEn": hunt[hk]["title"], "hunt": hk, "source": "wikisource", "key": page,
                     "c": round(built.model.c, 2), **st, "turnsSplit": False})
    return rows


def build_grimm(hunt: dict, g1921: dict, refresh: bool, merged: bool) -> list[Result]:
    flat_1921 = pg_flat(77905, refresh)
    flat_hunt = pg_flat(5314, refresh)
    results = []
    for kind, key, hk in GRIMM_SELECTION:
        h = hunt[hk]
        if kind == "1921":
            tale = g1921[key]
            title, de_paras, historical, year = tale["title"], tale["paragraphs"], False, 1921
            de, flat_de, extra_notes = dict(GRIMM_1921_SOURCE), flat_1921, []
        else:
            t = parse_wikisource_tale(key, refresh)
            title, de_paras, historical, year = t["title"], t["paragraphs"], True, 1857
            de = {"source": "German Wikisource", "edition": "Kinder- und Haus-Märchen, 7th edition (Ausgabe letzter Hand), Göttingen: Dieterich, 1857",
                  "url": t["url"], "license": "Public domain (original text); Wikisource transcription under CC BY-SA 4.0"}
            flat_de, extra_notes = t["flat"], []
        built = align_text(de_paras, h["paragraphs"], kind == "1921")
        title_id = re.split(r"\s+oder\s+", title)[0]
        en = dict(HUNT_SOURCE)
        doc = make_doc("grimm-" + slug(title_id), 3, title, h["title"], "Brüder Grimm", year, historical, de, en, built.paragraphs,
                       {"khm": hk})
        res = Result(doc, built, stats_of(built.paragraphs), flat_de, flat_hunt, notes=extra_notes)
        if merged:
            res.merged_share = merged_word_share(de_paras, h["paragraphs"], kind == "1921")
        results.append(res)
    results.sort(key=lambda r: r.stats["words"])
    return results


def build_heidi(refresh: bool, merged: bool) -> list[Result]:
    de_chapters = parse_heidi_de(refresh)
    en_chapters = {c["n"]: c for c in parse_heidi_en(refresh)}
    flat_de, flat_en = pg_flat(7500, refresh), pg_flat(1448, refresh)
    results = []
    for ch in de_chapters:
        en_ch = en_chapters[ch["n"]]
        built = align_text(ch["paragraphs"], en_ch["paragraphs"], False)
        doc = make_doc(f"heidi-1-{ch['n']:02d}", 4, ch["title"], en_ch["title"], "Johanna Spyri", 1880, False,
                       dict(HEIDI_DE_SOURCE), dict(HEIDI_EN_SOURCE), built.paragraphs,
                       {"book": "Heidis Lehr- und Wanderjahre", "bookEn": "Heidi", "part": 1, "chapter": ch["n"]})
        res = Result(doc, built, stats_of(built.paragraphs), flat_de, flat_en)
        if merged:
            res.merged_share = merged_word_share(ch["paragraphs"], en_ch["paragraphs"], False)
        results.append(res)
    return results


# ---------------------------------------------------------------- report
# Written after reading pairs from the finished files (see the report section "Spot checks").
SPOT_CHECKS: list[str] = []


def sample_pairs(doc: dict, n: int) -> list[tuple[str, str]]:
    """n sentence pairs spread evenly over the paragraphs that have sentence-level English."""
    pairs = [(d, e) for p in doc["paragraphs"] if "en" in p for d, e in zip(p["de"], p["en"])]
    if not pairs:
        return []
    step = max(1, len(pairs) // n)
    return [pairs[min(len(pairs) - 1, i * step + step // 2)] for i in range(n)]


def pct(x: float) -> str:
    return f"{100 * x:.0f}%"


def write_report(results: list[Result], survey: list[dict], wb_notes: list[str], checks: dict[str, int], started: float) -> None:
    L: list[str] = []
    a = L.append
    a("# Reading sources report")
    a("")
    a(f"Built {time.strftime('%Y-%m-%d %H:%M')} by `tools/build_reading_sources.py` in {time.time() - started:.0f} s. "
      "Texts: `tools/sources/reading/<id>.json`, list: `tools/sources/reading/index.json`.")
    a("")
    a("Nothing in these files was written, translated or corrected by Claude or by the script. Every German and English string is "
      "copied from its source; only whitespace is normalised and layout marks that are not text are removed (see Method). "
      f"The copy check below found **{checks['bad']} strings** out of {checks['strings']} that are not plain substrings of their source.")
    a("")
    a("## Summary")
    a("")
    a("| id | stage | words | paragraphs | sentences | paragraphs with sentence pairs | sentences with pairs | would be with joined sentences (not used) |")
    a("|---|---|---|---|---|---|---|---|")
    for r in results:
        s = r.stats
        a(f"| {r.doc['id']} | {r.doc['stage']} | {s['words']} | {s['paragraphs']} | {s['sentences']} | "
          f"{pct(s['paragraphsAligned'] / max(1, s['paragraphs']))} | {pct(s['sentenceAligned'])} | "
          f"{pct(r.merged_share) if r.merged_share is not None else '-'} |")
    for stage, label in ((2, "Stage 2 Wikibooks"), (3, "Stage 3 Grimm"), (4, "Stage 4 Heidi part 1")):
        rs = [r for r in results if r.doc["stage"] == stage]
        if rs:
            tot = sum(r.stats["sentences"] for r in rs)
            al = sum(r.stats["sentencesAligned"] for r in rs)
            w = sum(r.stats["words"] for r in rs)
            wa = sum(r.stats["wordsAligned"] for r in rs)
            a("")
            a(f"- {label}: {len(rs)} texts, {w} German words, {tot} sentences; sentence pairs for {pct(al / max(1, tot))} of the sentences "
              f"and {pct(wa / max(1, w))} of the words.")
    a("")
    a("\"Sentences\" are the entries of the `de` lists. Where the fine split gives different sentence counts on the two sides, the same "
      "test is made with a coarse split that keeps each quotation in one piece; those entries are then speech-sized "
      "(counts per text are in the detail tables). The last column is for information: it shows how much more would be paired if the "
      "programme were also allowed to join two or three sentences on one side (`MERGED_UNITS = True`). The rule for the output "
      "is the specified one (equal counts and believable lengths, otherwise the whole English paragraph).")
    a("")

    # stage 2
    a("## Stage 2: Wikibooks German course")
    a("")
    a("Source: https://en.wikibooks.org/wiki/German (CC BY-SA 4.0). All 145 pages of the book were downloaded through the MediaWiki API and "
      "searched for German passages that have an English translation on the wiki itself.")
    a("")
    a("Used (3 dialogues, the only passages found with a complete English translation on the page; Level I lessons 1 to 3, the lessons the course marks as 100 % complete):")
    a("")
    for r in results:
        if r.doc["stage"] == 2:
            s = r.stats
            a(f"- `{r.doc['id']}`: {r.doc['title']} / {r.doc['titleEn']}, {s['paragraphs']} turns, {s['sentences']} sentences, pairs for {pct(s['sentenceAligned'])}. "
              f"Revision {r.doc['de']['url'].split('oldid=')[-1]} ({r.doc['year']}).")
    a("")
    a("Left out, and why:")
    a("")
    for n in wb_notes:
        a(f"- {n}")
    a("")
    a("The translation lines carry a speaker label that differs from the German one in one place (German *Auskunft*, English *Assistant*). Both labels "
      "are kept in the paragraph (`speaker`, `speakerEn`). The Wikibooks pages name recordings of the first two dialogues (files on Wikimedia Commons); "
      "their licence was not checked and they are not referenced in the files.")
    a("")

    # stage 3
    a("## Stage 3: Grimm tales")
    a("")
    a("German: Project Gutenberg #77905, *Deutsche Märchen gesammelt durch die Brüder Grimm*, ed. M. Thilo-Luyken, Ebenhausen: Langewiesche-Brandt, 1921 "
      "(modern spelling; the transcription note says the Fraktur original's spelling was kept). It is the only German Grimm text on gutenberg.org "
      "(the other two German Grimm items there, #20050 and #20051, are audio books). It holds 62 tales; its text follows the 1857 edition that Hunt translated "
      "(word counts of the two sides differ by 5 to 16 % in nearly all tales), but it prints speeches run together with \" -- \" where Hunt starts a new paragraph.")
    a("")
    a("For tales that the 1921 print does not contain (Der süße Brei, Die Sternthaler, Das Lumpengesindel) the German is the 1857 text from German Wikisource "
      "(historical spelling, `historicalSpelling: true`; the 1857 Sterntaler is titled *Die Sternthaler*). Wikisource says its transcriptions are CC BY-SA 4.0; "
      "the works themselves are public domain.")
    a("")
    a("English: Margaret Hunt, 1884, Project Gutenberg #5314. `titleEn` is the heading the translation prints above the tale (the contents list gives some tales a different English title).")
    a("")
    a("Choice of the 15 tales: the three that the brief named and that exist in a usable form (Der süße Brei, Die Sternthaler, Das Lumpengesindel), the classics that "
      "are short enough (Wolf und sieben Geißlein, Rumpelstilzchen, Wichtelmänner, Frau Holle, Bremer Stadtmusikanten, Froschkönig, Hänsel und Gretel), and five very short "
      "tales that pair well sentence by sentence. Files and the index are sorted by length, shortest first. Tales left out although the brief named them: "
      "**Rotkäppchen** (the 1921 print stops before the second part that Hunt translates, so its length ratio is 1.27 against about 1.0 elsewhere and many paragraphs "
      "would not match) and **Schneewittchen** (2,842 words; fine to add, it aligns like the others). The full list of candidates follows.")
    a("")
    a("| tale | Hunt no. | German | words | paragraphs | sentences | paragraphs with pairs | sentences with pairs | chosen |")
    a("|---|---|---|---|---|---|---|---|---|")
    chosen = {r.doc["id"] for r in results}
    chosen_titles = {r.doc["title"] for r in results if r.doc["stage"] == 3}
    for row in sorted((x for x in survey if x.get("hunt")), key=lambda x: x["words"]):
        a(f"| {row['title']} | {row['hunt']} | {'1857 Wikisource' if row['source'] == 'wikisource' else '1921'} | {row['words']} | {row['paragraphs']} | "
          f"{row['sentences']} | {pct(row['paragraphsAligned'] / max(1, row['paragraphs']))} | {pct(row['sentenceAligned'])} | "
          f"{'yes' if row['title'] in chosen_titles else ''} |")
    for row in survey:
        if not row.get("hunt"):
            a(f"| {row['title']} | - | 1921 | - | - | - | - | - | not matched ({row['note']}) |")
    a("")
    a("Low sentence-pair shares in Hunt's tales are the translation's doing: Hunt keeps the 1857 sentences but re-punctuates them, so the sentence counts differ. "
      "Those paragraphs carry the whole English paragraph(s) instead (`enPara`).")
    a("")

    # stage 4
    a("## Stage 4: Heidi, part 1")
    a("")
    a("German: Project Gutenberg #7500, *Heidis Lehr- und Wanderjahre* (Gutenberg Projekt-DE text). Its spelling is modernised (*dass*, *musst*, *Tal*), "
      "so `historicalSpelling` is false; the edition it was taken from is not stated (an alternative transcription is #7511). The year 1880 is that of the book's first publication. "
      "English: Marian Edwardes, Project Gutenberg #1448 (the file lists her as \"Marion Edwards\"; the file gives no year, secondary sources give 1910), unabridged and in the same 14 chapters. "
      "The other public-domain translations on Project Gutenberg were not used: #20781 (Stork, 1915) is a free retelling about 40 % shorter than the German, #46409 (Abbott) omits text and "
      "renumbers the chapters.")
    a("")
    a("Part 2 (German #7512, 10 chapters; Edwardes chapters XV to XXIII, 9 chapters) was not built: the brief asked for part 1 and the chapter divisions of the two books differ.")
    a("")
    a("| id | German title | English title | words | paragraphs | sentences | paragraphs with pairs | sentences with pairs |")
    a("|---|---|---|---|---|---|---|---|")
    for r in results:
        if r.doc["stage"] == 4:
            s = r.stats
            a(f"| {r.doc['id']} | {r.doc['title']} | {r.doc['titleEn']} | {s['words']} | {s['paragraphs']} | {s['sentences']} | "
              f"{pct(s['paragraphsAligned'] / max(1, s['paragraphs']))} | {pct(s['sentenceAligned'])} |")
    a("")

    # method
    a("## Method")
    a("")
    a("1. Paragraphs are cut out of the Project Gutenberg texts at blank lines (lines of a paragraph are joined; a hyphen at a line end is kept, because Gutenberg proofreaders rejoin ordinary line-end hyphenation and what remains is a real compound hyphen).")
    a("2. Paragraphs are aligned with a length-based dynamic programme in the style of Gale & Church (1993). Allowed groups: 1-1, 1-2, 2-1, 1-0, 0-1 as specified, "
      "plus 2-2 and 1-k / k-1 up to k = 8. The wider groups are needed because the 1921 print puts several short speeches into one paragraph where Hunt starts a new paragraph for each; "
      "without them the English paragraphs drift against the German ones and the whole-paragraph fallback shows the wrong English (tested: 29 of 98 fallback paragraphs wrong against 10 of 113). "
      "The English/German length ratio c is measured per text; the variance is measured per text from the pairs of a first pass (generous start value 6.8, robust estimate between 1 and 6.8). "
      "Quotation marks and question marks that disagree add to a group's cost, because paragraph lengths alone are ambiguous in dialogue.")
    a("3. Each group is cut into sentences (quotation marks and abbreviations handled; the 1921 print's speaker-change dash \" -- \" ends a sentence and is not kept). "
      "**Sentence pairs are stored only when both sides have the same number of sentences and every pair has a believable length** "
      f"(z-score against the text's own ratio at most {Z_MAX}, at most {int(SLACK * 100)} % of the pairs further than {SOFT_Z}, at most {int(SLACK * 100)} % that turn a statement into a question or change the number of quotation marks, and the whole group within 0.65 to 1.55 of the expected length). "
      "Otherwise the German sentences are stored with the whole English paragraph(s) of the group (`enPara`); a German paragraph with no English counterpart gets `enPara: null`. No pairing is forced.")
    a("4. If the fine split gives different counts, the same test is made on a coarse split that keeps each quotation in one piece (a speech of three sentences and the words that introduce it become one entry). "
      "A group that fails is also tried joined with up to three neighbouring groups, because paragraph breaks sit in different places in the two books.")
    a("5. For the 1921 print two readings of the speech turns are tried: paragraphs as printed, and each speech as its own paragraph (the dash is dropped). The reading with more sentence pairs is kept (the tales where the split won are marked in the detail table).")
    a("6. The copy check: every `de`, `en` and `enPara` string is looked up in the whole source text (Gutenberg file, or the visible text of the wiki page) after removing only the layout marks. "
      f"Result: {checks['strings']} strings checked, {checks['bad']} not found.")
    a("")
    a("What is removed from the sources (all of it layout, none of it words): `[Illustration]` lines; the `~` marks of spaced print in the 1921 print; the `_` marks around italic words in the German Heidi; "
      "footnote stars in Hunt (the notes themselves are not in the file) and the `* * * * * * *` divider lines; page numbers in the Wikisource text; wiki tags. "
      "Whitespace, including line breaks inside paragraphs and no-break spaces, becomes single spaces. "
      "Spelling, punctuation, capitals and quotation marks are untouched (the 1921 print uses » « , Heidi uses straight quotes, Hunt uses curly quotes).")
    a("")

    # detail
    a("## Detail per text")
    a("")
    a("| id | c (EN/DE length) | variance | groups (German-English paragraphs) | joined with a neighbour | entries with the coarse split | German paragraphs without English (null) | English paragraphs dropped | turns split |")
    a("|---|---|---|---|---|---|---|---|---|")
    for r in results:
        b = r.built
        if b is None:
            continue
        kinds = ", ".join(f"{k}: {v}" for k, v in sorted(b.group_kinds.items(), key=lambda kv: (-kv[1], kv[0]))[:6])
        a(f"| {r.doc['id']} | {b.model.c:.2f} | {b.model.s2:.2f} | {kinds} | {b.repaired} | {b.coarse_units} | {r.stats['enParaNull']} | {b.unmatched_en} | {'yes' if b.turns_split else ''} |")
    a("")

    # spot checks
    a("## Spot checks")
    a("")
    if SPOT_CHECKS:
        for line in SPOT_CHECKS:
            a(f"- {line}")
        a("")
    a("Pairs below are taken from the finished files at even spacing (the same ones every run), so that anyone can read them.")
    a("")
    shown = [r for r in results if r.doc["id"] in ("wikibooks-wie-heisst-du-1", "grimm-der-wolf-und-die-sieben-jungen-geisslein",
                                                   "grimm-haensel-und-gretel", "heidi-1-03", "heidi-1-13")]
    for r in shown:
        a(f"**{r.doc['id']}** ({r.doc['title']} / {r.doc['titleEn']})")
        a("")
        for d, e in sample_pairs(r.doc, 4 if r.doc["stage"] != 2 else 6):
            a(f"- DE: {d}")
            a(f"  EN: {e}")
        a("")

    # problems
    a("## Problems and notes")
    a("")
    for line in PROBLEM_NOTES:
        a(f"- {line}")
    for r in results:
        for n in r.notes:
            a(f"- {r.doc['id']}: {n}")
    a("")
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(L), encoding="utf-8")


PROBLEM_NOTES = [
    "Wikibooks stage 2 is thin: 3 dialogues, 16 turns in all, about 140 German words. The rest of the course either has no translation of its dialogues or gives only word lists.",
    "Licence: Project Gutenberg texts are marked public domain (United States). The 1921 print was edited by M. Thilo-Luyken; the Grimms' text is public domain, "
    "and Project Gutenberg cleared the edition, but the editor's rights under German law were not checked. The Heidi German text is a modernised-spelling transcription; "
    "Project Gutenberg treats it as public domain. Wikibooks and Wikisource transcriptions are CC BY-SA 4.0 and need attribution (the files carry the page links and revision numbers).",
    "Spelling: stage 3 uses the 1921 print (modern spelling, but still the pre-1996 forms: *daß*, *Geißlein*, *zum zweitenmal*) for 12 tales and the 1857 text with historical spelling (*gieng*, *Thaler*, *Noth*) for 3. Heidi is in post-1996 spelling.",
    "Where the sentence counts do not match, the fallback shows the English paragraph(s) of the group. Where the two books break paragraphs at different places, that English can begin or end a sentence or two off.",
    "The Wikisource tales have their quotation marks in the 1857 style (a comma inside the closing mark, no colon before a speech); the sentence splitter handles it, but the pairs there are fewer because Hunt re-punctuated.",
    "Heidi: Edwardes' English is freer than Hunt's (clauses added or dropped), so more paragraphs fall back to `enPara` than in the Grimm tales with good sentence agreement.",
    "Hymn and verse passages (the Heidi hymn in chapter 14, the duck rhyme in Hänsel und Gretel) rarely have equal line counts and fall back to the English paragraph.",
    "Machine tools were used for splitting and aligning only; no pair was written or corrected by hand.",
]


# ---------------------------------------------------------------- main
WIKIBOOKS_NOTES = [
    "Level I lessons 4 to 12 (Freizeit, Geburtstag, Essen, Kleidung, Volk und Familie, Schule, Das Fest, Privileg und Verantwortung, Wetter): the dialogues have vocabulary tables but no translation on the page (Freizeit, Essen, Kleidung, Volk und Familie, Das Fest); "
    "Wetter has English lines inside the table markup, but they are attached to table-row attributes and are not displayed on the page (and contain typing slips), so they are not a translation that the page gives; "
    "Schule has a line-by-line breakdown with word-for-word glosses and commentary, not a translation of the dialogue.",
    "Lessons 1 to 15 of the older course (`German/Lesson N`, `German/Level III/...`): German dialogues and reading pieces with vocabulary lists only; the exercises translate English sentences into German and the answers are German.",
    "Appendices (Phrasebook, Vocabulary, Exercises), grammar pages: phrases and example sentences with glosses, not reading passages.",
    "`German/Q&A`: a reader's question with a copy of lesson 2's translation (a duplicate).",
]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--refresh", action="store_true", help="download the sources again")
    ap.add_argument("--no-merged-stats", action="store_true", help="skip the information-only column (about a minute)")
    args = ap.parse_args()
    started = time.time()
    merged = not args.no_merged_stats
    OUT.mkdir(parents=True, exist_ok=True)

    log("Stage 2: Wikibooks")
    results = build_wikibooks(args.refresh, merged)
    log("Stage 3: Grimm (reading Hunt and the 1921 print, surveying all tales)")
    hunt = parse_hunt(args.refresh)
    g1921 = parse_grimm_1921(args.refresh)
    survey = survey_grimm(hunt, g1921, args.refresh)
    log("Stage 3: building the chosen tales")
    results += build_grimm(hunt, g1921, args.refresh, merged)
    log("Stage 4: Heidi")
    results += build_heidi(args.refresh, merged)

    log("Checking that every string is copied from its source")
    strings = bad = 0
    for r in results:
        strings += sum(len(p["de"]) + len(p.get("en", [])) + (1 if p.get("enPara") else 0) for p in r.doc["paragraphs"])
        for kind, s in check_copy(r.doc, r.flat_de, r.flat_en):
            bad += 1
            log(f"NOT FOUND in source ({r.doc['id']}, {kind}): {s[:100]}")
    checks = {"strings": strings, "bad": bad}
    if bad:
        raise SystemExit("copy check failed; nothing written")

    for old in OUT.glob("*.json"):
        old.unlink()
    index = []
    for r in results:
        (OUT / f"{r.doc['id']}.json").write_text(json.dumps(r.doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        s = r.stats
        index.append({"id": r.doc["id"], "stage": r.doc["stage"], "title": r.doc["title"], "titleEn": r.doc["titleEn"],
                      "author": r.doc["author"], "year": r.doc["year"], "historicalSpelling": r.doc["historicalSpelling"],
                      "paragraphs": s["paragraphs"], "sentences": s["sentences"], "sentenceAligned": s["sentenceAligned"],
                      "words": s["words"]})
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_report(results, survey, WIKIBOOKS_NOTES, checks, started)
    log(f"Wrote {len(results)} texts to {OUT} and the report to {REPORT}")
    for stage in (2, 3, 4):
        rs = [r for r in results if r.doc["stage"] == stage]
        tot = sum(r.stats["sentences"] for r in rs)
        al = sum(r.stats["sentencesAligned"] for r in rs)
        log(f"stage {stage}: {len(rs)} texts, {tot} sentences, {al / max(1, tot):.0%} with sentence pairs")


if __name__ == "__main__":
    main()
