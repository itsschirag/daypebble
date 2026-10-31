-- Cloudflare D1 schema for the daily leaderboard
CREATE TABLE IF NOT EXISTS scores (
  game       TEXT    NOT NULL,
  day        TEXT    NOT NULL,           -- YYYY-MM-DD (player's local date)
  player     TEXT    NOT NULL,           -- random id from the browser
  nick       TEXT    NOT NULL,
  rank       INTEGER NOT NULL,           -- lower is better (ms, or 1000 - percent*10)
  label      TEXT    NOT NULL,           -- what we display, e.g. "1:04" or "97.3%"
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  hidden     INTEGER NOT NULL DEFAULT 0, -- moderation flag
  PRIMARY KEY (game, day, player)        -- first submission per player per day wins
);
CREATE INDEX IF NOT EXISTS idx_scores_board ON scores (game, day, hidden, rank);
