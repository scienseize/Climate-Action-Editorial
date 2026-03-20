# Climate Ledger

A 3-page static website about UN Sustainable Development Goal 13 (Climate Action), featuring a personal carbon footprint calculator for daily commutes.

## Pages

| File | Description |
|---|---|
| `index.html` | Landing page — hero, climate stats, tipping points, SDG 13 targets, CTA |
| `calculator.html` | Carbon footprint form with live assessment panel |
| `results.html` | Results dashboard with bar chart and personalized recommendations |

## Running the Site

Open any HTML file directly in a browser:

```bash
open index.html
open calculator.html
open results.html
```

Or use a static file server for live reload:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## How It Works

1. User fills out the calculator form (transport mode + daily commute distance)
2. On submit, emission data is written to `localStorage` under the key `climateCalcResult`
3. User is redirected to `results.html`, which reads from `localStorage` and renders the dashboard
4. The Recalculate button returns to `calculator.html` with the form pre-filled

### Emission Factors (kg CO₂/km, round trip)

| Mode | Factor |
|---|---|
| Car | 0.21 |
| Bus | 0.089 |
| Train | 0.041 |
| Bicycle / Walking | 0 |

### Danger Thresholds (daily kg CO₂)

| Level | Range |
|---|---|
| SAFE | ≤ 8 kg/day |
| MODERATE | ≤ 15 kg/day |
| HIGH | ≤ 25 kg/day |
| CRITICAL | > 25 kg/day |

SDG daily target: **7.83 kg/day** (1,800 kg/yr ÷ 230 commute days)

## Tech Stack

- **HTML/CSS/JS** — no framework, no build step, no package manager
- **Tailwind CSS** via CDN (JIT, inline config in each `<head>`)
- **localStorage** for data persistence between pages

## File Structure

```
index.html          Landing page
calculator.html     Calculator form
results.html        Results dashboard
css/styles.css      Custom styles (transitions, hero overlay, danger-level theming)
js/calculator.js    Emission logic, live panel, form validation, localStorage write
js/results.js       localStorage read, bar chart animation, recommendation engine
assets/             Images (commute.jpg, favicon.ico)
```

## Author

Bill Alcantara
