// Auto-generated Supabase database types
// Re-run `supabase gen types typescript` to refresh after migrations

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          genre: string
          setting: string
          tone: string
          guardrails: string[]
          status: 'setup' | 'active' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      characters: {
        Row: {
          id: string
          project_id: string
          name: string
          role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
          description: string
          traits: string[]
          backstory: string
          biography: string
          custom_fields: Json
          relations: Json
          current_state: Json
          is_active: boolean
          embedding: number[] | null
          embedding_model: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['characters']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['characters']['Insert']>
      }
      scenes: {
        Row: {
          id: string
          project_id: string
          parent_scene_id: string | null
          title: string
          content: string
          choice_made: string | null
          scene_order: number
          depth: number
          is_ending: boolean
          metadata: Json
          embedding: number[] | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['scenes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['scenes']['Insert']>
      }
      choices: {
        Row: {
          id: string
          scene_id: string
          label: string
          description: string
          consequence_hint: string
          leads_to_scene_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['choices']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['choices']['Insert']>
      }
      story_state: {
        Row: {
          id: string
          project_id: string
          current_scene_id: string
          plot_threads: Json
          clues_discovered: string[]
          character_states: Json
          turn_count: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['story_state']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['story_state']['Insert']>
      }
    }
    Functions: {
      match_scenes: {
        Args: { query_embedding: number[]; project_id: string; match_threshold: number; match_count: number }
        Returns: { id: string; content: string; similarity: number }[]
      }
      match_characters: {
        Args: { query_embedding: number[]; filter_project_id: string; match_count: number }
        Returns: { id: string; similarity: number }[]
      }
      delete_character: {
        Args: { target_character_id: string }
        Returns: undefined
      }
    }
  }
}
