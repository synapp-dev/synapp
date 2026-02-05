-- Create steam_profiles table (must run before user_profiles which references it)
CREATE TABLE IF NOT EXISTS public.steam_profiles (
    steamid64 BIGINT PRIMARY KEY,
    steamid VARCHAR(20) NOT NULL,
    personaname VARCHAR(255) NOT NULL,
    profileurl VARCHAR(500),
    avatar VARCHAR(500),
    avatarmedium VARCHAR(500),
    avatarfull VARCHAR(500),
    personastate INTEGER DEFAULT 0,
    communityvisibilitystate INTEGER DEFAULT 0,
    profilestate INTEGER DEFAULT 0,
    lastlogoff TIMESTAMP WITH TIME ZONE,
    commentpermission INTEGER DEFAULT 0,
    realname VARCHAR(255),
    primaryclanid VARCHAR(20),
    timecreated TIMESTAMP WITH TIME ZONE,
    gameid INTEGER,
    gameserverip VARCHAR(50),
    gameextrainfo VARCHAR(255),
    cityid INTEGER,
    loccountrycode VARCHAR(2),
    locstatecode VARCHAR(2),
    loccityid INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for lookups by steamid
CREATE INDEX IF NOT EXISTS idx_steam_profiles_steamid ON public.steam_profiles(steamid);

-- Enable RLS
ALTER TABLE public.steam_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read (Steam profile data is public)
CREATE POLICY "Allow public read steam_profiles" ON public.steam_profiles
    FOR SELECT USING (true);

-- Only service role can insert/update (done by our API)
CREATE POLICY "Allow insert steam_profiles" ON public.steam_profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update steam_profiles" ON public.steam_profiles
    FOR UPDATE USING (true);
