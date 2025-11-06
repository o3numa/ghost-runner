# 👻 Ghost Runner

**Ghost Runner** is a fast, minimalist web game where players race against a "ghost" version of their previous best run.  
Built with **p5.js**, **Express**, and **lowdb**, it demonstrates how a simple Node.js backend can store and serve game data — and even sync to a GitHub Gist for persistent cloud storage when deployed.

---

## 🎮 Gameplay Overview

- Tap **Space** or **↑ (Up Arrow)** to jump.
- Avoid incoming obstacles.
- Each run’s score = how long you survive.
- Beat the high score to record a new **Ghost Run** — a replay of your best jumps!

---

## 🧠 Technology Stack

| Layer | Tool | Purpose |
|-------|------|----------|
| Frontend | **p5.js** | Handles rendering, animation, and input. |
| Backend | **Express.js** | Serves web files and manages API routes. |
| Database | **lowdb** | Lightweight JSON database for storing highscores and ghost data. |
| Cloud Persistence | **GitHub Gist API** | Optional adapter that saves the JSON database to a private Gist for permanent storage. |


Credits
p5.js for rendering
Express + lowdb for backend logic
GitHub Gist API for persistence
ChatGPT
@o3numa (yØx) — Design, Development, & Direction
Created by o3numa (Tomatse Ogedegbe)
Built for educational use with the IMA/NYU Interactive Media Arts program.
License
MIT License © 2025 o3numa