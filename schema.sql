-- ============================================================
-- ONWARD CRICKET DIGITAL TWIN — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Profile table (one row per family)
CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY DEFAULT 'onward',
  name        TEXT,
  dob         TEXT,
  location    TEXT,
  country     TEXT,
  role        TEXT DEFAULT 'Leg Spinner',
  since       TEXT,
  pin_hash    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bowling sessions (practice + match)
CREATE TABLE IF NOT EXISTS bowling (
  id          BIGSERIAL PRIMARY KEY,
  profile_id  TEXT DEFAULT 'onward',
  type        TEXT NOT NULL CHECK (type IN ('practice','match')),
  date        TEXT NOT NULL,
  overs       NUMERIC,
  duration    NUMERIC,
  wickets     NUMERIC,
  economy     NUMERIC,
  maidens     NUMERIC,
  wides       NUMERIC,
  no_balls    NUMERIC,
  opponent    TEXT,
  drills      JSONB DEFAULT '[]',
  variations  JSONB DEFAULT '[]',
  accuracy    NUMERIC,
  self_feel   NUMERIC,
  pressure_rating NUMERIC,
  coach_notes TEXT,
  notes       TEXT,
  entered_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Fitness sessions
CREATE TABLE IF NOT EXISTS fitness (
  id          BIGSERIAL PRIMARY KEY,
  profile_id  TEXT DEFAULT 'onward',
  date        TEXT NOT NULL,
  type        TEXT,
  duration    NUMERIC,
  intensity   NUMERIC,
  notes       TEXT,
  entered_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition log
CREATE TABLE IF NOT EXISTS nutrition (
  id            BIGSERIAL PRIMARY KEY,
  profile_id    TEXT DEFAULT 'onward',
  date          TEXT NOT NULL,
  calories      NUMERIC,
  protein       NUMERIC,
  hydration     NUMERIC,
  pre_training  TEXT,
  post_training TEXT,
  energy_level  NUMERIC,
  entered_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Wellness check-ins
CREATE TABLE IF NOT EXISTS wellness (
  id                   BIGSERIAL PRIMARY KEY,
  profile_id           TEXT DEFAULT 'onward',
  date                 TEXT NOT NULL,
  bedtime              TEXT,
  wake_time            TEXT,
  sleep_hours          NUMERIC,
  sleep_quality        NUMERIC,
  sleep_interruptions  NUMERIC,
  fatigue              NUMERIC,
  mood                 NUMERIC,
  soreness             TEXT DEFAULT 'None',
  sore_details         TEXT,
  entered_by           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Daily log
CREATE TABLE IF NOT EXISTS daily_log (
  id           BIGSERIAL PRIMARY KEY,
  profile_id   TEXT DEFAULT 'onward',
  date         TEXT NOT NULL,
  feelings     JSONB DEFAULT '[]',
  study_hours  NUMERIC,
  screen_time  NUMERIC,
  play_time    NUMERIC,
  free_time    NUMERIC,
  journal      TEXT,
  entered_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security — allow public read/write with anon key
-- (safe because PIN protection is handled in the app)
-- ============================================================
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bowling   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness   ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_profiles"  ON profiles  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_bowling"   ON bowling   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_fitness"   ON fitness   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_nutrition" ON nutrition FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_wellness"  ON wellness  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_daily_log" ON daily_log FOR ALL USING (true) WITH CHECK (true);

-- Done! Your database is ready.
