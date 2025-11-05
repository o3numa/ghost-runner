import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- lowdb (JSON file database) ---
// db.json will be created on first write; persists high score + ghost replay
const db = new Low(new JSONFile('db.json'), { highscore: 0, ghost: null });
await db.read();
if (!db.data) db.data = { highscore: 0, ghost: null };

// --- express (web server) ---
const app = express();
app.use(express.json()); // parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // serve files in /public

// Return current highscore + ghost
app.get('/api/highscore', async (_req, res) => {
  await db.read();
  res.json({ highscore: db.data.highscore, ghost: db.data.ghost });
});

// Accept a new highscore attempt
app.post('/api/highscore', async (req, res) => {
  const { name, score, seed, jumps, date } = req.body || {};
  if (typeof score !== 'number') {
    return res.status(400).json({ error: 'score must be a number' });
  }

  await db.read();
  if (score > (db.data.highscore || 0)) {
    db.data.highscore = score;
    db.data.ghost = {
      name: (name || 'anon').slice(0, 24),
      seed,
      jumps: Array.isArray(jumps) ? jumps : [],
      date: date || new Date().toISOString()
    };
    await db.write();
    return res.json({ updated: true, highscore: db.data.highscore, ghost: db.data.ghost });
  }

  res.json({ updated: false, highscore: db.data.highscore });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ghost Runner server on http://localhost:${PORT}`));
