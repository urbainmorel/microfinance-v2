import type { SupabaseClient } from "@supabase/supabase-js";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<
  Row,
  RequiredInsert extends keyof Row = never,
  Generated extends keyof Row = never,
  Relationships extends Relationship[] = [],
> = {
  Row: Row;
  Insert: Omit<Partial<Row>, RequiredInsert | Generated> &
    Pick<Row, RequiredInsert> & { [Key in Generated]?: never };
  Update: Omit<Partial<Row>, Generated> & { [Key in Generated]?: never };
  Relationships: Relationships;
};

export type LoanStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_ANALYSIS"
  | "INFO_REQUESTED"
  | "PRE_APPROVED"
  | "ACCEPTED"
  | "GUARANTEE_PENDING"
  | "GUARANTEE_COMPLETE"
  | "AWAITING_DISBURSEMENT"
  | "DISBURSED"
  | "REJECTED"
  | "CANCELLED";

export type Database = {
  public: {
    Tables: {
      app_settings: Table<{
        audit_retention_days: number;
        default_after_days: number;
        id: boolean;
        kyc_retention_days: number;
        transfer_fee: number;
        updated_at: string | null;
        withdrawal_fee: number;
        withdrawal_window_end: number;
        withdrawal_window_start: number;
      }>;
      profiles: Table<
        {
          address: string | null;
          birth_date: string | null;
          city: string | null;
          country: string | null;
          created_at: string | null;
          firstname: string;
          id: string;
          id_expiry: string | null;
          id_number: string | null;
          id_type: string | null;
          is_active: boolean | null;
          kyc_status: string | null;
          lastname: string;
          monthly_income_estimate: number | null;
          phone: string | null;
          preferred_language: string | null;
          profession: string | null;
          role: "admin" | "client" | null;
          updated_at: string | null;
        },
        "id" | "firstname" | "lastname"
      >;
      kyc_documents: Table<
        {
          client_id: string;
          doc_type: string;
          id: string;
          uploaded_at: string | null;
          url: string;
          verified: boolean | null;
        },
        "client_id" | "doc_type" | "url",
        never,
        [
          {
            foreignKeyName: "kyc_documents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      kyc_financials: Table<
        {
          client_id: string;
          income_source: string | null;
          momo_number: string | null;
          momo_operator: string | null;
          monthly_charges: number | null;
          updated_at: string | null;
          usual_bank: string | null;
        },
        "client_id",
        never,
        [
          {
            foreignKeyName: "kyc_financials_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      wallets: Table<
        {
          blocked_guarantee: number | null;
          client_id: string;
          disbursed_loan: number | null;
          free_savings: number | null;
          mandatory_savings: number | null;
          reserved_amount: number | null;
          updated_at: string | null;
        },
        "client_id",
        never,
        [
          {
            foreignKeyName: "wallets_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      loan_products: Table<
        {
          created_at: string | null;
          description: string | null;
          guarantee_rate: number;
          id: string;
          insurance_rate: number;
          interest_method: string;
          interest_rate: number;
          is_active: boolean;
          late_penalty_rate: number;
          management_fee_flat: number;
          management_fee_percent: number;
          mandatory_savings_rate: number;
          max_amount: number;
          max_duration_months: number;
          min_amount: number;
          min_duration_months: number;
          name: string;
          processing_fee_flat: number;
          processing_fee_percent: number;
        },
        | "name"
        | "min_amount"
        | "max_amount"
        | "min_duration_months"
        | "max_duration_months"
        | "interest_rate"
      >;
      loan_requests: Table<
        {
          admin_comment: string | null;
          amount: number;
          approved_amount: number | null;
          client_id: string;
          correlation_id: string | null;
          created_at: string | null;
          disbursed_at: string | null;
          disbursed_by: string | null;
          disbursement_reference: string | null;
          duration_months: number;
          guarantee_blocked_partial: number | null;
          guarantee_required: number | null;
          id: string;
          idempotency_key: string | null;
          monthly_income_estimate: number | null;
          product_id: string;
          purpose: string | null;
          rejected_reason: string | null;
          requested_disbursement_method: string | null;
          status: LoanStatus | null;
          updated_at: string | null;
        },
        "client_id" | "product_id" | "amount" | "duration_months",
        never,
        [
          {
            foreignKeyName: "loan_requests_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loan_requests_disbursed_by_fkey";
            columns: ["disbursed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loan_requests_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "loan_products";
            referencedColumns: ["id"];
          },
        ]
      >;
      loan_request_documents: Table<
        {
          client_id: string;
          created_at: string;
          id: string;
          object_path: string;
          request_id: string;
        },
        "client_id" | "object_path" | "request_id",
        never,
        [
          {
            foreignKeyName: "loan_request_documents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loan_request_documents_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "loan_requests";
            referencedColumns: ["id"];
          },
        ]
      >;
      loans: Table<
        {
          client_id: string;
          created_at: string | null;
          end_date: string;
          id: string;
          interest_method: string;
          interest_rate: number;
          remaining_principal: number;
          request_id: string;
          start_date: string;
          status: string | null;
          total_amount: number;
        },
        | "client_id"
        | "end_date"
        | "interest_method"
        | "interest_rate"
        | "remaining_principal"
        | "request_id"
        | "start_date"
        | "total_amount",
        never,
        [
          {
            foreignKeyName: "loans_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loans_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "loan_requests";
            referencedColumns: ["id"];
          },
        ]
      >;
      amortization_schedules: Table<
        {
          due_date: string;
          due_fees: number | null;
          due_interest: number;
          due_mandatory_savings: number | null;
          due_principal: number;
          id: string;
          installment_no: number;
          loan_id: string | null;
          paid_fees: number | null;
          paid_interest: number | null;
          paid_mandatory_savings: number | null;
          paid_penalty: number;
          paid_principal: number | null;
          penalty_accrued: number | null;
          penalty_last_accrued_on: string | null;
          status: string | null;
          total_due: number | null;
          updated_at: string | null;
        },
        "due_date" | "due_interest" | "due_principal" | "installment_no",
        "total_due",
        [
          {
            foreignKeyName: "amortization_schedules_loan_id_fkey";
            columns: ["loan_id"];
            isOneToOne: false;
            referencedRelation: "loans";
            referencedColumns: ["id"];
          },
        ]
      >;
      deposit_requests: Table<
        {
          amount: number;
          client_id: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          correlation_id: string | null;
          created_at: string | null;
          id: string;
          idempotency_key: string | null;
          motif: string;
          payment_method: string;
          proof_url: string;
          reference: string | null;
          rejected_reason: string | null;
          status: string | null;
        },
        "amount" | "client_id" | "motif" | "payment_method" | "proof_url",
        never,
        [
          {
            foreignKeyName: "deposit_requests_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deposit_requests_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      withdrawal_requests: Table<
        {
          amount: number;
          client_id: string;
          correlation_id: string | null;
          created_at: string | null;
          external_reference: string | null;
          id: string;
          idempotency_key: string | null;
          processed_by: string | null;
          recipient_account: string | null;
          recipient_bank: string | null;
          recipient_bank_code: string | null;
          recipient_country: string | null;
          recipient_iban: string | null;
          recipient_name: string;
          recipient_operator: string | null;
          recipient_phone: string | null;
          motif: string | null;
          rejected_reason: string | null;
          status: string | null;
          type: string;
          updated_at: string | null;
        },
        "amount" | "client_id" | "recipient_name" | "type",
        never,
        [
          {
            foreignKeyName: "withdrawal_requests_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_processed_by_fkey";
            columns: ["processed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      repayment_requests: Table<
        {
          amount: number;
          client_id: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          correlation_id: string | null;
          created_at: string | null;
          id: string;
          idempotency_key: string | null;
          loan_id: string;
          payment_method: string;
          proof_url: string;
          reference: string | null;
          rejected_reason: string | null;
          status: string | null;
        },
        "amount" | "client_id" | "loan_id" | "payment_method" | "proof_url",
        never,
        [
          {
            foreignKeyName: "repayment_requests_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repayment_requests_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repayment_requests_loan_id_fkey";
            columns: ["loan_id"];
            isOneToOne: false;
            referencedRelation: "loans";
            referencedColumns: ["id"];
          },
        ]
      >;
      notifications: Table<
        {
          body: string | null;
          created_at: string | null;
          id: string;
          payload: Json | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        },
        "title" | "type" | "user_id",
        never,
        [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      notification_templates: Table<
        {
          body_html: string;
          id: string;
          language: string;
          slug: string;
          subject: string;
          updated_at: string | null;
          updated_by: string | null;
          variables: Json | null;
        },
        "body_html" | "slug" | "subject",
        never,
        [
          {
            foreignKeyName: "notification_templates_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      notification_outbox: Table<
        {
          attempts: number;
          created_at: string;
          dedupe_key: string;
          event_type: string;
          id: string;
          language: string;
          last_error: string | null;
          locked_at: string | null;
          next_attempt_at: string;
          payload: Json;
          sent_at: string | null;
          status: string;
          template_slug: string;
          user_id: string;
        },
        "dedupe_key" | "event_type" | "template_slug" | "user_id",
        never,
        [
          {
            foreignKeyName: "notification_outbox_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      audit_logs: Table<
        {
          action_type: string;
          correlation_id: string | null;
          created_at: string | null;
          id: string;
          ip_address: string | null;
          new_value: Json | null;
          old_value: Json | null;
          reason: string | null;
          target_id: string | null;
          user_id: string | null;
          user_role: string;
        },
        "action_type" | "user_role",
        never,
        [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      pin_reset_challenges: Table<
        {
          attempts: number;
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          otp_hash: string;
          user_id: string;
        },
        "expires_at" | "otp_hash" | "user_id",
        never,
        [
          {
            foreignKeyName: "pin_reset_challenges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      user_consents: Table<
        {
          accepted_at: string;
          id: string;
          ip_address: string | null;
          policy_version: string;
          user_id: string;
        },
        "policy_version" | "user_id",
        never,
        [
          {
            foreignKeyName: "user_consents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      data_erasure_requests: Table<
        {
          created_at: string;
          id: string;
          processed_at: string | null;
          processed_by: string | null;
          reason: string | null;
          status: string;
          user_id: string;
        },
        "user_id",
        never,
        [
          {
            foreignKeyName: "data_erasure_requests_processed_by_fkey";
            columns: ["processed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "data_erasure_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      get_pin_security_for_verification: {
        Args: { p_user_id: string };
        Returns: {
          failed_attempts: number;
          is_active: boolean;
          locked_until: string | null;
          pin_hash: string | null;
        }[];
      };
      amortization_rows: {
        Args: { p_method: string; p_n: number; p_principal: number; p_rate: number };
        Returns: { due_interest: number; due_principal: number; installment_no: number }[];
      };
      anonymize_client: {
        Args: { p_client: string; p_reason: string };
        Returns: undefined;
      };
      auth_role: { Args: Record<PropertyKey, never>; Returns: string };
      cancel_client_request: {
        Args: {
          p_client: string;
          p_correlation_id?: string | null;
          p_idempotency_key: string;
          p_kind: string;
          p_request: string;
        };
        Returns: string;
      };
      claim_notification_outbox: {
        Args: { p_limit?: number };
        Returns: Database["public"]["Tables"]["notification_outbox"]["Row"][];
      };
      complete_notification_outbox: {
        Args: { p_error?: string | null; p_id: string; p_success: boolean };
        Returns: undefined;
      };
      confirm_deposit: {
        Args: { p_action: string; p_reason?: string | null; p_request: string };
        Returns: undefined;
      };
      confirm_repayment: {
        Args: { p_action: string; p_reason?: string | null; p_request: string };
        Returns: undefined;
      };
      create_client_withdrawal: {
        Args: {
          p_amount: number;
          p_client: string;
          p_correlation_id?: string | null;
          p_idempotency_key: string;
          p_recipient: Json;
          p_type: string;
        };
        Returns: string;
      };
      create_deposit_request: {
        Args: {
          p_amount: number;
          p_client: string;
          p_correlation_id?: string | null;
          p_idempotency_key: string;
          p_motif: string;
          p_payment_method: string;
          p_proof_path: string;
          p_reference: string | null;
        };
        Returns: string;
      };
      create_loan_request: {
        Args: {
          p_amount: number;
          p_client: string;
          p_correlation_id?: string | null;
          p_disbursement_method: string;
          p_documents: Json;
          p_duration: number;
          p_idempotency_key: string;
          p_monthly_income: number | null;
          p_product: string;
          p_purpose: string | null;
        };
        Returns: string;
      };
      create_repayment_request: {
        Args: {
          p_amount: number;
          p_client: string;
          p_correlation_id?: string | null;
          p_idempotency_key: string;
          p_loan: string;
          p_payment_method: string;
          p_proof_path: string;
          p_reference: string | null;
        };
        Returns: string;
      };
      disburse_loan: {
        Args: { p_external_reference?: string | null; p_request: string };
        Returns: string;
      };
      effective_annual_cost: {
        Args: {
          p_duration: number;
          p_method: string;
          p_monthly_rate: number;
          p_principal: number;
          p_total_fees: number;
        };
        Returns: number;
      };
      finalize_kyc_document: {
        Args: { p_doc_type: string; p_path: string };
        Returns: undefined;
      };
      get_active_loan_status: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_admin_kpis: { Args: Record<PropertyKey, never>; Returns: Json };
      get_available_balance: { Args: { p_client: string }; Returns: number };
      get_client_operations: {
        Args: { p_before?: string | null; p_limit?: number };
        Returns: {
          amount: number;
          created_at: string;
          id: string;
          label: string;
          operation_type: string;
          status: string;
        }[];
      };
      get_client_operation_detail: {
        Args: { p_kind: string; p_operation: string };
        Returns: Json;
      };
      get_onboarding_state: {
        Args: Record<PropertyKey, never>;
        Returns: { kyc_status: string; pin_set: boolean }[];
      };
      record_pin_verification_failure: {
        Args: {
          p_lock_step_minutes?: number;
          p_lock_threshold?: number;
          p_user_id: string;
        };
        Returns: { attempts: number; new_locked_until: string | null }[];
      };
      record_pin_verification_success: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      replace_pin_hash: {
        Args: { p_pin_hash: string; p_user_id: string };
        Returns: boolean;
      };
      run_daily_loan_jobs: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      get_wallet_summary: {
        Args: { p_client: string };
        Returns: {
          blocked_guarantee: number;
          disbursed_loan: number;
          free_savings: number;
          mandatory_savings: number;
          reserved_amount: number;
        }[];
      };
      manage_user_status: {
        Args: { p_active: boolean; p_user: string };
        Returns: undefined;
      };
      process_guarantee_blocking: {
        Args: {
          p_client: string;
          p_correlation_id?: string | null;
          p_idempotency_key: string;
          p_request: string;
        };
        Returns: string;
      };
      process_data_erasure: {
        Args: { p_action: string; p_reason: string; p_request: string };
        Returns: undefined;
      };
      review_kyc: {
        Args: { p_action: string; p_client: string; p_reason?: string | null };
        Returns: undefined;
      };
      save_kyc_financials: { Args: { p_data: Json }; Returns: undefined };
      save_kyc_profile: { Args: { p_data: Json }; Returns: undefined };
      set_initial_pin_hash: {
        Args: { p_pin_hash: string; p_user_id: string };
        Returns: boolean;
      };
      settle_withdrawal: {
        Args: {
          p_action: string;
          p_reason?: string | null;
          p_reference?: string | null;
          p_request: string;
        };
        Returns: undefined;
      };
      simulate_loan: {
        Args: { p_amount: number; p_duration: number; p_product: string; p_start_date?: string };
        Returns: Json;
      };
      submit_kyc: { Args: Record<PropertyKey, never>; Returns: undefined };
      transition_loan_request: {
        Args: {
          p_action: string;
          p_approved_amount?: number | null;
          p_comment?: string | null;
          p_request: string;
        };
        Returns: string;
      };
      withdrawal_hour_open: {
        Args: { p_end: number; p_hour: number; p_start: number };
        Returns: boolean;
      };
    };
    Enums: { loan_status_enum: LoanStatus };
    CompositeTypes: { [_ in never]: never };
  };
};

export type DatabaseClient = SupabaseClient<Database>;
