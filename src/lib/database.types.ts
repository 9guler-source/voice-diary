// voice_diary 스키마 타입 정의
// 주의: supabase-js v2는 Database 타입에 interface가 아닌 type 별칭을 요구하며
// __InternalSupabase, Relationships, Views, Functions 필드가 필요합니다.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  voice_diary: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      guardians: {
        Row: {
          id: string;
          user_id: string;
          guardian_email: string;
          guardian_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          guardian_email: string;
          guardian_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          guardian_email?: string;
          guardian_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: number;
          category: string;
          question_text: string;
          tts_text: string;
          starter_text: string;
          is_free_talk: boolean;
          display_order: number;
        };
        Insert: {
          id?: number;
          category: string;
          question_text: string;
          tts_text: string;
          starter_text: string;
          is_free_talk?: boolean;
          display_order: number;
        };
        Update: Partial<Database["voice_diary"]["Tables"]["questions"]["Insert"]>;
        Relationships: [];
      };
      user_questions: {
        Row: { id: string; user_id: string; question_id: number; created_at: string };
        Insert: { id?: string; user_id: string; question_id: number; created_at?: string };
        Update: { id?: string; user_id?: string; question_id?: number; created_at?: string };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          selected_questions: Json;
          recorded_at: string;
          title: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          selected_questions: Json;
          recorded_at?: string;
          title?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          selected_questions?: Json;
          recorded_at?: string;
          title?: string | null;
        };
        Relationships: [];
      };
      recordings: {
        Row: {
          id: string;
          session_id: string;
          question_id: number;
          question_text: string;
          file_path: string;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: number;
          question_text: string;
          file_path: string;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["voice_diary"]["Tables"]["recordings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
  };
};
