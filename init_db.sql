-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    avatar TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    age INTEGER CHECK (age >= 16 AND age <= 100),
    bio TEXT,
    interests TEXT[] DEFAULT '{}',
    mode VARCHAR(50) DEFAULT 'friends' CHECK (mode IN ('dating', 'friends', 'business', 'travel')),
    gender VARCHAR(20),
    show_gender BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration: add phone column if table already exists (for existing databases)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Locations table (stores only last known position)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- PostGIS geography point (lat/lng)
    point GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy FLOAT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial index for fast radius queries
CREATE INDEX IF NOT EXISTS locations_point_idx ON locations USING GIST (point);
CREATE INDEX IF NOT EXISTS locations_updated_idx ON locations (updated_at);

-- Interactions table
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('interest', 'ignore', 'match')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_user, to_user)
);

CREATE INDEX IF NOT EXISTS interactions_from_user_idx ON interactions (from_user);
CREATE INDEX IF NOT EXISTS interactions_to_user_idx ON interactions (to_user);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user1, user2),
    CHECK (user1 < user2)  -- Enforce ordering to prevent duplicates
);

CREATE INDEX IF NOT EXISTS matches_user1_idx ON matches (user1);
CREATE INDEX IF NOT EXISTS matches_user2_idx ON matches (user2);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_match_id_idx ON messages (match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages (sender_id);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: find nearby users (returns aggregated data only - no exact coords)
CREATE OR REPLACE FUNCTION find_nearby_users(
    p_lat FLOAT,
    p_lng FLOAT,
    p_radius_meters INT,
    p_user_id UUID,
    p_mode VARCHAR DEFAULT NULL,
    p_stale_minutes INT DEFAULT 5
)
RETURNS TABLE (
    user_id UUID,
    name VARCHAR,
    avatar TEXT,
    age INTEGER,
    bio TEXT,
    interests TEXT[],
    mode VARCHAR,
    distance_meters FLOAT,
    distance_bucket VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.avatar,
        pr.age,
        pr.bio,
        pr.interests,
        pr.mode,
        ST_Distance(
            l.point::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) AS dist,
        CASE
            WHEN ST_Distance(l.point::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) < 50 THEN '50m'
            WHEN ST_Distance(l.point::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) < 150 THEN '100m'
            WHEN ST_Distance(l.point::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) < 750 THEN '500m'
            ELSE '1km'
        END AS dist_bucket
    FROM users u
    JOIN locations l ON l.user_id = u.id
    JOIN profiles pr ON pr.user_id = u.id
    WHERE
        u.id != p_user_id
        AND u.is_active = TRUE
        AND pr.is_visible = TRUE
        AND l.updated_at > NOW() - (p_stale_minutes || ' minutes')::INTERVAL
        AND ST_DWithin(
            l.point::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
            p_radius_meters
        )
        AND (p_mode IS NULL OR pr.mode = p_mode)
    ORDER BY dist ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: get zone clusters for map mode (returns counts per zone, not positions)
CREATE OR REPLACE FUNCTION get_zone_clusters(
    p_lat FLOAT,
    p_lng FLOAT,
    p_user_id UUID,
    p_stale_minutes INT DEFAULT 5
)
RETURNS TABLE (
    zone_name VARCHAR,
    user_count BIGINT,
    radius_meters INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        z.zone_name,
        COUNT(l.user_id),
        z.radius
    FROM (VALUES
        ('close'::VARCHAR, 100),
        ('near'::VARCHAR, 300),
        ('medium'::VARCHAR, 500),
        ('far'::VARCHAR, 1000)
    ) AS z(zone_name, radius)
    LEFT JOIN locations l ON
        l.user_id != p_user_id
        AND l.updated_at > NOW() - (p_stale_minutes || ' minutes')::INTERVAL
        AND ST_DWithin(
            l.point::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
            z.radius
        )
    LEFT JOIN users u ON u.id = l.user_id AND u.is_active = TRUE
    LEFT JOIN profiles pr ON pr.user_id = l.user_id AND pr.is_visible = TRUE
    GROUP BY z.zone_name, z.radius
    ORDER BY z.radius ASC;
END;
$$ LANGUAGE plpgsql;
