# Scheiße

A personal iPhone study app for learning German, used alongside Language Transfer, DW Nicos Weg and German-dubbed TV. Single user, free to run, no gamification.

- What it does: [docs/product-spec.md](docs/product-spec.md)
- How it is built and shipped: [docs/build-plan.md](docs/build-plan.md)
- How it looks: [design/](design/)

Current stage: tabs instead of sessions (Flashcards, Lectures, Reading, Grammar, Status) and Phases 2–4 built and tested; published at https://hitarth101.github.io/scheisse/. Content tools and reports: [tools/](tools/).

Lecture audio and transcript: Language Transfer, *Complete German* (languagetransfer.org). Sentences: Tatoeba (CC BY 2.0 FR; recordings CC BY 4.0 / CC BY-NC 4.0 by their named speakers). Word data and reference tables: Wiktionary via kaikki.org (CC BY-SA 4.0); word recordings from Wikimedia Commons. Prepositions table and reading dialogues: Wikibooks German course (CC BY-SA). Reading texts: Project Gutenberg and Wikisource (public domain); recordings, where linked: LibriVox (public domain). Word selection: Goethe-Institut A1–B1 word lists. Order of new words: DeReWo frequency list, IDS Mannheim (CC BY-NC 3.0). Course order and links: DW Nicos Weg; linked explanations and exercises: Grimm Grammar (UT Austin), Schubert-Verlag. Icon letterform: Inter (SIL Open Font License).

Run the app on the PC: `npm --prefix app install`, then `npm --prefix app run dev`. All checks: `npm --prefix app run check`.
