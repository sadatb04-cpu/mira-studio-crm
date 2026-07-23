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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["activity_entity_type"]
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          customer_id: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          production_job_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          production_job_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          production_job_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          hire_date: string | null
          id: string
          position: string | null
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          hire_date?: string | null
          id: string
          position?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          hire_date?: string | null
          id?: string
          position?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string
          id: string
          is_active: boolean
          minimum_stock: number
          name: string
          quantity_on_hand: number
          sku: string
          storage_location_id: string | null
          subcategory: string | null
          supplier_id: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name: string
          quantity_on_hand?: number
          sku: string
          storage_location_id?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          unit: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name?: string
          quantity_on_hand?: number
          sku?: string
          storage_location_id?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: Database["public"]["Enums"]["inventory_reference_type"]
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["inventory_reference_type"]
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["inventory_reference_type"]
          transaction_type?: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          recipient_id: string
          related_entity_id: string | null
          related_entity_type:
            | Database["public"]["Enums"]["activity_entity_type"]
            | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          recipient_id: string
          related_entity_id?: string | null
          related_entity_type?:
            | Database["public"]["Enums"]["activity_entity_type"]
            | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          recipient_id?: string
          related_entity_id?: string | null
          related_entity_type?:
            | Database["public"]["Enums"]["activity_entity_type"]
            | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          order_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          order_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          order_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          inventory_item_id: string | null
          order_id: string
          quantity: number
          specifications: Json
          total_price: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          inventory_item_id?: string | null
          order_id: string
          quantity?: number
          specifications?: Json
          total_price?: number | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          inventory_item_id?: string | null
          order_id?: string
          quantity?: number
          specifications?: Json
          total_price?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_quotations: {
        Row: {
          cad_cost: number
          certification_cost: number
          created_at: string
          created_by: string | null
          discount: number
          grand_total: number | null
          hallmark_cost: number
          id: string
          labor_cost: number
          metal_cost: number
          notes: string | null
          order_id: string
          other_charges: number
          packaging_cost: number
          quote_name: string
          setting_cost: number
          shipping_cost: number
          status: Database["public"]["Enums"]["quotation_status"]
          stone_cost: number
          updated_at: string
        }
        Insert: {
          cad_cost?: number
          certification_cost?: number
          created_at?: string
          created_by?: string | null
          discount?: number
          grand_total?: number | null
          hallmark_cost?: number
          id?: string
          labor_cost?: number
          metal_cost?: number
          notes?: string | null
          order_id: string
          other_charges?: number
          packaging_cost?: number
          quote_name: string
          setting_cost?: number
          shipping_cost?: number
          status?: Database["public"]["Enums"]["quotation_status"]
          stone_cost?: number
          updated_at?: string
        }
        Update: {
          cad_cost?: number
          certification_cost?: number
          created_at?: string
          created_by?: string | null
          discount?: number
          grand_total?: number | null
          hallmark_cost?: number
          id?: string
          labor_cost?: number
          metal_cost?: number
          notes?: string | null
          order_id?: string
          other_charges?: number
          packaging_cost?: number
          quote_name?: string
          setting_cost?: number
          shipping_cost?: number
          status?: Database["public"]["Enums"]["quotation_status"]
          stone_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_quotations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_stones: {
        Row: {
          carat_weight: number
          clarity: string | null
          color: string | null
          created_at: string
          id: string
          mm_size: string
          notes: string | null
          order_id: string
          quantity: number
          shape: Database["public"]["Enums"]["stone_shape"]
          stone_type: Database["public"]["Enums"]["stone_type"]
        }
        Insert: {
          carat_weight: number
          clarity?: string | null
          color?: string | null
          created_at?: string
          id?: string
          mm_size: string
          notes?: string | null
          order_id: string
          quantity?: number
          shape: Database["public"]["Enums"]["stone_shape"]
          stone_type: Database["public"]["Enums"]["stone_type"]
        }
        Update: {
          carat_weight?: number
          clarity?: string | null
          color?: string | null
          created_at?: string
          id?: string
          mm_size?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          shape?: Database["public"]["Enums"]["stone_shape"]
          stone_type?: Database["public"]["Enums"]["stone_type"]
        }
        Relationships: [
          {
            foreignKeyName: "order_stones_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          due_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          shipping_cost: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          due_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      production_jobs: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          job_number: string
          notes: string | null
          order_item_id: string
          priority: Database["public"]["Enums"]["production_priority"]
          started_at: string | null
          status: Database["public"]["Enums"]["production_job_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_number: string
          notes?: string | null
          order_item_id: string
          priority?: Database["public"]["Enums"]["production_priority"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["production_job_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_number?: string
          notes?: string | null
          order_item_id?: string
          priority?: Database["public"]["Enums"]["production_priority"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["production_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_jobs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stages: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          production_job_id: string
          sequence: number
          stage_name: Database["public"]["Enums"]["production_stage_name"]
          started_at: string | null
          status: Database["public"]["Enums"]["production_stage_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          production_job_id: string
          sequence?: number
          stage_name: Database["public"]["Enums"]["production_stage_name"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["production_stage_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          production_job_id?: string
          sequence?: number
          stage_name?: Database["public"]["Enums"]["production_stage_name"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["production_stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stages_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stages_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact_person: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          supplier_name: string
          updated_at: string
        }
        Insert: {
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          supplier_name: string
          updated_at?: string
        }
        Update: {
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          supplier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          order_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          production_job_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          order_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          production_job_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          order_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          production_job_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      activity_entity_type:
        | "profile"
        | "employee"
        | "customer"
        | "order"
        | "order_item"
        | "production_job"
        | "production_stage"
        | "task"
        | "inventory_item"
        | "inventory_transaction"
        | "supplier"
        | "storage_location"
        | "document"
        | "notification"
        | "setting"
      department:
        | "Operations"
        | "Production"
        | "Sales"
        | "Inventory"
        | "Management"
      document_type:
        | "invoice"
        | "igi_certificate"
        | "cad_file"
        | "image"
        | "shipping_label"
        | "other"
      employment_status: "active" | "on_leave" | "terminated"
      inventory_category:
        | "gold"
        | "lab_diamond"
        | "natural_diamond"
        | "gemstone"
        | "finding"
        | "packaging"
        | "consumable"
        | "finished_jewelry"
      inventory_reference_type:
        | "order"
        | "production_job"
        | "purchase"
        | "adjustment"
        | "manual"
      inventory_transaction_type:
        | "purchase"
        | "allocation"
        | "production_use"
        | "adjustment"
        | "return"
        | "finished_goods"
        | "sale"
      notification_type:
        | "task_assigned"
        | "order_status_changed"
        | "production_stage_completed"
        | "low_stock"
        | "document_uploaded"
        | "system"
      order_status:
        | "draft"
        | "confirmed"
        | "in_production"
        | "ready_for_delivery"
        | "delivered"
        | "completed"
        | "cancelled"
      production_job_status:
        | "queued"
        | "in_progress"
        | "quality_check"
        | "rework"
        | "completed"
        | "on_hold"
        | "cancelled"
      production_priority: "low" | "normal" | "high" | "urgent"
      production_stage_name:
        | "design"
        | "wax_carving"
        | "casting"
        | "stone_setting"
        | "polishing"
        | "quality_check"
        | "engraving"
        | "packaging"
        | "shipping"
      production_stage_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "skipped"
      quotation_status: "draft" | "sent" | "accepted" | "rejected"
      stone_shape:
        | "round"
        | "oval"
        | "princess"
        | "cushion"
        | "emerald"
        | "pear"
        | "marquise"
        | "radiant"
        | "asscher"
        | "heart"
        | "trillion"
        | "baguette"
        | "old_mine"
        | "old_european"
        | "other"
      stone_type:
        | "lab_diamond"
        | "natural_diamond"
        | "emerald"
        | "ruby"
        | "sapphire"
        | "moissanite"
        | "pearl"
        | "other"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "blocked" | "done" | "cancelled"
      user_role:
        | "admin"
        | "operations_manager"
        | "production_manager"
        | "sales"
        | "employee"
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
  public: {
    Enums: {
      activity_entity_type: [
        "profile",
        "employee",
        "customer",
        "order",
        "order_item",
        "production_job",
        "production_stage",
        "task",
        "inventory_item",
        "inventory_transaction",
        "supplier",
        "storage_location",
        "document",
        "notification",
        "setting",
      ],
      department: [
        "Operations",
        "Production",
        "Sales",
        "Inventory",
        "Management",
      ],
      document_type: [
        "invoice",
        "igi_certificate",
        "cad_file",
        "image",
        "shipping_label",
        "other",
      ],
      employment_status: ["active", "on_leave", "terminated"],
      inventory_category: [
        "gold",
        "lab_diamond",
        "natural_diamond",
        "gemstone",
        "finding",
        "packaging",
        "consumable",
        "finished_jewelry",
      ],
      inventory_reference_type: [
        "order",
        "production_job",
        "purchase",
        "adjustment",
        "manual",
      ],
      inventory_transaction_type: [
        "purchase",
        "allocation",
        "production_use",
        "adjustment",
        "return",
        "finished_goods",
        "sale",
      ],
      notification_type: [
        "task_assigned",
        "order_status_changed",
        "production_stage_completed",
        "low_stock",
        "document_uploaded",
        "system",
      ],
      order_status: [
        "draft",
        "confirmed",
        "in_production",
        "ready_for_delivery",
        "delivered",
        "completed",
        "cancelled",
      ],
      production_job_status: [
        "queued",
        "in_progress",
        "quality_check",
        "rework",
        "completed",
        "on_hold",
        "cancelled",
      ],
      production_priority: ["low", "normal", "high", "urgent"],
      production_stage_name: [
        "design",
        "wax_carving",
        "casting",
        "stone_setting",
        "polishing",
        "quality_check",
        "engraving",
        "packaging",
        "shipping",
      ],
      production_stage_status: [
        "pending",
        "in_progress",
        "completed",
        "skipped",
      ],
      quotation_status: ["draft", "sent", "accepted", "rejected"],
      stone_shape: [
        "round",
        "oval",
        "princess",
        "cushion",
        "emerald",
        "pear",
        "marquise",
        "radiant",
        "asscher",
        "heart",
        "trillion",
        "baguette",
        "old_mine",
        "old_european",
        "other",
      ],
      stone_type: [
        "lab_diamond",
        "natural_diamond",
        "emerald",
        "ruby",
        "sapphire",
        "moissanite",
        "pearl",
        "other",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
      user_role: [
        "admin",
        "operations_manager",
        "production_manager",
        "sales",
        "employee",
      ],
    },
  },
} as const
