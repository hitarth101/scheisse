# tools

PC-side scripts that prepare the app's content. Raw downloads live in `tools/raw/` (not uploaded; listed in `.gitignore`). Outputs go to `app/public/data/` and are published with the app.

| Script | What it does | Run time |
|---|---|---|
| `encode-lectures.sh` | Re-encodes the 50 Language Transfer MP3s to mono 64 kbps into `app/public/audio/` (Git Bash; needs FFmpeg) | ~3 min |
| `build_content.py` | Goethe A1–B1 word lists + Wiktionary + DeReWo + Tatoeba → `words.json`, `word-forms.json`, `sentences.json` (with fill-in-the-blank positions and each word's Goethe word), `engineering.json` (engineering deck), `manifest.json`; report in `tools/out/content-report.md` | ~1 min |
| `fetch_nicos_weg.py` | DW Nicos Weg A1–B1 lesson list and grammar topics, plus Grimm Grammar and Schubert-Verlag links per topic → `tools/sources/nicos-weg.json`, `tools/sources/grammar-links.json`; report in `tools/out/nicos-weg-report.md` | minutes (network) |
| `build_grammar.py` | Nicos Weg data + Wiktionary tables + the Wikibooks prepositions table → `grammar.json` | ~1 min |
| `build_reading_sources.py` | Wikibooks dialogues, Grimm tales and Heidi (German + public-domain English), aligned → `tools/sources/reading/`; report in `tools/out/reading-report.md` | minutes (network) |
| `fetch_librivox.py` | LibriVox German readings of the Grimm tales and Heidi (links only) → `tools/sources/librivox.json`; report in `tools/out/librivox-report.md` | minutes (network) |
| `build_reading.py` | Reading texts + Wiktionary word popups + LibriVox links → `reading/index.json`, `reading/<id>.json` | ~1 min |
| `extract_transcript.py` | Volunteer Language Transfer transcript → `lt-pairs.json` (English → German pairs per track, for the tick screen); report in `tools/out/transcript-report.md` | ~20 s |

Run from the repo root, for example `py tools/build_content.py`. Python 3 with `pymupdf` is needed.

## Raw files (download once into `tools/raw/`)

| File | From |
|---|---|
| `goethe-a1.pdf`, `goethe-a2.pdf`, `goethe-b1.pdf` | goethe.de word lists (A1_SD1_Wortliste_02, Goethe-Zertifikat_A2_Wortliste, Goethe-Zertifikat_B1_Wortliste) |
| `kaikki-German.jsonl.gz` | kaikki.org/dictionary/German/ |
| `deu_sentences_detailed.tsv.bz2`, `eng_sentences.tsv.bz2`, `deu-eng_links.tsv.bz2`, `deu_sentences_with_audio.tsv.bz2`, `user_languages.csv` (from `user_languages.tar.bz2`) | downloads.tatoeba.org/exports/ |
| `derewo/derewo-v-ww-bll-320000g-2012-12-31-1.0.txt` | ids-mannheim.de DeReWo (CC BY-NC 3.0; the list itself is never published, only each word's resulting position) |
| `lt-transcript-2020.pdf` | languagetransfer.org/s/Complete-German-Transcript.pdf |

## Rules these scripts follow

- No German is written by the scripts or by Claude. Every German string is copied from a source; items without English from a real source are skipped and listed in the reports.
- Only native-speaker Tatoeba sentences (self-reported level 5) are used, and only recordings under CC BY 4.0 or CC BY-NC 4.0.
- Austrian and Swiss variants marked in the Goethe lists are left out.
