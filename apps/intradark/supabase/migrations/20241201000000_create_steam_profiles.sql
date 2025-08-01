-- Create steam_profiles table
CREATE TABLE IF NOT EXISTS public.steam_profiles (
    steamid64 BIGINT PRIMARY KEY,
    steamid VARCHAR(255) NOT NULL,
    personaname VARCHAR(255) NOT NULL,
    profileurl VARCHAR(500),
    avatar VARCHAR(500),
    avatarmedium VARCHAR(500),
    avatarfull VARCHAR(500),
    personastate INTEGER DEFAULT 0,
    communityvisibilitystate INTEGER DEFAULT 1,
    profilestate INTEGER DEFAULT 0,
    lastlogoff TIMESTAMP WITH TIME ZONE,
    commentpermission INTEGER DEFAULT 1,
    realname VARCHAR(255),
    primaryclanid BIGINT,
    timecreated TIMESTAMP WITH TIME ZONE,
    gameid BIGINT,
    gameserverip VARCHAR(45),
    gameextrainfo VARCHAR(255),
    cityid INTEGER,
    loccountrycode VARCHAR(10),
    locstatecode VARCHAR(10),
    loccityid INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on steamid for faster lookups
CREATE INDEX IF NOT EXISTS idx_steam_profiles_steamid ON public.steam_profiles(steamid);

-- Create index on personaname for search functionality
CREATE INDEX IF NOT EXISTS idx_steam_profiles_personaname ON public.steam_profiles(personaname);

-- Enable Row Level Security
ALTER TABLE public.steam_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to steam profiles
CREATE POLICY "Allow public read access to steam profiles" ON public.steam_profiles
    FOR SELECT USING (true);

-- Create policy to allow authenticated users to update their own steam profile
CREATE POLICY "Allow users to update their own steam profile" ON public.steam_profiles
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM public.user_profiles WHERE steam_profile_id = steamid64
    ));

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_steam_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_steam_profiles_updated_at
    BEFORE UPDATE ON public.steam_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_steam_profiles_updated_at();