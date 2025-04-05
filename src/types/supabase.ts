export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ai_models: {
        Row: {
          id: string
          name: string
          provider: string
          model_name: string
          api_key: string
          base_url: string | null
          is_default: boolean
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          provider: string
          model_name: string
          api_key: string
          base_url?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          provider?: string
          model_name?: string
          api_key?: string
          base_url?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          ai_model: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ai_model: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ai_model?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_ai_model_fkey"
            columns: ["ai_model"]
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      zotero_credentials: {
        Row: {
          id: string
          user_id: string
          api_key: string
          zotero_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          api_key: string
          zotero_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          api_key?: string
          zotero_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      searches: {
        Row: {
          id: string
          query: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          id?: string
          query: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          query?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "searches_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      papers: {
        Row: {
          id: string
          name: string
          author: string
          year: number | null
          abstract: string | null
          doi: string | null
          search_id: string
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          author: string
          year?: number | null
          abstract?: string | null
          doi?: string | null
          search_id: string
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          author?: string
          year?: number | null
          abstract?: string | null
          doi?: string | null
          search_id?: string
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "papers_search_id_fkey"
            columns: ["search_id"]
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pdf_uploads: {
        Row: {
          id: string
          filename: string
          title: string | null
          authors: string | null
          year: number | null
          doi: string | null
          background: string | null
          full_text: string | null
          markdown_content: string | null
          research_question: string | null
          major_findings: string | null
          suggestions: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          filename: string
          title?: string | null
          authors?: string | null
          year?: number | null
          doi?: string | null
          background?: string | null
          full_text?: string | null
          markdown_content?: string | null
          research_question?: string | null
          major_findings?: string | null
          suggestions?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          filename?: string
          title?: string | null
          authors?: string | null
          year?: number | null
          doi?: string | null
          background?: string | null
          full_text?: string | null
          markdown_content?: string | null
          research_question?: string | null
          major_findings?: string | null
          suggestions?: string | null
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_uploads_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pdf_batches: {
        Row: {
          id: string
          name: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_batches_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      batch_pdfs: {
        Row: {
          id: string
          batch_id: string
          pdf_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          pdf_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          pdf_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_pdfs_batch_id_fkey"
            columns: ["batch_id"]
            referencedRelation: "pdf_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_pdfs_pdf_id_fkey"
            columns: ["pdf_id"]
            referencedRelation: "pdf_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_pdfs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 