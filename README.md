# Simple Kakuro

A mobile-first Kakuro game built with vanilla TypeScript. Play in the browser — optimized for iPad Mini — with pencil notes, auto-pruned candidates, a combination cheatsheet, mistake counting, and three difficulty levels.

**Play online:** [https://kimmania.github.io/simple-kakuro/](https://kimmania.github.io/simple-kakuro/)

## Features

- **Difficulty levels:** Easy, Medium, Hard
- **Notes mode:** Tap pencil marks for candidate digits
- **Auto-prune notes:** Impossible candidates are removed when values are placed in a run
- **Combination cheatsheet:** Reference panel for valid digit sums by run length
- **Undo:** Revert the last digit, note, or bulk note change
- **Reset:** Clear your entries and start the current puzzle over
- **Mistake counter:** Tracks wrong entries against the solution
- **Resume game:** Progress saved to local storage
- **600 puzzles:** 200 per difficulty, crossword-style layouts with internal black cells
- **Installable PWA:** Add to Home Screen on iPad or iPhone for a full-screen app experience

## Development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173/simple-kakuro/`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run generate-puzzles` | Regenerate puzzle JSON banks |
| `npm run validate-puzzles` | Validate puzzle banks |

## GitHub Pages

Pushes to `main` deploy automatically via GitHub Actions.

1. Enable **GitHub Pages** → Source: **GitHub Actions**
2. Live site: [https://kimmania.github.io/simple-kakuro/](https://kimmania.github.io/simple-kakuro/)

## Install on iPad

1. Open the site in Safari
2. Tap the Share button
3. Choose **Add to Home Screen**

## License

MIT
