CREATE TYPE "public"."action_result_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."assistant_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."compliance_level" AS ENUM('standard', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."verbosity_level" AS ENUM('brief', 'normal', 'detailed');--> statement-breakpoint
CREATE TYPE "public"."connection_type" AS ENUM('direct', 'organizational');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('recharge', 'usage_fee', 'membership_fee', 'refund', 'manual_adjustment', 'promotion_credit');--> statement-breakpoint
CREATE TABLE "action_configuration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"configuration" jsonb NOT NULL,
	"action_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "action_configuration_action_id_unique" UNIQUE("action_id")
);
--> statement-breakpoint
CREATE TABLE "action_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "action_result_status" DEFAULT 'pending' NOT NULL,
	"result" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action_id" uuid NOT NULL,
	"assistant_id" uuid NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_structure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" varchar(180),
	"action_schema" jsonb NOT NULL,
	"action_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "action_structure_action_id_unique" UNIQUE("action_id")
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(90) NOT NULL,
	"returns" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_configuration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assistant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_personalities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"friendliness" integer DEFAULT 3 NOT NULL,
	"seriousness" integer DEFAULT 3 NOT NULL,
	"empathy" integer DEFAULT 3 NOT NULL,
	"confidence" integer DEFAULT 3 NOT NULL,
	"professionalism" integer DEFAULT 3 NOT NULL,
	"patience" integer DEFAULT 3 NOT NULL,
	"curiosity" integer DEFAULT 3 NOT NULL,
	"emojis" integer DEFAULT 0 NOT NULL,
	"verbosity" "verbosity_level" DEFAULT 'normal' NOT NULL,
	"compliance_level" "compliance_level" DEFAULT 'standard' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assistant_configuration_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "traits_range_check" CHECK ("assistant_personalities"."friendliness" BETWEEN 0 AND 5
         AND "assistant_personalities"."seriousness" BETWEEN 0 AND 5
         AND "assistant_personalities"."empathy" BETWEEN 0 AND 5
         AND "assistant_personalities"."confidence" BETWEEN 0 AND 5
         AND "assistant_personalities"."professionalism" BETWEEN 0 AND 5
         AND "assistant_personalities"."patience" BETWEEN 0 AND 5
         AND "assistant_personalities"."curiosity" BETWEEN 0 AND 5
         AND "assistant_personalities"."emojis" BETWEEN 0 AND 5)
);
--> statement-breakpoint
CREATE TABLE "assistants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(40) NOT NULL,
	"description" varchar(150) DEFAULT 'Soy un asistente útil' NOT NULL,
	"status" "assistant_status" DEFAULT 'active' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"prompt" varchar(5000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linked_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"action_id" uuid NOT NULL,
	"assistant_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"action_type" varchar(90) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linked_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"assistant_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balance_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount_in_usd_cents" bigint NOT NULL,
	"remaining_in_usd_cents" bigint NOT NULL,
	"fee_in_usd_cents" bigint NOT NULL,
	"original_payment_currency" varchar(3),
	"original_payment_amount" bigint,
	"fx_rate_used" numeric(20, 10),
	"job_id" uuid,
	"batch_id" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL,
	"balance_id" uuid NOT NULL,
	CONSTRAINT "balance_transactions_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"balance_in_usd_cents" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "balances_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "collection_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"key" text NOT NULL,
	"size" bigint NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" text,
	"collection_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "collection_content_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(250) NOT NULL,
	"total_size" bigint NOT NULL,
	"file_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "connection_type" NOT NULL,
	"provider" varchar(40) NOT NULL,
	"connected_with" varchar(80) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"subscriptions" jsonb,
	"created_by" text NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text NOT NULL,
	"connected_email" varchar(150) NOT NULL,
	"metadata" jsonb,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"name" varchar(50) NOT NULL,
	"status" "organization_status" DEFAULT 'active' NOT NULL,
	"subscription_tier" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(150) NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_configuration" ADD CONSTRAINT "action_configuration_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_configuration" ADD CONSTRAINT "action_configuration_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_assistant_id_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."assistants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_structure" ADD CONSTRAINT "action_structure_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_structure" ADD CONSTRAINT "action_structure_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_configuration" ADD CONSTRAINT "assistant_configuration_assistant_id_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."assistants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_configuration" ADD CONSTRAINT "assistant_configuration_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_personalities" ADD CONSTRAINT "assistant_personalities_assistant_configuration_id_assistant_configuration_id_fk" FOREIGN KEY ("assistant_configuration_id") REFERENCES "public"."assistant_configuration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_personalities" ADD CONSTRAINT "assistant_personalities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_actions" ADD CONSTRAINT "linked_actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_actions" ADD CONSTRAINT "linked_actions_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_actions" ADD CONSTRAINT "linked_actions_assistant_id_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."assistants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_actions" ADD CONSTRAINT "linked_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_collections" ADD CONSTRAINT "linked_collections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_collections" ADD CONSTRAINT "linked_collections_assistant_id_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."assistants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_collections" ADD CONSTRAINT "linked_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_collections" ADD CONSTRAINT "linked_collections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_balance_id_balances_id_fk" FOREIGN KEY ("balance_id") REFERENCES "public"."balances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balances" ADD CONSTRAINT "balances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_content" ADD CONSTRAINT "collection_content_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_content" ADD CONSTRAINT "collection_content_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_content" ADD CONSTRAINT "collection_content_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_configuration_action_id_idx" ON "action_configuration" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "action_results_action_status_created_idx" ON "action_results" USING btree ("action_id","status","created_at");--> statement-breakpoint
CREATE INDEX "action_structure_action_id_idx" ON "action_structure" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "actions_organization_id_type_idx" ON "actions" USING btree ("organization_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_configuration_assistant_id_idx" ON "assistant_configuration" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "assistants_organization_id_idx" ON "assistants" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "linked_actions_assistant_id_action_id_idx" ON "linked_actions" USING btree ("assistant_id","action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "linked_actions_assistant_id_action_type_idx" ON "linked_actions" USING btree ("assistant_id","action_type","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "linked_collections_assistant_id_collection_id_idx" ON "linked_collections" USING btree ("assistant_id","collection_id");--> statement-breakpoint
CREATE INDEX "linked_collections_collection_id_idx" ON "linked_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "balance_transactions_organization_id_created_at_idx" ON "balance_transactions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "balance_transactions_org_type_created_idx" ON "balance_transactions" USING btree ("organization_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "balances_organization_id_idx" ON "balances" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_content_key_idx" ON "collection_content" USING btree ("key");--> statement-breakpoint
CREATE INDEX "connections_user_id_provider_idx" ON "connections" USING btree ("created_by","provider");--> statement-breakpoint
CREATE INDEX "connections_organization_id_type_idx" ON "connections" USING btree ("organization_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_user_id_service_idx" ON "integrations" USING btree ("user_id","service");--> statement-breakpoint
CREATE INDEX "integrations_expires_at_idx" ON "integrations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");