# Steam Authentication Setup

This guide explains how to set up Steam authentication in your Next.js application.

## Prerequisites

1. **Steam API Key**: Get your Steam API key from [Steam Community Dev](http://steamcommunity.com/dev/apikey)
2. **Environment Variables**: Configure the required environment variables

## Environment Variables

Create a `.env.local` file in your `apps/intradark` directory with the following variables:

```env
# Steam API Configuration
STEAM_API_KEY=your_steam_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup Steps

### 1. Get Steam API Key

1. Go to [Steam Community Dev](http://steamcommunity.com/dev/apikey)
2. Sign in with your Steam account
3. Accept the terms of service
4. Enter a domain name (can be localhost for development)
5. Copy your API key

### 2. Configure Environment Variables

Add your Steam API key to the `.env.local` file:

```env
STEAM_API_KEY=YOUR_ACTUAL_API_KEY_HERE
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Test the Authentication

1. Start your development server:

   ```bash
   pnpm dev
   ```

2. Navigate to `http://localhost:3000/auth`

3. Click the "Sign in with Steam" button

4. You should be redirected to Steam's authentication page

5. After successful authentication, you'll be redirected back to your app

## How It Works

### Authentication Flow

1. **Initiation**: User clicks "Sign in with Steam" button
2. **Redirect**: User is redirected to Steam's OpenID 2.0 authentication page
3. **Authentication**: User authenticates with Steam
4. **Callback**: Steam redirects back to your app with user data
5. **Profile Fetch**: Your app fetches additional user profile data from Steam API
6. **Session**: User data is stored in local storage and user is logged in

### API Routes

- `/api/auth/steam` - Initiates Steam authentication
- `/api/auth/steam/callback` - Handles Steam authentication callback

### Components

- `SteamLoginButton` - Button component for Steam authentication
- `useSteamAuth` - Hook for handling authentication state
- `useSteamAuthStore` - Zustand store for user state management

## User Data Structure

After successful authentication, the user object contains:

```typescript
interface SteamUser {
  steamId: string; // Steam ID (64-bit)
  displayName: string; // Steam display name
  profileUrl?: string; // Steam profile URL
  avatar?: string; // Small avatar URL
  avatarFull?: string; // Full-size avatar URL
  realName?: string; // Real name (if public)
  timeCreated?: number; // Account creation timestamp
}
```

## Security Considerations

1. **OpenID Verification**: The current implementation includes basic OpenID verification. For production, implement full OpenID 2.0 verification.
2. **Session Management**: Consider implementing proper session management with secure cookies or JWT tokens.
3. **Database Storage**: Store user data in your database for persistence across sessions.
4. **Rate Limiting**: Implement rate limiting on authentication endpoints.

## Production Deployment

For production deployment:

1. Update `NEXT_PUBLIC_APP_URL` to your production domain
2. Update your Steam API key domain settings
3. Implement proper session management
4. Add error handling and logging
5. Consider using a database to store user sessions

## Troubleshooting

### Common Issues

1. **"Invalid Steam ID" error**: Check that your Steam API key is correct
2. **Authentication fails**: Verify your domain is correctly configured in Steam API settings
3. **Callback errors**: Ensure `NEXT_PUBLIC_APP_URL` is correctly set

### Debug Mode

To enable debug logging, add this to your environment variables:

```env
DEBUG=steam-auth:*
```

## Next Steps

1. Implement proper session management
2. Add user data persistence to database
3. Implement logout functionality
4. Add user profile management
5. Implement proper error handling
