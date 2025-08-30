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
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bill_group_members: {
        Row: {
          group_id: string
          person_id: string
        }
        Insert: {
          group_id: string
          person_id: string
        }
        Update: {
          group_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "bill_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_group_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_groups: {
        Row: {
          bill_id: string
          id: string
          is_temporary: boolean
          name: string
        }
        Insert: {
          bill_id: string
          id?: string
          is_temporary?: boolean
          name: string
        }
        Update: {
          bill_id?: string
          id?: string
          is_temporary?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_groups_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          created_at: string
          currency: string
          date: string | null
          editor_token: string
          id: string
          include_zero_item_people: boolean
          ocr_json: Json | null
          place: string | null
          receipt_file_path: string | null
          sales_tax: number
          subtotal: number
          tax_split_method: string
          tip: number
          tip_split_method: string
          title: string
          trip_id: string | null
          viewer_token: string
        }
        Insert: {
          created_at?: string
          currency?: string
          date?: string | null
          editor_token?: string
          id?: string
          include_zero_item_people?: boolean
          ocr_json?: Json | null
          place?: string | null
          receipt_file_path?: string | null
          sales_tax?: number
          subtotal?: number
          tax_split_method?: string
          tip?: number
          tip_split_method?: string
          title: string
          trip_id?: string | null
          viewer_token?: string
        }
        Update: {
          created_at?: string
          currency?: string
          date?: string | null
          editor_token?: string
          id?: string
          include_zero_item_people?: boolean
          ocr_json?: Json | null
          place?: string | null
          receipt_file_path?: string | null
          sales_tax?: number
          subtotal?: number
          tax_split_method?: string
          tip?: number
          tip_split_method?: string
          title?: string
          trip_id?: string | null
          viewer_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_trip_fk"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      item_shares: {
        Row: {
          item_id: string
          person_id: string
          weight: number
        }
        Insert: {
          item_id: string
          person_id: string
          weight?: number
        }
        Update: {
          item_id?: string
          person_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_shares_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_shares_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          bill_id: string
          emoji: string | null
          id: string
          label: string
          price: number | null
          qty: number
          unit_price: number
        }
        Insert: {
          bill_id: string
          emoji?: string | null
          id?: string
          label: string
          price?: number | null
          qty?: number
          unit_price?: number
        }
        Update: {
          bill_id?: string
          emoji?: string | null
          id?: string
          label?: string
          price?: number | null
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          avatar_url: string | null
          bill_id: string
          id: string
          is_archived: boolean
          name: string
          venmo_handle: string | null
        }
        Insert: {
          avatar_url?: string | null
          bill_id: string
          id?: string
          is_archived?: boolean
          name: string
          venmo_handle?: string | null
        }
        Update: {
          avatar_url?: string | null
          bill_id?: string
          id?: string
          is_archived?: boolean
          name?: string
          venmo_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          id: string
          title: string
        }
        Insert: {
          id?: string
          title: string
        }
        Update: {
          id?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_item_with_editor_token: {
        Args: {
          bill_id: string
          emoji?: string
          etoken: string
          label: string
          qty?: number
          unit_price?: number
        }
        Returns: {
          bill_id: string
          emoji: string | null
          id: string
          label: string
          price: number | null
          qty: number
          unit_price: number
        }
      }
      add_person_with_editor_token: {
        Args: {
          avatar_url?: string
          bill_id: string
          etoken: string
          person_name: string
          venmo?: string
        }
        Returns: {
          avatar_url: string | null
          bill_id: string
          id: string
          is_archived: boolean
          name: string
          venmo_handle: string | null
        }
      }
      delete_item_with_editor_token: {
        Args: { etoken: string; item_id: string }
        Returns: boolean
      }
      delete_person_with_editor_token: {
        Args: { etoken: string; person_id: string }
        Returns: boolean
      }
      get_bill_by_token: {
        Args: { bill_token: string }
        Returns: {
          created_at: string
          currency: string
          date: string | null
          editor_token: string
          id: string
          include_zero_item_people: boolean
          ocr_json: Json | null
          place: string | null
          receipt_file_path: string | null
          sales_tax: number
          subtotal: number
          tax_split_method: string
          tip: number
          tip_split_method: string
          title: string
          trip_id: string | null
          viewer_token: string
        }[]
      }
      get_item_shares_by_token: {
        Args: { bill_token: string }
        Returns: {
          item_id: string
          person_id: string
          weight: number
        }[]
      }
      get_items_by_token: {
        Args: { bill_token: string }
        Returns: {
          bill_id: string
          emoji: string | null
          id: string
          label: string
          price: number | null
          qty: number
          unit_price: number
        }[]
      }
      get_people_by_token: {
        Args: { bill_token: string }
        Returns: {
          avatar_url: string | null
          bill_id: string
          id: string
          is_archived: boolean
          name: string
          venmo_handle: string | null
        }[]
      }
      list_bills: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          date: string
          id: string
          item_count: number
          people_count: number
          place: string
          title: string
          token: string
          total_amount: number
        }[]
      }
      normalize_handle: {
        Args: { h: string }
        Returns: string
      }
      update_bill_fields_with_editor_token: {
        Args: {
          bill_id: string
          etoken: string
          p_currency?: string
          p_date?: string
          p_include_zero?: boolean
          p_place?: string
          p_sales_tax?: number
          p_subtotal?: number
          p_tax_split_method?: string
          p_tip?: number
          p_tip_split_method?: string
          p_title?: string
        }
        Returns: {
          created_at: string
          currency: string
          date: string | null
          editor_token: string
          id: string
          include_zero_item_people: boolean
          ocr_json: Json | null
          place: string | null
          receipt_file_path: string | null
          sales_tax: number
          subtotal: number
          tax_split_method: string
          tip: number
          tip_split_method: string
          title: string
          trip_id: string | null
          viewer_token: string
        }
      }
      update_item_with_editor_token: {
        Args: {
          etoken: string
          item_id: string
          p_emoji?: string
          p_label?: string
          p_qty?: number
          p_unit_price?: number
        }
        Returns: {
          bill_id: string
          emoji: string | null
          id: string
          label: string
          price: number | null
          qty: number
          unit_price: number
        }
      }
      update_person_with_editor_token: {
        Args: {
          etoken: string
          p_avatar_url?: string
          p_name?: string
          p_venmo?: string
          person_id: string
        }
        Returns: {
          avatar_url: string | null
          bill_id: string
          id: string
          is_archived: boolean
          name: string
          venmo_handle: string | null
        }
      }
      upsert_item_share_with_editor_token: {
        Args: {
          etoken: string
          item_id: string
          person_id: string
          weight?: number
        }
        Returns: {
          item_id: string
          person_id: string
          weight: number
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
