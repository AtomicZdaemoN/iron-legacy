# Iron Legacy 🏋️

A personal workout tracker for strength & hypertrophy training.

**[Live App →](https://atomiczdaemon.github.io/iron-legacy/)**

---

## Features

- 📱 **PWA** — Install on mobile, works offline
- 💪 **Smart Progression** — 8 progression schemes with suggestions
- ⏱️ **Rest Timer** — Auto-start with ±15s adjustments
- 📊 **Dashboard** — Track volume and strength over time
- 📋 **History** — View and edit past workouts
- 📝 **Notes** — Add notes to sets, exercises, and sessions
- 🌙 **Dark/Light Mode** — Switch themes
- 💾 **Export/Import** — JSON backup for data portability

---

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — Fast dev server and builds
- **Dexie.js** — IndexedDB wrapper for local-first data
- **Recharts** — Dashboard visualizations
- **vite-plugin-pwa** — Service worker and manifest

---

## Getting Started

```bash
# Clone
git clone https://github.com/AtomicZdaemoN/iron-legacy.git
cd iron-legacy

# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Deploy to GitHub Pages
npm run deploy
```

---

## Project Structure

```
src/
├── db/           # Database schema, migrations, backup
├── engine/       # Progression algorithms
├── pages/        # Route pages (Home, Workout, History, etc.)
└── App.tsx       # Router and layout
```

---

## Progression Schemes

1. **Triple Progression** — Top set + backoff sets
2. **Double Progression** — Add reps until max, then add weight
3. **Dynamic Double** — Flexible rep ranges
4. **Drop Sets** — Weight decreases per set
5. **AMRAP** — As many reps as possible
6. **Rest-Pause** — One extended set with pauses
7. **Cluster Sets** — Intra-set rest
8. **Pyramid** — Weight increases per set

---

## License

MIT — Built by [Diego Leyva](https://github.com/AtomicZdaemoN)
