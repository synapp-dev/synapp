-- Function to link a Steam profile to a user account
CREATE OR REPLACE FUNCTION public.link_steam_profile_to_user(
    p_steamid64 BIGINT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    steam_profile_exists BOOLEAN;
    user_profile_exists BOOLEAN;
BEGIN
    -- Check if steam profile exists
    SELECT EXISTS(SELECT 1 FROM public.steam_profiles WHERE steamid64 = p_steamid64) INTO steam_profile_exists;
    
    IF NOT steam_profile_exists THEN
        RAISE EXCEPTION 'Steam profile with steamid64 % does not exist', p_steamid64;
    END IF;
    
    -- Check if user profile exists
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id = p_user_id) INTO user_profile_exists;
    
    IF NOT user_profile_exists THEN
        RAISE EXCEPTION 'User profile does not exist for user_id %', p_user_id;
    END IF;
    
    -- Update user profile to link with steam profile
    UPDATE public.user_profiles 
    SET steam_profile_id = p_steamid64,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlink Steam profile from user account
CREATE OR REPLACE FUNCTION public.unlink_steam_profile_from_user(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_profiles 
    SET steam_profile_id = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with Steam data
CREATE OR REPLACE FUNCTION public.get_user_profile_with_steam(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    steam_profile_id BIGINT,
    username VARCHAR(255),
    display_name VARCHAR(255),
    bio TEXT,
    avatar_url VARCHAR(500),
    email VARCHAR(255),
    is_verified BOOLEAN,
    is_premium BOOLEAN,
    preferences JSONB,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    -- Steam profile data
    steam_personaname VARCHAR(255),
    steam_avatar VARCHAR(500),
    steam_avatarfull VARCHAR(500),
    steam_profileurl VARCHAR(500),
    steam_realname VARCHAR(255),
    steam_timecreated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.user_id,
        up.steam_profile_id,
        up.username,
        up.display_name,
        up.bio,
        up.avatar_url,
        up.email,
        up.is_verified,
        up.is_premium,
        up.preferences,
        up.last_active,
        up.created_at,
        up.updated_at,
        -- Steam profile data
        sp.personaname,
        sp.avatar,
        sp.avatarfull,
        sp.profileurl,
        sp.realname,
        sp.timecreated
    FROM public.user_profiles up
    LEFT JOIN public.steam_profiles sp ON up.steam_profile_id = sp.steamid64
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search users by Steam persona name
CREATE OR REPLACE FUNCTION public.search_users_by_steam_name(
    p_search_term VARCHAR(255)
)
RETURNS TABLE (
    user_id UUID,
    username VARCHAR(255),
    display_name VARCHAR(255),
    steam_personaname VARCHAR(255),
    steam_avatar VARCHAR(500),
    steam_profileurl VARCHAR(500)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        up.username,
        up.display_name,
        sp.personaname,
        sp.avatar,
        sp.profileurl
    FROM public.user_profiles up
    INNER JOIN public.steam_profiles sp ON up.steam_profile_id = sp.steamid64
    WHERE sp.personaname ILIKE '%' || p_search_term || '%'
    ORDER BY sp.personaname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;