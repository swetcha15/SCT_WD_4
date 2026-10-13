# Daynote — Minimal Lavender Productivity Web App

A quiet, lightweight, and distraction-free productivity app designed with a soft lavender aesthetic, generous whitespace, and a calm visual hierarchy.

Built as part of **SkillCraft Task 04**, Daynote combines daily task management, an interactive monthly calendar, and a clean notes editor into a single-column, mobile-first experience.

---

## ✨ Design Philosophy

- **Vibrant Lavender & Mood**: Ambient lavender-tinted background with soft radial depth, crisp elevated cards, and dark charcoal typography.
- **Color Highlights**: Left-border priority indicators on tasks (Coral-Rose for High, Lavender for Medium, Slate for Low) and a prominent highlight tile for Today in the Calendar.
- **Dark Mode**: Full midnight-purple dark theme with glowing lavender accents, toggled seamlessly via the header button and persisted in `localStorage`.
- **Whitespace & Simplicity**: Zero clutter, no dashboards, no statistics widgets, and no distracting neon colors.
- **Modern Clean Typography**: Set in Google's *Plus Jakarta Sans* with clean geometric proportions and comfortable line heights.

---

## 🚀 Key Features

### 1. Tasks
- **Compact Quick Add**: Add tasks with title, due date, and priority selector (Low, Medium, High).
- **Single-Column List**: Clean rows with custom rounded checkboxes, priority badges, and formatted due dates (e.g. *Today*, *Tomorrow*, *Overdue · Oct 11*).
- **Filter Tabs**: Filter tasks quickly by `All`, `Today`, `Upcoming`, and `Completed`.
- **Edit & Delete**: In-place task editing via a minimal modal and instant deletion.
- **Clear Completed**: One-click action to clean up finished items.

### 2. Monthly Calendar
- **Interactive Grid**: Monthly calendar with previous/next month navigation and a quick "Today" shortcut.
- **Real Task Indicators**: Small lavender dots appear dynamically beneath dates that have scheduled tasks.
- **Current Day Highlight**: Subtle lavender background highlight for today.
- **Day Inspector & Quick Add**: Click any date to view scheduled tasks underneath or quickly add a new task directly to that date.

### 3. Notes
- **Minimal List View**: View note titles, excerpts, and last-edited timestamps.
- **Instant Search**: Search notes by title or content in real time with quick clear (`×`).
- **Distraction-Free Editor**: Single-column writing environment with auto-save to `LocalStorage`, title and body editing, and deletion.

### 4. Technical & Architectural Highlights
- **100% Vanilla Tech Stack**: Pure HTML5, CSS3, and modern Vanilla JavaScript without external dependencies or heavy frameworks.
- **Zero Configuration**: Fully functional offline; data persists across browser sessions using `LocalStorage`.
- **Mobile-First & Responsive**: Single-column container (`max-width: 600px`), comfortable 44px+ touch targets, and zero horizontal scrolling.
- **Accessible & Safe**: Semantic HTML, ARIA attributes, keyboard support (`Escape` to close modal, `Enter` to submit), and strict HTML escaping to prevent XSS.

---

## 📁 File Structure

```
├── index.html       # Clean semantic markup, tabs layout, and modal
├── style.css        # Lavender design tokens, responsive typography, and animations
├── script.js        # State management, LocalStorage persistence, calendar math, notes
└── README.md        # Project overview and documentation
```

---

## 🛠️ Getting Started

1. Clone or open the project directory in your editor or terminal:
   ```bash
   cd d:/SCT_WD_4
   ```

2. Open `index.html` in any modern web browser directly, or serve it via a lightweight HTTP server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Or using Node.js / npx
   npx serve .
   ```

3. Open `http://localhost:8000` in your browser.

---

## 🔒 Privacy & Data

Daynote stores all tasks and notes locally on your device in your browser's `localStorage` (`daynote_tasks`, `daynote_notes`, `daynote_active_tab`). No data is sent to external servers or third-party services.
