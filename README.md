# Scheiße

A personal iPhone study app for learning German, used alongside Language Transfer, DW Nicos Weg and German-dubbed TV. Single user, free to run, no gamification.

- What it does: [docs/product-spec.md](docs/product-spec.md)
- How it is built and shipped: [docs/build-plan.md](docs/build-plan.md)
- How it looks: [design/](design/)

Current stage: Phase 1 (lectures, review, content, Today, backup) built and tested; publishing at https://hitarth101.github.io/scheisse/ after the owner's OK. Content tools and reports: [tools/](tools/).

Lecture audio and transcript: Language Transfer, *Complete German* (languagetransfer.org). Sentences: Tatoeba (CC BY 2.0 FR; recordings CC BY 4.0 / CC BY-NC 4.0 by their named speakers). Word data: Wiktionary via kaikki.org (CC BY-SA 4.0); word recordings from Wikimedia Commons. Word selection: Goethe-Institut A1–B1 word lists. Order of new words: DeReWo frequency list, IDS Mannheim (CC BY-NC 3.0). Icon letterform: Inter (SIL Open Font License).

Run the app on the PC: `npm --prefix app install`, then `npm --prefix app run dev`. All checks: `npm --prefix app run check`.
