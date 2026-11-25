# Folio — Personal Reading Tracker PWA

A cozy, dark-mode personal reading tracker built with **Vue 3**, **TypeScript**, **Pinia**, **Vite PWA**, and **Firebase** (Authentication + Cloud Firestore + Hosting), designed to feel like a native standalone app on iPhone.

## Features
- **Today at a Glance**: Currently reading hero card with circular progress ring, *Also on the go* shelf, 7-day reading streak tracker, daily featured quote, and upcoming releases preview.
- **Upcoming Releases**: Track anticipated Wishlist/TBR releases with countdown badges and release dates.
- **Your Library + Cozy Bookshelf**: Toggle between the 3-column cover grid (with progress bars, star ratings, checkmarks, and DNF badges), a customizable wooden **Cozy Bookshelf** view (*Walnut*, *Warm Oak*, *Espresso*, *Slate*), and the **Series Tracker**.
- **Series Tracker**: Track multi-book sagas with average star ratings, read counts, editable series totals, wishlist slots, and quick add-to-series.
- **Book Details**: Status & ownership pills, interactive half-star ratings + optional spice/heat chili ratings, editable blurbs, progress ring & quick updater, Moods, Tropes & tags, Genres, personal reviews, and per-book quotes.
- **Reading Timer**: Distraction-free focus timer that survives iPhone tab switches and logs pages read + reading pace straight to your calendar and stats.
- **Reading Stats**: Yearly book goal & page totals, Day/Week/Month bar chart, average days to finish, reading pace (`pages/hr`), and Genre & Mood donut charts.
- **Reading Calendar & Streaks**: Glowing streak counter, monthly totals, editable daily/yearly goals, monthly book-cover calendar tiles, tap-to-log any date, and shareable recaps.
- **Saved Quotes**: Featured *Today's quote* with *Surprise me* shuffle, search, *All / Favorites / By book* filters, and one-tap sharing.
- **Personalization & Backups**: 4 accent themes (*Rose Gold*, *Sage*, *Lavender*, *Amber*), live Google Books & Open Library search auto-fill, Goodreads CSV import, and CSV / full JSON backup export.

## Local Development
```bash
npm install
npm run dev
```

## Build & Deploy
```bash
npm run build
npx -y firebase-tools@latest deploy
```

## Installing on iPhone
Open the deployed Firebase Hosting URL in **Safari** on your iPhone, tap the **Share** icon, and choose **Add to Home Screen**.
