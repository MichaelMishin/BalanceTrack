export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          household_id: string | null
          icon: string | null
          id: string
          is_hidden: boolean
          is_system: boolean
          name: string
          name_key: string | null
          sort_order: number
          type: Database["public"]["Enums"]["category_type"]
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          icon?: string | null
          id?: string
          is_hidden?: boolean
          is_system?: boolean
          name: string
          name_key?: string | null
          sort_order?: number
          type: Database["public"]["Enums"]["category_type"]
        }
        Update: {
          created_at?: string
          household_id?: string | null
          icon?: string | null
          id?: string
          is_hidden?: boolean
          is_system?: boolean
          name?: string
          name_key?: string | null
          sort_order?: number
          type?: Database["public"]["Enums"]["category_type"]
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          fetched_at: string
          id: string
          rate: number
          rate_date: string
          target_currency: string
        }
        Insert: {
          base_currency: string
          fetched_at?: string
          id?: string
          rate: number
          rate_date: string
          target_currency: string
        }
        Update: {
          base_currency?: string
          fetched_at?: string
          id?: string
          rate?: number
          rate_date?: string
          target_currency?: string
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          created_at: string
          currency: string
          household_id: string
          id: string
          is_primary_checking: boolean
          name: string
          owner_id: string
          type: Database["public"]["Enums"]["account_type"]
        }
        Insert: {
          created_at?: string
          currency?: string
          household_id: string
          id?: string
          is_primary_checking?: boolean
          name: string
          owner_id: string
          type?: Database["public"]["Enums"]["account_type"]
        }
        Update: {
          created_at?: string
          currency?: string
          household_id?: string
          id?: string
          is_primary_checking?: boolean
          name?: string
          owner_id?: string
          type?: Database["public"]["Enums"]["account_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          profile_id: string
          role: Database["public"]["Enums"]["household_role"]
        }
        Insert: {
          household_id: string
          joined_at?: string
          profile_id: string
          role?: Database["public"]["Enums"]["household_role"]
        }
        Update: {
          household_id?: string
          joined_at?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["household_role"]
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          default_currency: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      period_snapshots: {
        Row: {
          created_at: string
          cumulative_savings: number
          currency: string
          household_id: string
          id: string
          net_savings: number
          period_end: string
          period_start: string
          timeframe: Database["public"]["Enums"]["timeframe_type"]
          total_expenses: number
          total_income: number
        }
        Insert: {
          created_at?: string
          cumulative_savings?: number
          currency: string
          household_id: string
          id?: string
          net_savings?: number
          period_end: string
          period_start: string
          timeframe: Database["public"]["Enums"]["timeframe_type"]
          total_expenses?: number
          total_income?: number
        }
        Update: {
          created_at?: string
          cumulative_savings?: number
          currency?: string
          household_id?: string
          id?: string
          net_savings?: number
          period_end?: string
          period_start?: string
          timeframe?: Database["public"]["Enums"]["timeframe_type"]
          total_expenses?: number
          total_income?: number
        }
        Relationships: [
          {
            foreignKeyName: "period_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          locale: string
          preferred_currency: string
          preferred_timeframe: Database["public"]["Enums"]["timeframe_type"]
          savings_target_pct: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          preferred_currency?: string
          preferred_timeframe?: Database["public"]["Enums"]["timeframe_type"]
          savings_target_pct?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          preferred_currency?: string
          preferred_timeframe?: Database["public"]["Enums"]["timeframe_type"]
          savings_target_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          currency: string
          description: string | null
          financial_account_id: string | null
          frequency: Database["public"]["Enums"]["timeframe_type"]
          household_id: string
          id: string
          is_active: boolean
          is_estimated: boolean
          next_due_date: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          currency: string
          description?: string | null
          financial_account_id?: string | null
          frequency: Database["public"]["Enums"]["timeframe_type"]
          household_id: string
          id?: string
          is_active?: boolean
          is_estimated?: boolean
          next_due_date: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          financial_account_id?: string | null
          frequency?: Database["public"]["Enums"]["timeframe_type"]
          household_id?: string
          id?: string
          is_active?: boolean
          is_estimated?: boolean
          next_due_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string
          converted_amount: number | null
          created_at: string
          currency: string
          description: string | null
          entered_by: string
          exchange_rate: number | null
          financial_account_id: string | null
          household_id: string
          id: string
          is_manual: boolean
          is_recurring: boolean
          source: Database["public"]["Enums"]["transaction_source"]
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          converted_amount?: number | null
          created_at?: string
          currency: string
          description?: string | null
          entered_by: string
          exchange_rate?: number | null
          financial_account_id?: string | null
          household_id: string
          id?: string
          is_manual?: boolean
          is_recurring?: boolean
          source?: Database["public"]["Enums"]["transaction_source"]
          transaction_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          converted_amount?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          entered_by?: string
          exchange_rate?: number | null
          financial_account_id?: string | null
          household_id?: string
          id?: string
          is_manual?: boolean
          is_recurring?: boolean
          source?: Database["public"]["Enums"]["transaction_source"]
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_household_member: { Args: { hh_id: string }; Returns: boolean }
    }
    Enums: {
      account_type: "checking" | "savings" | "credit_card" | "other"
      category_type: "income" | "expense"
      household_role: "owner" | "member"
      timeframe_type: "weekly" | "biweekly" | "monthly"
      transaction_source: "manual" | "bank_import" | "estimated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type TimeFrame = Database["public"]["Enums"]["timeframe_type"]
export type TransactionSource = Database["public"]["Enums"]["transaction_source"]
export type AccountType = Database["public"]["Enums"]["account_type"]
export type CategoryType = Database["public"]["Enums"]["category_type"]
export type HouseholdRole = Database["public"]["Enums"]["household_role"]

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]
export type Household = Database["public"]["Tables"]["households"]["Row"]
export type HouseholdMember = Database["public"]["Tables"]["household_members"]["Row"]
export type FinancialAccount = Database["public"]["Tables"]["financial_accounts"]["Row"]
export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"]
export type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"]
export type RecurringTransaction = Database["public"]["Tables"]["recurring_transactions"]["Row"]
export type ExchangeRate = Database["public"]["Tables"]["exchange_rates"]["Row"]
export type PeriodSnapshot = Database["public"]["Tables"]["period_snapshots"]["Row"]
