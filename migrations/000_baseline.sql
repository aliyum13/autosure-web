-- 000_baseline.sql — complete schema for a fresh database
--
-- Captured from the live production database on 2026-08-29 via:
--   pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL"
-- Source server: PostgreSQL 18.6 (Neon), dumped with pg_dump 18.4.
--
-- WHY THIS FILE EXISTS
--
-- Migrations 001-017 are incremental. They ALTER `orders`, `reports`,
-- `referral_codes` and `referrals` without ever creating them, because the
-- original schema was applied with `prisma db push` and was never captured as
-- SQL. Worse, `referral_codes` and `referrals` have no CREATE TABLE anywhere in
-- git at all — they were created by hand in the Neon SQL Editor. Eleven source
-- files read and write them. Standing up a new database from this repo was
-- therefore impossible: 001 fails on its first ALTER against an empty database.
-- This file closes that gap.
--
-- HOW TO USE IT
--
-- On an empty database, run THIS FILE ALONE. Do not run 001-017 afterwards.
-- The dump was taken after all seventeen had already been applied, so their
-- effects are baked in here. Replaying them would be redundant, and 009 would
-- hard-fail: its guard does `SELECT COUNT(*) FROM users` inside a DO block, and
-- `users` no longer exists.
--
-- 001-017 remain in this folder as the applied history of the production
-- database. They are a record, not a replay sequence. See README.md.
--
-- WHAT IS DELIBERATELY ABSENT
--
--   * `users` and `password_resets` — dropped by 009 and not recreated here.
--     `orders.user_id` and `reports.user_id` survive as unconstrained nullable
--     columns. Since 015, `orders.user_id` holds an `accounts.id`, not a
--     `users.id`. The column name is historical and the type is text.
--   * Foreign keys — the production database has none. 009 dropped the last
--     two. Reproduced faithfully rather than 'improved': adding FKs here would
--     make this baseline diverge from the database it documents, and order
--     creation would begin failing on rows the application currently tolerates.
--
-- NOTE ON prisma/schema.prisma: it does not describe this schema and has not
-- for some time. It still declares a `User` model and both foreign keys, types
-- `payment_status`/`report_status` as String rather than the enums below, and
-- omits `guest_name`/`guest_email`/`guest_phone`/`bundle_id`/`bundle_count` and
-- every table added by 002-017. It is used only for `prisma generate` at build
-- time. Treat THIS file as the truth about the database.
--
-- Two psql meta-commands (\restrict / \unrestrict) that pg_dump 18 emits have
-- been stripped, along with the SET preamble, so this pastes cleanly into the
-- Neon SQL Editor. The DDL itself is otherwise verbatim.

BEGIN;

CREATE TYPE public.payment_status AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED'
);

CREATE TYPE public.report_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'INVALID_VIN'
);

CREATE TABLE public.accounts (
    id text NOT NULL,
    email text NOT NULL,
    first_name text,
    last_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.api_call_log (
    id text NOT NULL,
    service text NOT NULL,
    operation text NOT NULL,
    success boolean NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.clearvin_balance_sync (
    id text NOT NULL,
    known_balance integer NOT NULL,
    low_threshold integer DEFAULT 20 NOT NULL,
    estimate_at_sync integer,
    recorded_by text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clearvin_balance_sync_known_balance_check CHECK ((known_balance >= 0)),
    CONSTRAINT clearvin_balance_sync_low_threshold_check CHECK ((low_threshold >= 0))
);

CREATE TABLE public.comp_lookup_log (
    id text NOT NULL,
    admin_email text NOT NULL,
    queried_email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.comp_report_log (
    id text NOT NULL,
    admin_email text NOT NULL,
    order_id text NOT NULL,
    linked_order_id text,
    vin text NOT NULL,
    guest_email text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.cron_run_log (
    id text NOT NULL,
    job text NOT NULL,
    rows_deleted integer DEFAULT 0 NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.email_delivery_block (
    id text NOT NULL,
    email text NOT NULL,
    context text NOT NULL,
    origin text,
    report_id text,
    order_id text,
    resolved_at timestamp with time zone,
    resolved_by text,
    resolution text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.login_otps (
    id text NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.order_refunds (
    order_id text NOT NULL,
    status text NOT NULL,
    amount_kobo bigint NOT NULL,
    note text,
    resolved_by text NOT NULL,
    resolved_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.orders (
    id text NOT NULL,
    user_id text,
    vin text NOT NULL,
    amount_ngn integer NOT NULL,
    paystack_reference text NOT NULL,
    paystack_access_code text,
    payment_status public.payment_status DEFAULT 'PENDING'::public.payment_status NOT NULL,
    paid_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    guest_name text,
    guest_email text,
    guest_phone text,
    bundle_id text,
    bundle_count integer DEFAULT 1
);

CREATE TABLE public.referral_balances (
    email text NOT NULL,
    balance_kobo bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referral_balances_balance_kobo_check CHECK ((balance_kobo >= 0))
);

CREATE TABLE public.referral_codes (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    owner_account_id text
);

CREATE TABLE public.referral_earnings (
    id text NOT NULL,
    referrer_email text NOT NULL,
    kind text NOT NULL,
    amount_kobo bigint NOT NULL,
    source_order_id text,
    spent_order_id text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.referrals (
    id text NOT NULL,
    referral_code_id text NOT NULL,
    order_id text,
    user_id text,
    amount_ngn integer DEFAULT 0 NOT NULL,
    commission_ngn integer DEFAULT 0 NOT NULL,
    is_paid boolean DEFAULT false NOT NULL,
    paid_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    converted_at timestamp with time zone
);

CREATE TABLE public.report_credits (
    id text NOT NULL,
    email text NOT NULL,
    order_id text,
    bundle_id text,
    credits_total integer DEFAULT 0 NOT NULL,
    credits_used integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reports (
    id text NOT NULL,
    order_id text,
    user_id text,
    vin text NOT NULL,
    status public.report_status DEFAULT 'PENDING'::public.report_status NOT NULL,
    overall_grade text,
    risk_score integer,
    grade_label text,
    grade_colour text,
    processed_data jsonb,
    ai_summary text,
    raw_clearvin_data jsonb,
    raw_nhtsa_data jsonb,
    share_token text NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    pdf_data bytea,
    recovery_attempts integer DEFAULT 0 NOT NULL,
    clearvin_report_id text
);

CREATE TABLE public.system_alerts (
    id text NOT NULL,
    probe text NOT NULL,
    severity text NOT NULL,
    detail text NOT NULL,
    notified_at timestamp with time zone,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_email_key UNIQUE (email);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.api_call_log
    ADD CONSTRAINT api_call_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.clearvin_balance_sync
    ADD CONSTRAINT clearvin_balance_sync_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.comp_lookup_log
    ADD CONSTRAINT comp_lookup_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.comp_report_log
    ADD CONSTRAINT comp_report_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cron_run_log
    ADD CONSTRAINT cron_run_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.email_delivery_block
    ADD CONSTRAINT email_delivery_block_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.login_otps
    ADD CONSTRAINT login_otps_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_refunds
    ADD CONSTRAINT order_refunds_pkey PRIMARY KEY (order_id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.referral_balances
    ADD CONSTRAINT referral_balances_pkey PRIMARY KEY (email);

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.referral_earnings
    ADD CONSTRAINT referral_earnings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.report_credits
    ADD CONSTRAINT report_credits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_pkey PRIMARY KEY (id);

CREATE INDEX idx_accounts_email ON public.accounts USING btree (email);

CREATE INDEX idx_api_call_log_created ON public.api_call_log USING btree (created_at DESC);

CREATE INDEX idx_api_call_log_service_created ON public.api_call_log USING btree (service, created_at DESC);

CREATE INDEX idx_clearvin_balance_sync_created ON public.clearvin_balance_sync USING btree (created_at DESC);

CREATE INDEX idx_comp_lookup_log_admin_created ON public.comp_lookup_log USING btree (admin_email, created_at DESC);

CREATE INDEX idx_comp_report_log_created ON public.comp_report_log USING btree (created_at DESC);

CREATE INDEX idx_cron_run_log_created ON public.cron_run_log USING btree (created_at DESC);

CREATE UNIQUE INDEX idx_earnings_once_per_order ON public.referral_earnings USING btree (source_order_id) WHERE (kind = 'earned'::text);

CREATE INDEX idx_earnings_referrer ON public.referral_earnings USING btree (lower(referrer_email), created_at DESC);

CREATE INDEX idx_edb_email ON public.email_delivery_block USING btree (lower(email));

CREATE INDEX idx_edb_unresolved ON public.email_delivery_block USING btree (created_at DESC) WHERE (resolved_at IS NULL);

CREATE INDEX idx_login_otps_email_created ON public.login_otps USING btree (email, created_at DESC);

CREATE INDEX idx_order_refunds_resolved ON public.order_refunds USING btree (resolved_at DESC);

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id) WHERE (user_id IS NOT NULL);

CREATE UNIQUE INDEX idx_referral_codes_owner ON public.referral_codes USING btree (owner_account_id) WHERE (owner_account_id IS NOT NULL);

CREATE INDEX idx_referrals_order ON public.referrals USING btree (order_id);

CREATE INDEX idx_report_credits_email ON public.report_credits USING btree (email);

CREATE INDEX idx_reports_clearvin_report_id ON public.reports USING btree (clearvin_report_id) WHERE (clearvin_report_id IS NOT NULL);

CREATE INDEX idx_system_alerts_created ON public.system_alerts USING btree (created_at DESC);

CREATE UNIQUE INDEX idx_system_alerts_open ON public.system_alerts USING btree (probe) WHERE (resolved_at IS NULL);

CREATE UNIQUE INDEX orders_paystack_reference_key ON public.orders USING btree (paystack_reference);

CREATE UNIQUE INDEX referral_codes_code_key ON public.referral_codes USING btree (code);

CREATE INDEX referrals_referral_code_id_idx ON public.referrals USING btree (referral_code_id);

CREATE UNIQUE INDEX reports_order_id_key ON public.reports USING btree (order_id);

CREATE UNIQUE INDEX reports_share_token_key ON public.reports USING btree (share_token);

COMMIT;

-- Verify after running — expect 17 tables and 2 enum types:
--
--   SELECT count(*) FROM pg_tables WHERE schemaname = 'public';
--   SELECT count(*) FROM pg_type t
--     JOIN pg_namespace n ON n.oid = t.typnamespace
--    WHERE n.nspname = 'public' AND t.typtype = 'e';
--
-- And confirm the legacy auth tables are absent, as intended:
--
--   SELECT to_regclass('users'), to_regclass('password_resets');
--   -- both should return NULL
