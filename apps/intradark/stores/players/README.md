# Player Store & Hooks

This directory contains the Zustand store and React Query hooks for managing CS2 player data.

## Structure

```
stores/players/
├── player-store.ts              # Main player store (combines all services)
├── steam-profile-store.ts       # Steam profile store
├── leetify-profile-store.ts     # Leetify profile store
├── faceit-profile-store.ts      # Faceit profile store
├── csstats-profile-store.ts     # CSStats profile store
├── README.md                    # This file
└── hooks/players/
    ├── queries/
    │   └── read.ts             # React Query hooks for fetching data
    ├── mutations/
    │   ├── create.ts           # Create player mutation
    │   ├── update.ts           # Update player mutation
    │   ├── delete.ts           # Delete player mutation
    │   └── index.ts            # Export all mutations
    └── index.ts                # Export all hooks
```

## Features

- **Separation of Concerns**: Each service has its own store and can be used independently
- **Caching**: All data is cached by Steam ID 64 to avoid refetching when navigating between pages
- **Automatic Updates**: Stores automatically update when new data is fetched
- **Smart Fetching**: Automatically fetches Faceit data when Leetify profile contains a Faceit nickname
- **Type Safety**: Full TypeScript support with proper type definitions
- **Error Handling**: Comprehensive error handling for all API calls
- **Loading States**: Individual loading states for each service
- **Flexible Usage**: Use combined hook or individual service hooks as needed

## Usage

### Basic Usage

```tsx
import { usePlayerByVanityUrl } from "@/stores/players/player-store";

function PlayerProfile({ vanityUrl }: { vanityUrl: string }) {
  const {
    player,
    isLoading,
    error,
    refetch,
    // Individual service states
    steamProfileData,
    steamProfileLoading,
    steamProfileError,
    leetifyProfileData,
    leetifyProfileLoading,
    leetifyProfileError,
    faceitProfileData,
    faceitProfileLoading,
    faceitProfileError,
    csstatsProfileData,
    csstatsProfileLoading,
    csstatsProfileError,
  } = usePlayerByVanityUrl(vanityUrl);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!player) return <div>Player not found</div>;

  return (
    <div>
      <h1>{steamProfileData?.data.personaname}</h1>

      {/* Use individual service data and loading states */}
      {leetifyProfileLoading ? (
        <p>Loading Leetify data...</p>
      ) : (
        <p>Leetify Rating: {leetifyProfileData?.recentGameRatings.leetify}</p>
      )}

      {faceitProfileLoading ? (
        <p>Loading Faceit data...</p>
      ) : (
        <p>Faceit ELO: {faceitProfileData?.payload.games.cs2?.faceit_elo}</p>
      )}

      {csstatsProfileLoading ? (
        <p>Loading CSStats data...</p>
      ) : (
        <p>CSStats Rank: {csstatsProfileData?.data.ranks[0]?.current}</p>
      )}
    </div>
  );
}
```

### Accessing Store Directly

```tsx
import { usePlayerStore } from "@/stores/players/player-store";

function SomeComponent() {
  const { players, selectedPlayer, getPlayer } = usePlayerStore();

  // Get a specific player by Steam ID
  const player = getPlayer("76561198012345678");

  return <div>{/* Use player data */}</div>;
}
```

### Mutations

```tsx
import { useCreatePlayerMutation } from "@/hooks/players/mutations";

function CreatePlayerForm() {
  const createPlayer = useCreatePlayerMutation();

  const handleSubmit = (playerData) => {
    createPlayer.mutate(playerData);
  };

  return <form onSubmit={handleSubmit}>{/* form fields */}</form>;
}
```

## Data Types

### PlayerData

```typescript
interface PlayerData {
  steamId64: string;
  vanityUrl: string;
  steamProfile: SteamProfile | null;
  leetifyProfile: LeetifyProfile | null;
  faceitProfile: FaceitProfile | null;
  csstatsProfile: CSStatsProfile | null;
  lastUpdated: number;
}
```

### Available Hooks

#### Combined Hooks

- `usePlayerByVanityUrl(vanityUrl)` - Get all player data by Steam vanity URL (automatically fetches all profiles including Faceit)

#### Individual Service Hooks

- `useSteamProfile(steamId64)` - Get Steam profile data only
- `useLeetifyProfile(steamId64)` - Get Leetify profile data only
- `useFaceitProfile(steamId64)` - Get Faceit profile data only
- `useCSStatsProfile(steamId64)` - Get CSStats profile data only

#### Mutation Hooks

- `useCreatePlayerMutation()` - Create new player record
- `useUpdatePlayerMutation()` - Update existing player record
- `useDeletePlayerMutation()` - Delete player record

### Individual Service Usage

You can use individual service hooks for complete separation of concerns:

```typescript
// Use individual services independently
const {
  profile: steamProfile,
  isLoading: steamLoading,
  error: steamError,
} = useSteamProfile(steamId64);
const {
  profile: leetifyProfile,
  isLoading: leetifyLoading,
  error: leetifyError,
} = useLeetifyProfile(steamId64);
const {
  profile: faceitProfile,
  isLoading: faceitLoading,
  error: faceitError,
} = useFaceitProfile(steamId64);
const {
  profile: csstatsProfile,
  isLoading: csstatsLoading,
  error: csstatsError,
} = useCSStatsProfile(steamId64);

// Or use the combined hook
const { player, isLoading, error } = usePlayerByVanityUrl(vanityUrl);
```

### Individual Service States

The combined hook also returns individual service states:

```typescript
const {
  // Combined states
  player, // Complete player object with all data
  isLoading, // True if any service is loading
  error, // Combined error message
  refetch, // Refetch all data

  // Individual service states
  steamProfileData,
  steamProfileLoading,
  steamProfileError,
  leetifyProfileData,
  leetifyProfileLoading,
  leetifyProfileError,
  faceitProfileData,
  faceitProfileLoading,
  faceitProfileError,
  csstatsProfileData,
  csstatsProfileLoading,
  csstatsProfileError,
} = usePlayerByVanityUrl(vanityUrl);
```

This allows you to:

- Show individual loading states for each service
- Handle errors per service
- Use services independently when needed
- Track when Faceit data is being fetched separately

## Benefits

1. **Performance**: Data is cached and shared across components
2. **User Experience**: No refetching when navigating back to previously viewed players
3. **Maintainability**: Centralized data management with clear separation of concerns
4. **Scalability**: Easy to add new data sources or modify existing ones
5. **Type Safety**: Full TypeScript support prevents runtime errors
