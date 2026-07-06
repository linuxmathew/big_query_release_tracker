# BigQuery Release Notes Hub 🚀

A premium web application built with **Python Flask** and plain **vanilla HTML, CSS, and JavaScript** that fetches real-time BigQuery release notes directly from Google Cloud Platform, segments them into individual cards, and enables interactive sharing to Twitter/X.

---

## ✨ Features

- **Real-Time Feed Integration**: Fetches and parses the official BigQuery Atom feed XML directly from GCP.
- **Smart DOM Segmenter**: Dynamically splits combined daily notes into individual, beautifully categorized cards (Features, Changes, Deprecations, Fixes) with clean visual styling.
- **Instant Search & Filter**: Real-time client-side search engine and quick categorizations to find exactly what you're looking for.
- **Twitter/X Post Composer & Simulator**:
  - Click any card to launch an in-app interactive composer.
  - Automatically formats the update, date, and link into an optimized tweet draft.
  - **Live Feed Preview**: Simulates a native Twitter/X feed post preview with syntax-highlighted hashtags and URLs.
  - **Interactive Character Counter**: Features a circular progress-ring tracking character limits (up to 280) with warnings.
- **Polished Visuals & Micro-animations**: Premium glassmorphism dark aesthetic, animated skeleton loading screens, and rich button micro-interactions.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Flask
- **Frontend**: Plain Vanilla HTML5, CSS3, JavaScript (ES6)
- **Icons**: FontAwesome 6
- **Typography**: Outfit & Inter (Google Fonts)

---

## 📦 Getting Started

### Prerequisites

- Python 3.10 or higher

### Installation & Run

1. Navigate to the project directory:
   ```bash
   cd bigquery_release_notes_viewer
   ```

2. Activate the pre-configured virtual environment:
   ```bash
   source .venv/bin/activate
   ```

3. Run the Flask server:
   ```bash
   python app.py
   ```

4. Open your browser and navigate to:
   ```text
   http://localhost:5001
   ```

---

## 📂 Project Structure

```text
bigquery_release_notes_viewer/
├── .venv/                  # Python virtual environment
├── templates/
│   └── index.html          # Core responsive UI
├── static/
│   ├── style.css           # Premium dark theme and responsive stylesheets
│   └── script.js           # Client-side feed processor and composer logic
├── app.py                  # Flask web server and backend parser
└── README.md               # Documentation
```
