// TODO: Generate your Supabase database types
//
// 1. Install Supabase CLI: npm install -g supabase
// 2. Login to Supabase: supabase login
// 3. Generate types: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
//
// Or use the Supabase dashboard:
// 1. Go to your Supabase project dashboard
// 2. Navigate to Settings > API
// 3. Copy the TypeScript types from the "Database types" section
// 4. Paste them here

export type Database = {
  public: {
    Tables: {
      steam_profiles: {
        Row: {
          steamid64: number;
          steamid: string;
          personaname: string;
          profileurl: string | null;
          avatar: string | null;
          avatarmedium: string | null;
          avatarfull: string | null;
          personastate: number;
          communityvisibilitystate: number;
          profilestate: number;
          lastlogoff: string | null;
          commentpermission: number;
          realname: string | null;
          primaryclanid: string | null;
          timecreated: string | null;
          gameid: number | null;
          gameserverip: string | null;
          gameextrainfo: string | null;
          cityid: number | null;
          loccountrycode: string | null;
          locstatecode: string | null;
          loccityid: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          steamid64: number;
          steamid: string;
          personaname: string;
          profileurl?: string | null;
          avatar?: string | null;
          avatarmedium?: string | null;
          avatarfull?: string | null;
          personastate?: number;
          communityvisibilitystate?: number;
          profilestate?: number;
          lastlogoff?: string | null;
          commentpermission?: number;
          realname?: string | null;
          primaryclanid?: string | null;
          timecreated?: string | null;
          gameid?: number | null;
          gameserverip?: string | null;
          gameextrainfo?: string | null;
          cityid?: number | null;
          loccountrycode?: string | null;
          locstatecode?: string | null;
          loccityid?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          steamid64?: number;
          steamid?: string;
          personaname?: string;
          profileurl?: string | null;
          avatar?: string | null;
          avatarmedium?: string | null;
          avatarfull?: string | null;
          personastate?: number;
          communityvisibilitystate?: number;
          profilestate?: number;
          lastlogoff?: string | null;
          commentpermission?: number;
          realname?: string | null;
          primaryclanid?: string | null;
          timecreated?: string | null;
          gameid?: number | null;
          gameserverip?: string | null;
          gameextrainfo?: string | null;
          cityid?: number | null;
          loccountrycode?: string | null;
          locstatecode?: string | null;
          loccityid?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          steam_profile_id: number | null;
          discord_user_id: string | null;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          email: string | null;
          is_verified: boolean;
          is_premium: boolean;
          preferences: any;
          last_active: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          steam_profile_id?: number | null;
          discord_user_id?: string | null;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          is_verified?: boolean;
          is_premium?: boolean;
          preferences?: any;
          last_active?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          steam_profile_id?: number | null;
          discord_user_id?: string | null;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          is_verified?: boolean;
          is_premium?: boolean;
          preferences?: any;
          last_active?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          slug: string;
          label: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          label: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          label?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          user_profile_id: string;
          role_id: string;
          granted_at: string;
          granted_by: string | null;
        };
        Insert: {
          user_profile_id: string;
          role_id: string;
          granted_at?: string;
          granted_by?: string | null;
        };
        Update: {
          user_profile_id?: string;
          role_id?: string;
          granted_at?: string;
          granted_by?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      link_steam_profile_to_user: {
        Args: {
          p_steamid64: number;
          p_user_id?: string;
        };
        Returns: boolean;
      };
      unlink_steam_profile_from_user: {
        Args: {
          p_user_id?: string;
        };
        Returns: boolean;
      };
      get_user_profile_with_steam: {
        Args: {
          p_user_id?: string;
        };
        Returns: {
          id: string;
          user_id: string;
          steam_profile_id: number | null;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          email: string | null;
          is_verified: boolean;
          is_premium: boolean;
          preferences: any;
          last_active: string;
          created_at: string;
          updated_at: string;
          steam_personaname: string | null;
          steam_avatar: string | null;
          steam_avatarfull: string | null;
          steam_profileurl: string | null;
          steam_realname: string | null;
          steam_timecreated: string | null;
        }[];
      };
      search_users_by_steam_name: {
        Args: {
          p_search_term: string;
        };
        Returns: {
          user_id: string;
          username: string | null;
          display_name: string | null;
          steam_personaname: string | null;
          steam_avatar: string | null;
          steam_profileurl: string | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
