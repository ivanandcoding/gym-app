# Gym

Personal workout log. Runs in the browser, installs to the iPhone home screen as a web app, and keeps all data on the device.

## What it does

- **Train**: workout templates (Push, Pull, Legs to start with). Start one, log weight × reps per set, tap the tick and the rest timer starts with the rest time set for that exercise.
- **Notes and machine settings**: every exercise has a pinned note and machine settings (seat height, cable height, and so on) that show up every session.
- **History**: every finished workout with sets, volume and PRs.
- **Progress**: estimated 1RM, weight, volume or reps per exercise over time, plus all-time bests.
- **Body**: your height and bodyweight, a strength score per movement pattern and per body part (Wilks-based, public formulas), targets for the next level, and weekly sets per body part.
- **Settings**: kg or lb, bar weight for plate math, rest defaults, keep-screen-on, backup export and import.

## Run it

```bash
npm install
npm run dev
```

Open the "Network" URL that Vite prints on your phone (same Wi-Fi) to try it there.

## Build it

```bash
npm run build
```

The `dist/` folder is a static site with a service worker. Put it on any static host (GitHub Pages, Netlify, Cloudflare Pages), open it in Safari on the iPhone, then Share → Add to Home Screen.

## Notes

- Weights are stored in kilograms. Belt exercises store the added weight; bodyweight is included in the calculations.
- Estimated 1RM: Brzycki up to 10 reps, Epley above.
- iOS pauses web apps when the screen locks, so the rest timer keeps the screen awake while a workout is open (Settings).
