export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      abandonment_policies: {
        Row: {
          attendance_percentage_threshold: number;
          consecutive_absences_threshold: number;
          created_at: string;
          id: string;
          instructor_membership_id: string;
          lookback_days: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          attendance_percentage_threshold?: number;
          consecutive_absences_threshold?: number;
          created_at?: string;
          id?: string;
          instructor_membership_id: string;
          lookback_days?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          attendance_percentage_threshold?: number;
          consecutive_absences_threshold?: number;
          created_at?: string;
          id?: string;
          instructor_membership_id?: string;
          lookback_days?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "abandonment_policies_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "abandonment_policies_tenant_id_instructor_membership_id_fkey";
            columns: ["tenant_id", "instructor_membership_id"];
            isOneToOne: true;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      activity_events: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id: string;
          message: string;
          metadata: Json;
          occurred_at: string;
          operation_id: string;
          origin: string;
          severity: string;
          tenant_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id?: string;
          message: string;
          metadata?: Json;
          occurred_at: string;
          operation_id: string;
          origin: string;
          severity: string;
          tenant_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          event_type?: string;
          id?: string;
          message?: string;
          metadata?: Json;
          occurred_at?: string;
          operation_id?: string;
          origin?: string;
          severity?: string;
          tenant_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_notifications: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          read_at: string | null;
          recipient_role: string;
          recipient_user_id: string;
          resolved_at: string | null;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          read_at?: string | null;
          recipient_role: string;
          recipient_user_id: string;
          resolved_at?: string | null;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          read_at?: string | null;
          recipient_role?: string;
          recipient_user_id?: string;
          resolved_at?: string | null;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_notifications_tenant_id_event_id_fkey";
            columns: ["tenant_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "activity_events";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "activity_notifications_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_notifications_tenant_id_recipient_user_id_fkey";
            columns: ["tenant_id", "recipient_user_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      assistant_instructor_assignments: {
        Row: {
          assistant_membership_id: string;
          created_at: string;
          id: string;
          instructor_membership_id: string;
          status: string;
          tenant_id: string;
        };
        Insert: {
          assistant_membership_id: string;
          created_at?: string;
          id?: string;
          instructor_membership_id: string;
          status?: string;
          tenant_id: string;
        };
        Update: {
          assistant_membership_id?: string;
          created_at?: string;
          id?: string;
          instructor_membership_id?: string;
          status?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_instructor_assignme_tenant_id_assistant_membersh_fkey";
            columns: ["tenant_id", "assistant_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "assistant_instructor_assignme_tenant_id_instructor_members_fkey";
            columns: ["tenant_id", "instructor_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "assistant_instructor_assignments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: Json;
          occurred_at: string;
          tenant_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          tenant_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      class_schedules: {
        Row: {
          allow_conflict: boolean;
          class_template_id: string;
          created_at: string;
          day_of_week: number;
          ends_at: string;
          id: string;
          instructor_membership_id: string;
          location_id: string;
          starts_at: string;
          status: string;
          tenant_id: string;
          timezone: string;
        };
        Insert: {
          allow_conflict?: boolean;
          class_template_id: string;
          created_at?: string;
          day_of_week: number;
          ends_at: string;
          id?: string;
          instructor_membership_id: string;
          location_id: string;
          starts_at: string;
          status?: string;
          tenant_id: string;
          timezone: string;
        };
        Update: {
          allow_conflict?: boolean;
          class_template_id?: string;
          created_at?: string;
          day_of_week?: number;
          ends_at?: string;
          id?: string;
          instructor_membership_id?: string;
          location_id?: string;
          starts_at?: string;
          status?: string;
          tenant_id?: string;
          timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_schedules_tenant_id_class_template_id_fkey";
            columns: ["tenant_id", "class_template_id"];
            isOneToOne: false;
            referencedRelation: "class_templates";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "class_schedules_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_schedules_tenant_id_instructor_membership_id_fkey";
            columns: ["tenant_id", "instructor_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "class_schedules_tenant_id_location_id_fkey";
            columns: ["tenant_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      class_session_attendance: {
        Row: {
          id: string;
          note: string | null;
          operation_id: string | null;
          recorded_at: string;
          recorded_by_membership_id: string;
          session_id: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          id?: string;
          note?: string | null;
          operation_id?: string | null;
          recorded_at?: string;
          recorded_by_membership_id: string;
          session_id: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          id?: string;
          note?: string | null;
          operation_id?: string | null;
          recorded_at?: string;
          recorded_by_membership_id?: string;
          session_id?: string;
          status?: string;
          student_id?: string;
          tenant_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "class_session_attendance_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_session_attendance_tenant_id_recorded_by_membership__fkey";
            columns: ["tenant_id", "recorded_by_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "class_session_attendance_tenant_id_session_id_fkey";
            columns: ["tenant_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "class_session_attendance_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      class_sessions: {
        Row: {
          capacity: number;
          class_schedule_id: string;
          class_template_id: string;
          created_at: string;
          ends_at: string;
          id: string;
          instructor_membership_id: string;
          location_id: string;
          starts_at: string;
          status: string;
          tenant_id: string;
          timezone: string;
          updated_at: string;
          waitlist_enabled: boolean;
        };
        Insert: {
          capacity: number;
          class_schedule_id: string;
          class_template_id: string;
          created_at?: string;
          ends_at: string;
          id?: string;
          instructor_membership_id: string;
          location_id: string;
          starts_at: string;
          status?: string;
          tenant_id: string;
          timezone: string;
          updated_at?: string;
          waitlist_enabled?: boolean;
        };
        Update: {
          capacity?: number;
          class_schedule_id?: string;
          class_template_id?: string;
          created_at?: string;
          ends_at?: string;
          id?: string;
          instructor_membership_id?: string;
          location_id?: string;
          starts_at?: string;
          status?: string;
          tenant_id?: string;
          timezone?: string;
          updated_at?: string;
          waitlist_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "class_sessions_tenant_id_class_schedule_id_fkey";
            columns: ["tenant_id", "class_schedule_id"];
            isOneToOne: false;
            referencedRelation: "class_schedules";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "class_sessions_tenant_id_class_template_id_fkey";
            columns: ["tenant_id", "class_template_id"];
            isOneToOne: false;
            referencedRelation: "class_templates";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "class_sessions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_sessions_tenant_id_instructor_membership_id_fkey";
            columns: ["tenant_id", "instructor_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "class_sessions_tenant_id_location_id_fkey";
            columns: ["tenant_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      class_templates: {
        Row: {
          capacity: number;
          created_at: string;
          discipline_id: string;
          id: string;
          name: string;
          status: string;
          tenant_id: string;
        };
        Insert: {
          capacity: number;
          created_at?: string;
          discipline_id: string;
          id?: string;
          name: string;
          status?: string;
          tenant_id: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          discipline_id?: string;
          id?: string;
          name?: string;
          status?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_templates_tenant_id_discipline_id_fkey";
            columns: ["tenant_id", "discipline_id"];
            isOneToOne: false;
            referencedRelation: "disciplines";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "class_templates_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      disciplines: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          status: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          status?: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          status?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disciplines_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      health_conditions: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          resolved_at: string | null;
          source: string;
          started_on: string | null;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          resolved_at?: string | null;
          source: string;
          started_on?: string | null;
          status?: string;
          student_id: string;
          tenant_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          resolved_at?: string | null;
          source?: string;
          started_on?: string | null;
          status?: string;
          student_id?: string;
          tenant_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "health_conditions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "health_conditions_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      health_consent_events: {
        Row: {
          created_at: string;
          decision: string;
          declared_by_membership_id: string;
          event_sequence: number;
          id: string;
          occurred_at: string;
          operation_id: string;
          policy_version: string;
          student_id: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          decision: string;
          declared_by_membership_id: string;
          event_sequence?: never;
          id?: string;
          occurred_at?: string;
          operation_id: string;
          policy_version: string;
          student_id: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          decision?: string;
          declared_by_membership_id?: string;
          event_sequence?: never;
          id?: string;
          occurred_at?: string;
          operation_id?: string;
          policy_version?: string;
          student_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "health_consent_events_tenant_id_declared_by_membership_id_fkey";
            columns: ["tenant_id", "declared_by_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "health_consent_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "health_consent_events_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      health_restrictions: {
        Row: {
          condition_id: string | null;
          created_at: string;
          description: string;
          ends_on: string | null;
          id: string;
          injury_id: string | null;
          operational_action: string;
          resolved_at: string | null;
          severity: string;
          source: string;
          starts_on: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          condition_id?: string | null;
          created_at?: string;
          description: string;
          ends_on?: string | null;
          id?: string;
          injury_id?: string | null;
          operational_action: string;
          resolved_at?: string | null;
          severity: string;
          source: string;
          starts_on: string;
          status?: string;
          student_id: string;
          tenant_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          condition_id?: string | null;
          created_at?: string;
          description?: string;
          ends_on?: string | null;
          id?: string;
          injury_id?: string | null;
          operational_action?: string;
          resolved_at?: string | null;
          severity?: string;
          source?: string;
          starts_on?: string;
          status?: string;
          student_id?: string;
          tenant_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "health_restrictions_tenant_id_condition_id_fkey";
            columns: ["tenant_id", "condition_id"];
            isOneToOne: false;
            referencedRelation: "health_conditions";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "health_restrictions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "health_restrictions_tenant_id_injury_id_fkey";
            columns: ["tenant_id", "injury_id"];
            isOneToOne: false;
            referencedRelation: "injuries";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "health_restrictions_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      injuries: {
        Row: {
          body_area: string | null;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          occurred_on: string | null;
          pain_level: number | null;
          resolved_at: string | null;
          source: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          body_area?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          occurred_on?: string | null;
          pain_level?: number | null;
          resolved_at?: string | null;
          source: string;
          status?: string;
          student_id: string;
          tenant_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          body_area?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          occurred_on?: string | null;
          pain_level?: number | null;
          resolved_at?: string | null;
          source?: string;
          status?: string;
          student_id?: string;
          tenant_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "injuries_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "injuries_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      instructor_financial_events: {
        Row: {
          actor_membership_id: string;
          amount: number | null;
          currency: string | null;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id: string;
          metadata: Json;
          occurred_at: string;
          operation_id: string;
          tenant_id: string;
        };
        Insert: {
          actor_membership_id: string;
          amount?: number | null;
          currency?: string | null;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          operation_id: string;
          tenant_id: string;
        };
        Update: {
          actor_membership_id?: string;
          amount?: number | null;
          currency?: string | null;
          entity_id?: string;
          entity_type?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          operation_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instructor_financial_events_tenant_id_actor_membership_id_fkey";
            columns: ["tenant_id", "actor_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "instructor_financial_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          name: string;
          status: string;
          tenant_id: string;
          type: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          status?: string;
          tenant_id: string;
          type?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          status?: string;
          tenant_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_plans: {
        Row: {
          benefits: Json;
          billing_cycle: string;
          created_at: string;
          currency: string;
          duration_days: number;
          expiration_grace_days: number;
          id: string;
          name: string;
          price: number;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          benefits?: Json;
          billing_cycle?: string;
          created_at?: string;
          currency?: string;
          duration_days: number;
          expiration_grace_days?: number;
          id?: string;
          name: string;
          price: number;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          benefits?: Json;
          billing_cycle?: string;
          created_at?: string;
          currency?: string;
          duration_days?: number;
          expiration_grace_days?: number;
          id?: string;
          name?: string;
          price?: number;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membership_plans_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      metric_definitions: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          name: string;
          slug: string;
          status: string;
          tenant_id: string;
          unit: string | null;
          updated_at: string;
          validation_rules: Json;
          value_type: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          status?: string;
          tenant_id: string;
          unit?: string | null;
          updated_at?: string;
          validation_rules?: Json;
          value_type: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          status?: string;
          tenant_id?: string;
          unit?: string | null;
          updated_at?: string;
          validation_rules?: Json;
          value_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "metric_definitions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      metric_evaluations: {
        Row: {
          author_membership_id: string;
          created_at: string;
          evaluated_at: string;
          id: string;
          notes: string | null;
          student_id: string;
          tenant_id: string;
          values: Json;
        };
        Insert: {
          author_membership_id: string;
          created_at?: string;
          evaluated_at?: string;
          id?: string;
          notes?: string | null;
          student_id: string;
          tenant_id: string;
          values: Json;
        };
        Update: {
          author_membership_id?: string;
          created_at?: string;
          evaluated_at?: string;
          id?: string;
          notes?: string | null;
          student_id?: string;
          tenant_id?: string;
          values?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "metric_evaluations_tenant_id_author_membership_id_fkey";
            columns: ["tenant_id", "author_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "metric_evaluations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "metric_evaluations_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          activity_notification_id: string;
          attempt_count: number;
          channel: string;
          created_at: string;
          delivered_at: string | null;
          id: string;
          last_error_code: string | null;
          max_attempts: number;
          next_attempt_at: string | null;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          activity_notification_id: string;
          attempt_count?: number;
          channel: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          last_error_code?: string | null;
          max_attempts?: number;
          next_attempt_at?: string | null;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          activity_notification_id?: string;
          attempt_count?: number;
          channel?: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          last_error_code?: string | null;
          max_attempts?: number;
          next_attempt_at?: string | null;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_tenant_id_activity_notification_id_fkey";
            columns: ["tenant_id", "activity_notification_id"];
            isOneToOne: false;
            referencedRelation: "activity_notifications";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "notification_deliveries_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_delivery_attempts: {
        Row: {
          attempt_number: number;
          attempted_at: string;
          completed_at: string | null;
          delivery_id: string;
          error_code: string | null;
          id: string;
          provider_reference: string | null;
          status: string;
          tenant_id: string;
        };
        Insert: {
          attempt_number: number;
          attempted_at?: string;
          completed_at?: string | null;
          delivery_id: string;
          error_code?: string | null;
          id?: string;
          provider_reference?: string | null;
          status: string;
          tenant_id: string;
        };
        Update: {
          attempt_number?: number;
          attempted_at?: string;
          completed_at?: string | null;
          delivery_id?: string;
          error_code?: string | null;
          id?: string;
          provider_reference?: string | null;
          status?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_delivery_attempts_tenant_id_delivery_id_fkey";
            columns: ["tenant_id", "delivery_id"];
            isOneToOne: false;
            referencedRelation: "notification_deliveries";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "notification_delivery_attempts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          channel: string;
          created_at: string;
          enabled: boolean;
          event_type: string;
          id: string;
          tenant_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          channel: string;
          created_at?: string;
          enabled?: boolean;
          event_type: string;
          id?: string;
          tenant_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          channel?: string;
          created_at?: string;
          enabled?: boolean;
          event_type?: string;
          id?: string;
          tenant_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_preferences_tenant_id_user_id_fkey";
            columns: ["tenant_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "user_id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      saas_charges: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          external_charge_id: string | null;
          failure_code: string | null;
          failure_message: string | null;
          id: string;
          invoice_id: string;
          occurred_at: string;
          operation_id: string;
          provider: string | null;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency: string;
          external_charge_id?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          invoice_id: string;
          occurred_at?: string;
          operation_id: string;
          provider?: string | null;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          external_charge_id?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          invoice_id?: string;
          occurred_at?: string;
          operation_id?: string;
          provider?: string | null;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_charges_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_charges_tenant_id_invoice_id_fkey";
            columns: ["tenant_id", "invoice_id"];
            isOneToOne: false;
            referencedRelation: "saas_invoices";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      saas_invoices: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          due_on: string | null;
          external_invoice_id: string | null;
          id: string;
          invoice_number: string;
          issued_at: string | null;
          paid_at: string | null;
          payment_provider: string | null;
          period_ends_on: string;
          period_starts_on: string;
          status: string;
          subscription_id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency: string;
          due_on?: string | null;
          external_invoice_id?: string | null;
          id?: string;
          invoice_number: string;
          issued_at?: string | null;
          paid_at?: string | null;
          payment_provider?: string | null;
          period_ends_on: string;
          period_starts_on: string;
          status?: string;
          subscription_id: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          due_on?: string | null;
          external_invoice_id?: string | null;
          id?: string;
          invoice_number?: string;
          issued_at?: string | null;
          paid_at?: string | null;
          payment_provider?: string | null;
          period_ends_on?: string;
          period_starts_on?: string;
          status?: string;
          subscription_id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_invoices_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_invoices_tenant_id_subscription_id_fkey";
            columns: ["tenant_id", "subscription_id"];
            isOneToOne: false;
            referencedRelation: "saas_subscriptions";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      saas_limits: {
        Row: {
          created_at: string;
          effective_from: string;
          effective_until: string | null;
          features: Json;
          id: string;
          max_students: number;
          max_users: number;
          plan_id: string;
          subscription_id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          effective_from: string;
          effective_until?: string | null;
          features?: Json;
          id?: string;
          max_students: number;
          max_users: number;
          plan_id: string;
          subscription_id: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          effective_until?: string | null;
          features?: Json;
          id?: string;
          max_students?: number;
          max_users?: number;
          plan_id?: string;
          subscription_id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_limits_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "saas_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_limits_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_limits_tenant_id_subscription_id_fkey";
            columns: ["tenant_id", "subscription_id"];
            isOneToOne: false;
            referencedRelation: "saas_subscriptions";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      saas_plans: {
        Row: {
          billing_cycle: string;
          created_at: string;
          currency: string;
          description: string | null;
          features: Json;
          id: string;
          max_students: number;
          max_users: number;
          name: string;
          price: number;
          slug: string;
          status: string;
          trial_days: number;
          updated_at: string;
        };
        Insert: {
          billing_cycle: string;
          created_at?: string;
          currency: string;
          description?: string | null;
          features?: Json;
          id?: string;
          max_students: number;
          max_users: number;
          name: string;
          price: number;
          slug: string;
          status?: string;
          trial_days?: number;
          updated_at?: string;
        };
        Update: {
          billing_cycle?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          features?: Json;
          id?: string;
          max_students?: number;
          max_users?: number;
          name?: string;
          price?: number;
          slug?: string;
          status?: string;
          trial_days?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      saas_privileged_audit_log: {
        Row: {
          action: string;
          actor_user_id: string;
          id: string;
          metadata: Json;
          occurred_at: string;
          reason: string;
          result: string;
          tenant_id: string | null;
        };
        Insert: {
          action: string;
          actor_user_id: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          reason: string;
          result: string;
          tenant_id?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          reason?: string;
          result?: string;
          tenant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "saas_privileged_audit_log_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      saas_provider_events: {
        Row: {
          charge_id: string | null;
          event_type: string;
          external_event_id: string;
          id: string;
          metadata: Json;
          occurred_at: string;
          processed_at: string;
          provider: string;
          refund_id: string | null;
          subscription_id: string;
          tenant_id: string;
        };
        Insert: {
          charge_id?: string | null;
          event_type: string;
          external_event_id: string;
          id?: string;
          metadata?: Json;
          occurred_at: string;
          processed_at?: string;
          provider: string;
          refund_id?: string | null;
          subscription_id: string;
          tenant_id: string;
        };
        Update: {
          charge_id?: string | null;
          event_type?: string;
          external_event_id?: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          processed_at?: string;
          provider?: string;
          refund_id?: string | null;
          subscription_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_provider_events_charge_id_fkey";
            columns: ["charge_id"];
            isOneToOne: false;
            referencedRelation: "saas_charges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_provider_events_refund_id_fkey";
            columns: ["refund_id"];
            isOneToOne: false;
            referencedRelation: "saas_refunds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_provider_events_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "saas_subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_provider_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      saas_refunds: {
        Row: {
          amount: number;
          charge_id: string;
          created_at: string;
          currency: string;
          external_refund_id: string | null;
          id: string;
          operation_id: string;
          processed_at: string | null;
          reason: string;
          requested_at: string;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          charge_id: string;
          created_at?: string;
          currency: string;
          external_refund_id?: string | null;
          id?: string;
          operation_id: string;
          processed_at?: string | null;
          reason: string;
          requested_at?: string;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          charge_id?: string;
          created_at?: string;
          currency?: string;
          external_refund_id?: string | null;
          id?: string;
          operation_id?: string;
          processed_at?: string | null;
          reason?: string;
          requested_at?: string;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_refunds_tenant_id_charge_id_fkey";
            columns: ["tenant_id", "charge_id"];
            isOneToOne: false;
            referencedRelation: "saas_charges";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "saas_refunds_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      saas_subscription_events: {
        Row: {
          billing_cycle: string;
          currency: string;
          effective_on: string;
          id: string;
          new_status: string;
          occurred_at: string;
          previous_status: string | null;
          price: number;
          subscription_id: string;
          tenant_id: string;
        };
        Insert: {
          billing_cycle: string;
          currency: string;
          effective_on: string;
          id?: string;
          new_status: string;
          occurred_at?: string;
          previous_status?: string | null;
          price: number;
          subscription_id: string;
          tenant_id: string;
        };
        Update: {
          billing_cycle?: string;
          currency?: string;
          effective_on?: string;
          id?: string;
          new_status?: string;
          occurred_at?: string;
          previous_status?: string | null;
          price?: number;
          subscription_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_subscription_events_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "saas_subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_subscription_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_subscription_events_tenant_id_subscription_id_fkey";
            columns: ["tenant_id", "subscription_id"];
            isOneToOne: false;
            referencedRelation: "saas_subscriptions";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      saas_subscriptions: {
        Row: {
          billing_cycle: string;
          converted_at: string | null;
          created_at: string;
          currency: string;
          current_period_ends_on: string;
          current_period_starts_on: string;
          ended_on: string | null;
          external_customer_id: string | null;
          external_subscription_id: string | null;
          id: string;
          next_billing_date: string | null;
          payment_provider: string | null;
          payment_status: string;
          plan_id: string;
          price: number;
          starts_on: string;
          status: string;
          tenant_id: string;
          trial_ends_on: string | null;
          updated_at: string;
        };
        Insert: {
          billing_cycle: string;
          converted_at?: string | null;
          created_at?: string;
          currency: string;
          current_period_ends_on: string;
          current_period_starts_on: string;
          ended_on?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          id?: string;
          next_billing_date?: string | null;
          payment_provider?: string | null;
          payment_status?: string;
          plan_id: string;
          price: number;
          starts_on: string;
          status: string;
          tenant_id: string;
          trial_ends_on?: string | null;
          updated_at?: string;
        };
        Update: {
          billing_cycle?: string;
          converted_at?: string | null;
          created_at?: string;
          currency?: string;
          current_period_ends_on?: string;
          current_period_starts_on?: string;
          ended_on?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          id?: string;
          next_billing_date?: string | null;
          payment_provider?: string | null;
          payment_status?: string;
          plan_id?: string;
          price?: number;
          starts_on?: string;
          status?: string;
          tenant_id?: string;
          trial_ends_on?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "saas_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_subscriptions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      sensitive_audit_log: {
        Row: {
          action: string;
          actor_membership_id: string | null;
          actor_user_id: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: Json;
          occurred_at: string;
          student_id: string | null;
          tenant_id: string;
        };
        Insert: {
          action: string;
          actor_membership_id?: string | null;
          actor_user_id?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          student_id?: string | null;
          tenant_id: string;
        };
        Update: {
          action?: string;
          actor_membership_id?: string | null;
          actor_user_id?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          student_id?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sensitive_audit_log_tenant_id_actor_membership_id_fkey";
            columns: ["tenant_id", "actor_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "sensitive_audit_log_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensitive_audit_log_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      session_attendance: {
        Row: {
          created_at: string;
          id: string;
          session_id: string;
          status: string;
          student_id: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          session_id: string;
          status: string;
          student_id: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          session_id?: string;
          status?: string;
          student_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_attendance_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_attendance_tenant_id_session_id_fkey";
            columns: ["tenant_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "session_attendance_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      session_enrollments: {
        Row: {
          created_at: string;
          id: string;
          session_id: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          session_id: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          session_id?: string;
          status?: string;
          student_id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_enrollments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_enrollments_tenant_id_session_id_fkey";
            columns: ["tenant_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "session_enrollments_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      session_realtime_events: {
        Row: {
          entity_id: string;
          event_type: string;
          id: number;
          occurred_at: string;
          operation: string;
          session_id: string;
          tenant_id: string;
        };
        Insert: {
          entity_id: string;
          event_type: string;
          id?: never;
          occurred_at?: string;
          operation: string;
          session_id: string;
          tenant_id: string;
        };
        Update: {
          entity_id?: string;
          event_type?: string;
          id?: never;
          occurred_at?: string;
          operation?: string;
          session_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_realtime_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_realtime_events_tenant_id_session_id_fkey";
            columns: ["tenant_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      sessions: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          location_id: string;
          starts_at: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          location_id: string;
          starts_at: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          location_id?: string;
          starts_at?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_tenant_id_location_id_fkey";
            columns: ["tenant_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      student_alerts: {
        Row: {
          category: string;
          class_session_id: string | null;
          created_at: string;
          deduplication_key: string | null;
          id: string;
          operational_action: string;
          period_end: string | null;
          period_start: string | null;
          reason: string;
          resolved_at: string | null;
          severity: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          class_session_id?: string | null;
          created_at?: string;
          deduplication_key?: string | null;
          id?: string;
          operational_action: string;
          period_end?: string | null;
          period_start?: string | null;
          reason: string;
          resolved_at?: string | null;
          severity: string;
          status?: string;
          student_id: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          class_session_id?: string | null;
          created_at?: string;
          deduplication_key?: string | null;
          id?: string;
          operational_action?: string;
          period_end?: string | null;
          period_start?: string | null;
          reason?: string;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          student_id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_alerts_tenant_id_class_session_id_fkey";
            columns: ["tenant_id", "class_session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "student_alerts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_alerts_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      student_contacts: {
        Row: {
          created_at: string;
          id: string;
          is_primary: boolean;
          label: string | null;
          status: string;
          student_id: string;
          tenant_id: string;
          type: string;
          value: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          label?: string | null;
          status?: string;
          student_id: string;
          tenant_id: string;
          type: string;
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          label?: string | null;
          status?: string;
          student_id?: string;
          tenant_id?: string;
          type?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_contacts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_contacts_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      student_erasure_requests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          execute_after: string;
          id: string;
          reason_code: string;
          requested_at: string;
          requested_by_membership_id: string;
          retention_hold: boolean;
          reviewed_at: string | null;
          status: string;
          student_id: string;
          tenant_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          execute_after?: string;
          id?: string;
          reason_code: string;
          requested_at?: string;
          requested_by_membership_id: string;
          retention_hold?: boolean;
          reviewed_at?: string | null;
          status?: string;
          student_id: string;
          tenant_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          execute_after?: string;
          id?: string;
          reason_code?: string;
          requested_at?: string;
          requested_by_membership_id?: string;
          retention_hold?: boolean;
          reviewed_at?: string | null;
          status?: string;
          student_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_erasure_requests_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_erasure_requests_tenant_id_requested_by_membership_fkey";
            columns: ["tenant_id", "requested_by_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "student_erasure_requests_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      student_membership_adjustments: {
        Row: {
          amount: number;
          created_at: string;
          created_by_membership_id: string;
          currency: string;
          effective_on: string;
          id: string;
          kind: string;
          membership_id: string;
          payment_id: string | null;
          reason: string;
          tenant_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by_membership_id: string;
          currency: string;
          effective_on: string;
          id?: string;
          kind: string;
          membership_id: string;
          payment_id?: string | null;
          reason: string;
          tenant_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by_membership_id?: string;
          currency?: string;
          effective_on?: string;
          id?: string;
          kind?: string;
          membership_id?: string;
          payment_id?: string | null;
          reason?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_membership_adjustment_tenant_id_created_by_members_fkey";
            columns: ["tenant_id", "created_by_membership_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "student_membership_adjustments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_membership_adjustments_tenant_id_membership_id_fkey";
            columns: ["tenant_id", "membership_id"];
            isOneToOne: false;
            referencedRelation: "student_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "student_membership_adjustments_tenant_id_payment_id_fkey";
            columns: ["tenant_id", "payment_id"];
            isOneToOne: false;
            referencedRelation: "student_membership_payments";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      student_membership_payments: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          due_on: string | null;
          id: string;
          membership_id: string;
          method: string;
          operation_id: string;
          paid_at: string | null;
          reference: string | null;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency: string;
          due_on?: string | null;
          id?: string;
          membership_id: string;
          method?: string;
          operation_id: string;
          paid_at?: string | null;
          reference?: string | null;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          due_on?: string | null;
          id?: string;
          membership_id?: string;
          method?: string;
          operation_id?: string;
          paid_at?: string | null;
          reference?: string | null;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_membership_payments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_membership_payments_tenant_id_membership_id_fkey";
            columns: ["tenant_id", "membership_id"];
            isOneToOne: false;
            referencedRelation: "student_memberships";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      student_memberships: {
        Row: {
          agreed_price: number;
          billing_cycle: string;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          expires_at: string;
          id: string;
          next_billing_date: string;
          past_due_since: string | null;
          paused_at: string | null;
          plan_id: string;
          starts_at: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          agreed_price: number;
          billing_cycle: string;
          cancelled_at?: string | null;
          created_at?: string;
          currency: string;
          expires_at: string;
          id?: string;
          next_billing_date: string;
          past_due_since?: string | null;
          paused_at?: string | null;
          plan_id: string;
          starts_at: string;
          status?: string;
          student_id: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          agreed_price?: number;
          billing_cycle?: string;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          expires_at?: string;
          id?: string;
          next_billing_date?: string;
          past_due_since?: string | null;
          paused_at?: string | null;
          plan_id?: string;
          starts_at?: string;
          status?: string;
          student_id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_memberships_tenant_id_plan_id_fkey";
            columns: ["tenant_id", "plan_id"];
            isOneToOne: false;
            referencedRelation: "membership_plans";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "student_memberships_tenant_id_student_id_fkey";
            columns: ["tenant_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      students: {
        Row: {
          archived_at: string | null;
          birth_date: string | null;
          created_at: string;
          full_name: string;
          id: string;
          photo_url: string | null;
          status: string;
          tenant_id: string;
        };
        Insert: {
          archived_at?: string | null;
          birth_date?: string | null;
          created_at?: string;
          full_name: string;
          id?: string;
          photo_url?: string | null;
          status?: string;
          tenant_id: string;
        };
        Update: {
          archived_at?: string | null;
          birth_date?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          photo_url?: string | null;
          status?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_memberships: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          status: string;
          tenant_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: string;
          status?: string;
          tenant_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          status?: string;
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_privacy_policies: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          health_enabled: boolean;
          jurisdiction_code: string;
          policy_version: string;
          retention_hold: boolean;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          health_enabled?: boolean;
          jurisdiction_code: string;
          policy_version: string;
          retention_hold?: boolean;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          health_enabled?: boolean;
          jurisdiction_code?: string;
          policy_version?: string;
          retention_hold?: boolean;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_privacy_policies_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_status_history: {
        Row: {
          actor_user_id: string | null;
          id: string;
          metadata: Json;
          new_status: string;
          occurred_at: string;
          previous_status: string | null;
          reason: string;
          tenant_id: string;
        };
        Insert: {
          actor_user_id?: string | null;
          id?: string;
          metadata?: Json;
          new_status: string;
          occurred_at?: string;
          previous_status?: string | null;
          reason: string;
          tenant_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          id?: string;
          metadata?: Json;
          new_status?: string;
          occurred_at?: string;
          previous_status?: string | null;
          reason?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_status_history_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          billing_contact_email: string | null;
          billing_contact_name: string | null;
          billing_tax_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          status: string;
        };
        Insert: {
          billing_contact_email?: string | null;
          billing_contact_name?: string | null;
          billing_tax_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          status?: string;
        };
        Update: {
          billing_contact_email?: string | null;
          billing_contact_name?: string | null;
          billing_tax_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_student_membership: {
        Args: {
          target_actor_membership: string;
          target_operation_id: string;
          target_plan: string;
          target_starts_on: string;
          target_student: string;
          target_tenant: string;
        };
        Returns: string;
      };
      activity_operation_id: {
        Args: { operation_key: string };
        Returns: string;
      };
      can_access_student_health: {
        Args: { target_tenant: string };
        Returns: boolean;
      };
      can_manage_instructor_scope: {
        Args: { target_instructor_membership: string; target_tenant: string };
        Returns: boolean;
      };
      can_manage_session_enrollments: {
        Args: { target_session: string; target_tenant: string };
        Returns: boolean;
      };
      can_manage_student_records: {
        Args: { target_tenant: string };
        Returns: boolean;
      };
      can_process_student_health: {
        Args: { target_student: string; target_tenant: string };
        Returns: boolean;
      };
      can_read_activity_event: {
        Args: { target_event: string; target_tenant: string };
        Returns: boolean;
      };
      can_read_instructor_operations: {
        Args: { target_tenant: string };
        Returns: boolean;
      };
      can_read_saas_billing: {
        Args: { target_tenant: string };
        Returns: boolean;
      };
      can_review_sensitive_audit: {
        Args: { target_tenant: string };
        Returns: boolean;
      };
      can_use_saas_feature: {
        Args: {
          effective_on?: string;
          target_feature: string;
          target_tenant: string;
        };
        Returns: boolean;
      };
      can_view_instructor_scope: {
        Args: { target_instructor_membership: string; target_tenant: string };
        Returns: boolean;
      };
      cancel_session_enrollment: {
        Args: {
          target_session_id: string;
          target_student_id: string;
          target_tenant_id: string;
        };
        Returns: {
          created_at: string;
          id: string;
          session_id: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "session_enrollments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      claim_notification_delivery: {
        Args: { target_now: string };
        Returns: Json;
      };
      complete_notification_delivery: {
        Args: {
          target_attempt_number: number;
          target_completed_at: string;
          target_delivery: string;
          target_error_code: string;
          target_outcome: string;
          target_provider_reference: string;
          target_retryable: boolean;
        };
        Returns: string;
      };
      correct_student_personal_data: {
        Args: {
          corrected_birth_date?: string;
          corrected_full_name?: string;
          target_student: string;
          target_tenant: string;
        };
        Returns: undefined;
      };
      create_routed_activity_event: {
        Args: {
          include_scoped_instructors?: boolean;
          target_entity: string;
          target_entity_type: string;
          target_event_type: string;
          target_message: string;
          target_metadata: Json;
          target_occurred_at: string;
          target_operation: string;
          target_origin: string;
          target_session?: string;
          target_severity: string;
          target_student?: string;
          target_tenant: string;
          target_title: string;
        };
        Returns: string;
      };
      current_membership_id: {
        Args: { target_tenant: string };
        Returns: string;
      };
      current_membership_role: {
        Args: { target_tenant: string };
        Returns: string;
      };
      evaluate_membership_collection_notices: {
        Args: {
          reference_date?: string;
          renewal_window_days?: number;
          target_tenant?: string;
        };
        Returns: number;
      };
      membership_outstanding_balances: {
        Args: { target_tenant?: string };
        Returns: {
          balance: number;
          currency: string;
          expiration_grace_days: number;
          expires_at: string;
          membership_id: string;
          next_billing_date: string;
          status: string;
          student_id: string;
          tenant_id: string;
        }[];
      };
      resolve_settled_collection_notices: {
        Args: { target_membership: string; target_tenant: string };
        Returns: number;
      };
      current_saas_limits: {
        Args: { effective_on?: string; target_tenant: string };
        Returns: {
          features: Json;
          max_students: number;
          max_users: number;
          plan_id: string;
          subscription_status: string;
        }[];
      };
      current_tenant_ids: { Args: never; Returns: string[] };
      enroll_student_in_session: {
        Args: {
          target_session_id: string;
          target_student_id: string;
          target_tenant_id: string;
        };
        Returns: {
          created_at: string;
          id: string;
          session_id: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "session_enrollments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      export_student_personal_data: {
        Args: { target_student: string; target_tenant: string };
        Returns: Json;
      };
      generate_class_session: {
        Args: {
          target_ends_at: string;
          target_schedule_id: string;
          target_starts_at: string;
          target_tenant_id: string;
          target_waitlist_enabled?: boolean;
        };
        Returns: {
          capacity: number;
          class_schedule_id: string;
          class_template_id: string;
          created_at: string;
          ends_at: string;
          id: string;
          instructor_membership_id: string;
          location_id: string;
          starts_at: string;
          status: string;
          tenant_id: string;
          timezone: string;
          updated_at: string;
          waitlist_enabled: boolean;
        };
        SetofOptions: {
          from: "*";
          to: "class_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_saas_financial_dashboard: {
        Args: { target_period: string };
        Returns: {
          arpa: number;
          arr: number;
          churn_rate: number;
          churned_tenants: number;
          collected_net: number;
          currency: string;
          mrr: number;
          past_due_amount: number;
          past_due_tenants: number;
          pending_amount: number;
          recurring_tenants: number;
          trial_conversion_rate: number;
          trials_converted: number;
          trials_ended: number;
        }[];
      };
      get_saas_financial_dashboard_unlogged: {
        Args: { target_period: string };
        Returns: {
          arpa: number;
          arr: number;
          churn_rate: number;
          churned_tenants: number;
          collected_net: number;
          currency: string;
          mrr: number;
          past_due_amount: number;
          past_due_tenants: number;
          pending_amount: number;
          recurring_tenants: number;
          trial_conversion_rate: number;
          trials_converted: number;
          trials_ended: number;
        }[];
      };
      get_saas_tenant_entitlements: {
        Args: { target_tenant: string };
        Returns: {
          active_students: number;
          active_users: number;
          features: Json;
          max_students: number;
          max_users: number;
          plan_id: string;
          subscription_id: string;
        }[];
      };
      get_saas_tenant_entitlements_unlogged: {
        Args: { target_tenant: string };
        Returns: {
          active_students: number;
          active_users: number;
          features: Json;
          max_students: number;
          max_users: number;
          plan_id: string;
          subscription_id: string;
        }[];
      };
      get_saas_tenant_status_history: {
        Args: { target_tenant: string };
        Returns: {
          actor_user_id: string;
          id: string;
          new_status: string;
          occurred_at: string;
          previous_status: string;
          reason: string;
        }[];
      };
      get_saas_tenant_status_history_unlogged: {
        Args: { target_tenant: string };
        Returns: {
          actor_user_id: string;
          id: string;
          new_status: string;
          occurred_at: string;
          previous_status: string;
          reason: string;
        }[];
      };
      has_current_health_consent: {
        Args: { target_student: string; target_tenant: string };
        Returns: boolean;
      };
      is_health_policy_approved: {
        Args: { target_tenant: string };
        Returns: boolean;
      };
      is_platform_admin: { Args: never; Returns: boolean };
      list_active_saas_plans: {
        Args: never;
        Returns: {
          features: Json;
          id: string;
          max_students: number;
          max_users: number;
          name: string;
        }[];
      };
      list_active_saas_plans_unlogged: {
        Args: never;
        Returns: {
          features: Json;
          id: string;
          max_students: number;
          max_users: number;
          name: string;
        }[];
      };
      list_saas_tenants: {
        Args: never;
        Returns: {
          billing_contact_email: string;
          billing_contact_name: string;
          created_at: string;
          id: string;
          name: string;
          status: string;
        }[];
      };
      list_saas_tenants_unlogged: {
        Args: never;
        Returns: {
          billing_contact_email: string;
          billing_contact_name: string;
          created_at: string;
          id: string;
          name: string;
          status: string;
        }[];
      };
      membership_cycle_end: {
        Args: { billing_cycle: string; starts_on: string };
        Returns: string;
      };
      process_saas_payment_event: {
        Args: {
          target_amount: number;
          target_currency: string;
          target_event_type: string;
          target_external_charge_id: string;
          target_external_event_id: string;
          target_external_invoice_id: string;
          target_external_refund_id: string;
          target_external_subscription_id: string;
          target_occurred_at: string;
          target_provider: string;
          target_reason?: string;
        };
        Returns: string;
      };
      record_membership_payment: {
        Args: {
          target_actor_membership: string;
          target_adjustments?: Json;
          target_amount: number;
          target_currency: string;
          target_membership: string;
          target_method?: string;
          target_operation_id: string;
          target_paid_at: string;
          target_reference: string;
          target_tenant: string;
        };
        Returns: string;
      };
      record_saas_privileged_operation: {
        Args: {
          operation_metadata?: Json;
          operation_reason: string;
          operation_result: string;
          target_action: string;
          target_tenant: string;
        };
        Returns: string;
      };
      record_sensitive_access: {
        Args: {
          target_entity_id: string;
          target_entity_type: string;
          target_student: string;
          target_tenant: string;
        };
        Returns: string;
      };
      register_health_consent: {
        Args: {
          target_decision: string;
          target_operation_id: string;
          target_policy_version: string;
          target_student: string;
          target_tenant: string;
        };
        Returns: string;
      };
      request_student_erasure: {
        Args: {
          target_reason_code: string;
          target_student: string;
          target_tenant: string;
        };
        Returns: string;
      };
      resolve_activity_notification: {
        Args: { target_notification: string };
        Returns: {
          created_at: string;
          event_id: string;
          id: string;
          read_at: string | null;
          recipient_role: string;
          recipient_user_id: string;
          resolved_at: string | null;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "activity_notifications";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      schedule_saas_plan_limits: {
        Args: {
          change_reason: string;
          target_effective_from: string;
          target_plan: string;
          target_subscription: string;
          target_tenant: string;
        };
        Returns: {
          created_at: string;
          effective_from: string;
          effective_until: string | null;
          features: Json;
          id: string;
          max_students: number;
          max_users: number;
          plan_id: string;
          subscription_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "saas_limits";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      schedule_saas_plan_limits_unlogged: {
        Args: {
          change_reason: string;
          target_effective_from: string;
          target_plan: string;
          target_subscription: string;
          target_tenant: string;
        };
        Returns: {
          created_at: string;
          effective_from: string;
          effective_until: string | null;
          features: Json;
          id: string;
          max_students: number;
          max_users: number;
          plan_id: string;
          subscription_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "saas_limits";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_saas_tenant_status: {
        Args: {
          target_status: string;
          target_tenant: string;
          transition_reason: string;
        };
        Returns: {
          billing_contact_email: string | null;
          billing_contact_name: string | null;
          billing_tax_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          status: string;
        };
        SetofOptions: {
          from: "*";
          to: "tenants";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_saas_tenant_status_unlogged: {
        Args: {
          target_status: string;
          target_tenant: string;
          transition_reason: string;
        };
        Returns: {
          billing_contact_email: string | null;
          billing_contact_name: string | null;
          billing_tax_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          status: string;
        };
        SetofOptions: {
          from: "*";
          to: "tenants";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_student_membership: {
        Args: {
          target_actor_membership: string;
          target_effective_on: string;
          target_membership: string;
          target_operation_id: string;
          target_tenant: string;
          target_transition: string;
        };
        Returns: string;
      };
      upsert_abandonment_alert: {
        Args: {
          target_deduplication_key: string;
          target_period_end: string;
          target_period_start: string;
          target_reason: string;
          target_student: string;
          target_tenant: string;
        };
        Returns: {
          category: string;
          class_session_id: string | null;
          created_at: string;
          deduplication_key: string | null;
          id: string;
          operational_action: string;
          period_end: string | null;
          period_start: string | null;
          reason: string;
          resolved_at: string | null;
          severity: string;
          status: string;
          student_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_alerts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
