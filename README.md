# TOPC — Trading Outcome Probability Calculator

A lightweight, static web app to analyze trading performance and explore probabilities using interactive charts. Includes a marketing home page and a data‑driven dashboard.

## Features
- Landing page (`index.html`) styled with Tailwind CSS CDN
- Dashboard (`dashboard.html`) with:
  - Trade Journal (import CSV, tag filters)
  - Risk Calculators (position size, risk of ruin)
  - Equity curve and analytics using Chart.js
  - Day-of-week win/loss breakdown
  - Optional AI Coach (Google Gemini API) for insights

## Project Structure
```
.
├─ index.html          # Landing page
├─ dashboard.html      # Main dashboard app
├─ style.css           # Custom styles
├─ js/
│  └─ dashboard.js     # App logic, charts, AI integration
└─ css/                # (reserved, currently empty)
```

## Getting Started
1. Clone the repo:
   - HTTPS: `git clone https://github.com/Emilian-Ene/topc.git`
2. Open `index.html` (home) or `dashboard.html` (app) directly in a browser.
   - For best results, use a local server (e.g., VS Code Live Server).

No build step is required.

## AI Coach (optional)
The dashboard can generate an AI analysis using Google Gemini.
- Create an API key in Google AI Studio.
- In the dashboard UI, paste your key into the "Google AI API Key" field and start the analysis.

## Development Notes
- Tailwind CSS is loaded via CDN for simplicity.
- Charts are rendered with Chart.js.
- Data is stored in `localStorage` (no backend required).

## License
MIT — see `LICENSE` for details.
