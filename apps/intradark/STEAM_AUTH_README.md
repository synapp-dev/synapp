# Steam Authentication System

This document explains how to set up and use the Steam authentication system for the Intradark app.

## Overview

The Steam authentication system consists of two main tables:

1. **`steam_profiles`** - Stores Steam user data with `steamid64` as the primary key
2. **`user_profiles`** - Stores app user accounts that can be linked to Steam profiles

This design allows you to:

- Track Steam users even before they sign up for your app
- Link existing Steam profiles to user accounts when they authenticate
- Maintain separate user profiles with app-specific data

## Database Schema

### steam_profiles Table

```sql
CREATE TABLE steam_profiles (
    steamid64 BIGINT PRIMARY KEY,           -- Steam's unique 64-bit ID
    steamid VARCHAR(255) NOT NULL,          -- Steam's string ID
    personaname VARCHAR(255) NOT NULL,      -- Display name
    profileurl VARCHAR(500),                -- Steam profile URL
    avatar VARCHAR(500),                    -- Avatar URLs
    avatarmedium VARCHAR(500),
    avatarfull VARCHAR(500),
    personastate INTEGER DEFAULT 0,         -- Online status
    communityvisibilitystate INTEGER DEFAULT 1,
    profilestate INTEGER DEFAULT 0,
    lastlogoff TIMESTAMP WITH TIME ZONE,
    commentpermission INTEGER DEFAULT 1,
    realname VARCHAR(255),                  -- Real name (if public)
    primaryclanid BIGINT,
    timecreated TIMESTAMP WITH TIME ZONE,   -- Account creation date
    gameid BIGINT,                          -- Currently playing
    gameserverip VARCHAR(45),
    gameextrainfo VARCHAR(255),
    cityid INTEGER,                         -- Location data
    loccountrycode VARCHAR(10),
    locstatecode VARCHAR(10),
    loccityid INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### user_profiles Table

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    steam_profile_id BIGINT REFERENCES steam_profiles(steamid64) ON DELETE SET NULL,
    username VARCHAR(255) UNIQUE,           -- App-specific username
    display_name VARCHAR(255),              -- App display name
    bio TEXT,                               -- User bio
    avatar_url VARCHAR(500),                -- App avatar
    email VARCHAR(255),                     -- User email
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}',         -- User preferences
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure either steam_profile_id or username is provided
    CONSTRAINT check_steam_or_username CHECK (
        steam_profile_id IS NOT NULL OR username IS NOT NULL
    )
);
```

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_STEAM_API_KEY=your_steam_api_key_here
```

### 2. Run Database Migrations

```bash
# Apply the migrations to your Supabase database
supabase db push
```

### 3. Steam API Key

Get a Steam Web API key from: https://steamcommunity.com/dev/apikey

## Usage

### Basic Steam Authentication Flow

1. **User signs in with Steam** (using your existing Steam auth implementation)
2. **Get Steam ID from authentication response**
3. **Link Steam profile to user account**

```typescript
import { useSteamAuth } from '@/hooks/use-steam-auth';

function SteamAuthComponent() {
  const { userProfile, linkSteamProfile, isLoading, error } = useSteamAuth();

  const handleSteamAuth = async (steamid64: string) => {
    const success = await linkSteamProfile(steamid64);
    if (success) {
      console.log('Steam profile linked successfully!');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {userProfile?.steam_personaname ? (
        <div>
          <p>Linked to: {userProfile.steam_personaname}</p>
          <img src={userProfile.steam_avatar} alt="Steam Avatar" />
        </div>
      ) : (
        <button onClick={() => handleSteamAuth('STEAM_ID_64')}>
          Link Steam Account
        </button>
      )}
    </div>
  );
}
```

### API Endpoints

#### Link Steam Profile

```typescript
POST /api/auth/steam/link
Content-Type: application/json

{
  "steamid64": "76561198012345678"
}
```

#### Unlink Steam Profile

```typescript
DELETE / api / auth / steam / link;
```

### Utility Functions

#### Get or Create Steam Profile

```typescript
import { getOrCreateSteamProfile } from "@/utils/steam-profile";

const steamProfile = await getOrCreateSteamProfile("76561198012345678");
```

#### Update Steam Profile

```typescript
import { updateSteamProfile } from "@/utils/steam-profile";

const updatedProfile = await updateSteamProfile("76561198012345678");
```

#### Search Users by Steam Name

```typescript
import { searchUsersBySteamName } from "@/utils/steam-profile";

const users = await searchUsersBySteamName("gamer123");
```

## Database Functions

The system includes several PostgreSQL functions for common operations:

### `link_steam_profile_to_user(p_steamid64, p_user_id)`

Links a Steam profile to a user account.

### `unlink_steam_profile_from_user(p_user_id)`

Unlinks a Steam profile from a user account.

### `get_user_profile_with_steam(p_user_id)`

Returns user profile with joined Steam data.

### `search_users_by_steam_name(p_search_term)`

Searches for users by Steam persona name.

## Security Features

- **Row Level Security (RLS)** enabled on both tables
- **Public read access** to Steam profiles (for search functionality)
- **User-specific write access** to their own profiles
- **Automatic profile creation** when users sign up
- **Foreign key constraints** to maintain data integrity

## Best Practices

1. **Always validate Steam IDs** before processing
2. **Handle API rate limits** when fetching Steam data
3. **Cache Steam profile data** to avoid excessive API calls
4. **Update profiles periodically** to keep data fresh
5. **Handle Steam API errors** gracefully

## Example Integration

Here's how to integrate this with your existing Steam authentication:

```typescript
// After successful Steam authentication
const handleSteamAuthSuccess = async (steamUser: any) => {
  try {
    // Link the Steam profile to the current user
    const success = await linkSteamProfile(steamUser.steamid);

    if (success) {
      // Update user profile with Steam data
      const profile = await getUserProfileWithSteam();

      // Update display name and avatar if not set
      if (profile && !profile.display_name) {
        await updateUserProfile({
          display_name: profile.steam_personaname,
          avatar_url: profile.steam_avatar,
        });
      }
    }
  } catch (error) {
    console.error("Failed to link Steam profile:", error);
  }
};
```

## Troubleshooting

### Common Issues

1. **Steam API Key not set**: Ensure `NEXT_PUBLIC_STEAM_API_KEY` is in your environment
2. **Migration errors**: Run `supabase db reset` to start fresh
3. **RLS policy issues**: Check that your user is authenticated
4. **Foreign key violations**: Ensure Steam profile exists before linking

### Debug Mode

Enable debug logging by setting:

```bash
NEXT_PUBLIC_DEBUG=true
```

This will log detailed information about Steam API calls and database operations.
