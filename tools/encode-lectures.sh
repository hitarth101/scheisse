#!/usr/bin/env bash
# Re-encodes the 50 Language Transfer lectures to mono 64 kbps MP3 for publishing.
# Originals stay in "Language Transfer Lectures/" (not uploaded). Run from the repo root in Git Bash.
set -euo pipefail
FF="${FFMPEG:-ffmpeg}"
SRC="Language Transfer Lectures"
OUT="app/public/audio"
mkdir -p "$OUT"
for n in $(seq -w 1 50); do
  in="$SRC/$n.mp3"; out="$OUT/$n.mp3"
  [ -f "$out" ] && continue
  "$FF" -hide_banner -loglevel error -y -i "$in" -vn -ac 1 -ar 44100 -codec:a libmp3lame -b:a 64k \
    -map_metadata -1 -id3v2_version 3 \
    -metadata title="Lecture $n" -metadata artist="Language Transfer" \
    -metadata album="Complete German" -metadata track="$n" -metadata comment="www.languagetransfer.org" \
    "$out"
  echo "done $n"
done
