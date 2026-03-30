-- ===========================================
-- TON Mini App Bolivia - Initial Migration
-- ===========================================
-- Creates the core tables: users, game_states, referrals
-- Run this in Supabase SQL Editor or via migration tool

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- USERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    username VARCHAR(255),
    language_code VARCHAR(10),
    is_premium BOOLEAN DEFAULT FALSE,
    referral_code VARCHAR(8) UNIQUE NOT NULL,
    referred_by VARCHAR(8),
    wallet_address VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- ===========================================
-- GAME STATES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS game_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT UNIQUE NOT NULL,
    points BIGINT DEFAULT 0,
    energy INTEGER DEFAULT 1000,
    level INTEGER DEFAULT 1,
    total_taps BIGINT DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_tap_at TIMESTAMPTZ,
    last_streak_date DATE,
    last_play_date DATE,
    team VARCHAR(20),  -- 'colla', 'camba', 'neutral'
    department VARCHAR(50),  -- Bolivian department ID
    tap_power INTEGER DEFAULT 1,
    trust_score INTEGER DEFAULT 50,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for game_states
CREATE INDEX IF NOT EXISTS idx_game_states_telegram_id ON game_states(telegram_id);
CREATE INDEX IF NOT EXISTS idx_game_states_user_id ON game_states(user_id);
CREATE INDEX IF NOT EXISTS idx_game_states_points ON game_states(points DESC);
CREATE INDEX IF NOT EXISTS idx_game_states_level ON game_states(level);
CREATE INDEX IF NOT EXISTS idx_game_states_team ON game_states(team);
CREATE INDEX IF NOT EXISTS idx_game_states_department ON game_states(department);
CREATE INDEX IF NOT EXISTS idx_game_states_team_points ON game_states(team, points DESC);
CREATE INDEX IF NOT EXISTS idx_game_states_department_points ON game_states(department, points DESC);

-- ===========================================
-- REFERRALS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(8) NOT NULL,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inviter_telegram_id BIGINT NOT NULL,
    invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_telegram_id BIGINT NOT NULL,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(invitee_id)
);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_inviter_id ON referrals(inviter_id);
CREATE INDEX IF NOT EXISTS idx_referrals_invitee_id ON referrals(invitee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_inviter_telegram_id ON referrals(inviter_telegram_id);

-- ===========================================
-- TRIGGERS: Auto-update updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for game_states
DROP TRIGGER IF EXISTS update_game_states_updated_at ON game_states;
CREATE TRIGGER update_game_states_updated_at
    BEFORE UPDATE ON game_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Policies for users (service role only for now)
CREATE POLICY "Service role can manage users"
    ON users FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for game_states
CREATE POLICY "Service role can manage game_states"
    ON game_states FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for referrals
CREATE POLICY "Service role can manage referrals"
    ON referrals FOR ALL
    USING (auth.role() = 'service_role');

-- ===========================================
-- FUNCTIONS: Utility functions
-- ===========================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    chars VARCHAR := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    code VARCHAR(8) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically increment game stats (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_game_stats(
    p_telegram_id BIGINT,
    p_points INTEGER,
    p_taps INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE game_states
    SET
        points = points + p_points,
        total_taps = total_taps + p_taps,
        last_tap_at = NOW(),
        updated_at = NOW()
    WHERE telegram_id = p_telegram_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game state not found for telegram_id %', p_telegram_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update streak
CREATE OR REPLACE FUNCTION update_streak(p_telegram_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_last_streak_date DATE;
    v_today DATE := CURRENT_DATE;
    v_new_streak INTEGER;
BEGIN
    SELECT last_streak_date, streak_days INTO v_last_streak_date, v_new_streak
    FROM game_states
    WHERE telegram_id = p_telegram_id;

    IF v_last_streak_date IS NULL THEN
        v_new_streak := 1;
    ELSIF v_last_streak_date = v_today - 1 THEN
        v_new_streak := v_new_streak + 1;
    ELSIF v_last_streak_date < v_today - 1 THEN
        v_new_streak := 1;
    END IF;

    UPDATE game_states
    SET streak_days = v_new_streak, last_streak_date = v_today
    WHERE telegram_id = p_telegram_id;

    RETURN v_new_streak;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- VIEWS: Leaderboard views
-- ===========================================
CREATE OR REPLACE VIEW leaderboard_points AS
SELECT
    u.telegram_id,
    u.username,
    u.first_name,
    gs.points,
    gs.level,
    RANK() OVER (ORDER BY gs.points DESC) as rank
FROM users u
JOIN game_states gs ON u.id = gs.user_id
ORDER BY gs.points DESC;

CREATE OR REPLACE VIEW leaderboard_referrals AS
SELECT
    u.telegram_id,
    u.username,
    u.first_name,
    COUNT(r.id) as referral_count,
    SUM(r.points_earned) as total_referral_points,
    RANK() OVER (ORDER BY COUNT(r.id) DESC) as rank
FROM users u
LEFT JOIN referrals r ON u.id = r.inviter_id
GROUP BY u.id, u.telegram_id, u.username, u.first_name
ORDER BY referral_count DESC;

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant table permissions
GRANT SELECT ON leaderboard_points TO anon, authenticated;
GRANT SELECT ON leaderboard_referrals TO anon, authenticated;
