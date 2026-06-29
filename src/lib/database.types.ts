export type Database = {
  voice_diary: {
    Tables: {
      profiles: {
        Row: {
          id: string
          auth_user_id: string
          name: string
          birth_date: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          name: string
          birth_date?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          birth_date?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guardians: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          relation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          relation?: string | null
        }
        Update: {
          name?: string
          email?: string
          relation?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          id: number
          category: string
          content: string
          is_common: boolean
          order_hint: number | null
          created_at: string
        }
        Insert: {
          category: string
          content: string
          is_common?: boolean
          order_hint?: number | null
        }
        Update: {
          category?: string
          content?: string
          is_common?: boolean
          order_hint?: number | null
        }
        Relationships: []
      }
      user_questions: {
        Row: {
          id: string
          user_id: string
          question_id: number
          order_num: number
        }
        Insert: {
          id?: string
          user_id: string
          question_id: number
          order_num: number
        }
        Update: {
          order_num?: number
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          recorded_at: string
          total_duration_sec: number | null
          avg_decibel: number | null
          max_decibel: number | null
          status: string
          selected_questions: Array<{ question_id: number; order: number }> | null
        }
        Insert: {
          id?: string
          user_id: string
          recorded_at?: string
          total_duration_sec?: number | null
          avg_decibel?: number | null
          max_decibel?: number | null
          status?: string
          selected_questions?: Array<{ question_id: number; order: number }> | null
        }
        Update: {
          total_duration_sec?: number | null
          avg_decibel?: number | null
          max_decibel?: number | null
          status?: string
          selected_questions?: Array<{ question_id: number; order: number }> | null
        }
        Relationships: []
      }
      recordings: {
        Row: {
          id: string
          session_id: string
          question_id: number
          question_order: number
          audio_url: string | null
          duration_sec: number | null
          max_decibel: number | null
          avg_decibel: number | null
          is_free_talk: boolean
          stt_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_id: number
          question_order: number
          audio_url?: string | null
          duration_sec?: number | null
          max_decibel?: number | null
          avg_decibel?: number | null
          is_free_talk?: boolean
          stt_text?: string | null
        }
        Update: {
          audio_url?: string | null
          duration_sec?: number | null
          max_decibel?: number | null
          avg_decibel?: number | null
          stt_text?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
