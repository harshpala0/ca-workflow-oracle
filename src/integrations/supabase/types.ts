export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          firm_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          firm_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          firm_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          entity_type: string | null
          firm_id: string
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          pan: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          entity_type?: string | null
          firm_id: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          pan?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          entity_type?: string | null
          firm_id?: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          category: string
          client_id: string | null
          created_at: string
          due_date: string
          filed_on: string | null
          financial_year: string | null
          firm_id: string
          id: string
          remarks: string | null
          status: string
          title: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          created_at?: string
          due_date: string
          filed_on?: string | null
          financial_year?: string | null
          firm_id: string
          id?: string
          remarks?: string | null
          status?: string
          title: string
        }
        Update: {
          category?: string
          client_id?: string | null
          created_at?: string
          due_date?: string
          filed_on?: string | null
          financial_year?: string | null
          firm_id?: string
          id?: string
          remarks?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_register: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          doc_category: string | null
          doc_date: string
          doc_name: string
          doc_type: string
          firm_id: string
          id: string
          party: string | null
          reference_no: string | null
          remarks: string | null
          status: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_category?: string | null
          doc_date?: string
          doc_name: string
          doc_type: string
          firm_id: string
          id?: string
          party?: string | null
          reference_no?: string | null
          remarks?: string | null
          status?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_category?: string | null
          doc_date?: string
          doc_name?: string
          doc_type?: string
          firm_id?: string
          id?: string
          party?: string | null
          reference_no?: string | null
          remarks?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_register_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_register_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_requests: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          firm_id: string
          id: string
          status: string
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          firm_id: string
          id?: string
          status?: string
          title: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_requests_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          engagement_type: string
          financial_year: string
          firm_id: string
          id: string
          notes: string | null
          period_from: string | null
          period_to: string | null
          status: string
          team_leader_id: string | null
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          engagement_type?: string
          financial_year?: string
          firm_id: string
          id?: string
          notes?: string | null
          period_from?: string | null
          period_to?: string | null
          status?: string
          team_leader_id?: string | null
          title: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          engagement_type?: string
          financial_year?: string
          firm_id?: string
          id?: string
          notes?: string | null
          period_from?: string | null
          period_to?: string | null
          status?: string
          team_leader_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          id: string
          name: string
          reg_no: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          reg_no?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          reg_no?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          amount_received: number
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          engagement_id: string | null
          firm_id: string
          gst_amount: number | null
          gst_percent: number
          id: string
          invoice_date: string
          invoice_no: string
          payment_date: string | null
          payment_status: string
          total_amount: number | null
        }
        Insert: {
          amount?: number
          amount_received?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          engagement_id?: string | null
          firm_id: string
          gst_amount?: number | null
          gst_percent?: number
          id?: string
          invoice_date?: string
          invoice_no: string
          payment_date?: string | null
          payment_status?: string
          total_amount?: number | null
        }
        Update: {
          amount?: number
          amount_received?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          engagement_id?: string | null
          firm_id?: string
          gst_amount?: number | null
          gst_percent?: number
          id?: string
          invoice_date?: string
          invoice_no?: string
          payment_date?: string | null
          payment_status?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          firm_id: string
          id: string
          request_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          firm_id: string
          id?: string
          request_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          firm_id?: string
          id?: string
          request_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_files_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_files_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "doc_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string | null
          firm_id: string | null
          full_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          full_name?: string
          id: string
          is_active?: boolean
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      queries: {
        Row: {
          created_at: string
          engagement_id: string
          firm_id: string
          id: string
          query_text: string
          raised_by: string | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          status: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          firm_id: string
          id?: string
          query_text: string
          raised_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          firm_id?: string
          id?: string
          query_text?: string
          raised_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          area: string | null
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          engagement_id: string | null
          estimated_hours: number | null
          firm_id: string
          id: string
          priority: string
          status: string
          title: string
        }
        Insert: {
          area?: string | null
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          engagement_id?: string | null
          estimated_hours?: number | null
          firm_id: string
          id?: string
          priority?: string
          status?: string
          title: string
        }
        Update: {
          area?: string | null
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          engagement_id?: string | null
          estimated_hours?: number | null
          firm_id?: string
          id?: string
          priority?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string
          firm_id: string
          hours: number
          id: string
          log_date: string
          note: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          hours: number
          id?: string
          log_date?: string
          note?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          hours?: number
          id?: string
          log_date?: string
          note?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_firm_manager: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      my_client_id: { Args: never; Returns: string }
      my_firm_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "team_leader" | "member" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "team_leader", "member", "client"],
    },
  },
} as const
