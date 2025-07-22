# Steam Profile API

This API endpoint fetches comprehensive Steam profile information for a given Steam ID64.

## Endpoint

```
GET /api/steam/profile?steamId={steamId64}
```

## Parameters

- `steamId` (required): A valid Steam ID64 (17-digit number)

## Response

Returns a JSON object with the following profile information:

### Core Information

- `steamId`: The Steam ID64 of the user
- `personaName`: Current Steam display name
- `profileUrl`: Steam community profile URL
- `avatar`: Medium-sized avatar URL
- `avatarFull`: Full-sized avatar URL

### Account Statistics

- `accountAge`: Account age in days (calculated from `timecreated`)
- `steamLevel`: Current Steam level
- `friendsCount`: Number of friends

### Additional Information

- `realName`: Real name (if public)
- `countryCode`: Country code (if public)
- `stateCode`: State/province code (if public)
- `lastLogoff`: Unix timestamp of last logoff
- `profileState`: Profile state (1 = configured, 0 = not configured)
- `communityVisibilityState`: Profile visibility (1 = private, 2 = friends only, 3 = public)

## Example Usage

```javascript
// Fetch profile for Steam ID 76561198012345678
const response = await fetch("/api/steam/profile?steamId=76561198012345678");
const profile = await response.json();

console.log(`Player: ${profile.personaName}`);
console.log(`Account Age: ${profile.accountAge} days`);
console.log(`Steam Level: ${profile.steamLevel}`);
console.log(`Friends: ${profile.friendsCount}`);
```

## Error Responses

- `400`: Missing or invalid Steam ID
- `404`: Steam profile not found
- `500`: Server error or Steam API key not configured

## Requirements

- `STEAM_API_KEY` environment variable must be set with a valid Steam Web API key
- Steam ID must be in Steam ID64 format (17 digits)

## Steam API Endpoints Used

1. **GetPlayerSummaries**: Basic profile information
2. **GetSteamLevel**: Current Steam level
3. **GetFriendList**: Friends count

All endpoints use the Steam Web API with your configured API key.
