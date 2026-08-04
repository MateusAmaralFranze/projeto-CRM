-- CreateEnum
CREATE TYPE "workspace_role" AS ENUM ('owner', 'admin', 'traffic_manager', 'closer', 'viewer');

-- CreateEnum
CREATE TYPE "ad_platform" AS ENUM ('meta', 'google', 'tiktok', 'kwai', 'pinterest');

-- CreateEnum
CREATE TYPE "checkout_platform" AS ENUM ('hotmart', 'kiwify', 'eduzz', 'braip', 'monetizze', 'perfectpay', 'shopify', 'yampi', 'nuvemshop', 'stripe', 'pagseguro', 'mercadopago', 'generic_webhook');

-- CreateEnum
CREATE TYPE "connection_status" AS ENUM ('active', 'expired', 'error', 'disconnected');

-- CreateEnum
CREATE TYPE "sale_status" AS ENUM ('pending', 'paid', 'refunded', 'chargeback', 'canceled');

-- CreateEnum
CREATE TYPE "refund_type" AS ENUM ('refund', 'chargeback');

-- CreateEnum
CREATE TYPE "attribution_model" AS ENUM ('last_click', 'first_click');

-- CreateEnum
CREATE TYPE "attribution_confidence" AS ENUM ('exact_click_id', 'utm_match', 'unattributed');

-- CreateEnum
CREATE TYPE "lead_stage" AS ENUM ('new', 'contact', 'negotiation', 'won', 'lost');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- CreateEnum
CREATE TYPE "alert_scope" AS ENUM ('workspace', 'campaign', 'ad_set', 'ad');

-- CreateEnum
CREATE TYPE "alert_operator" AS ENUM ('gt', 'lt', 'gte', 'lte');

-- CreateTable
CREATE TABLE "workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT,
    "plan_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "two_factor_secret" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_member" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "workspace_role" NOT NULL,
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),

    CONSTRAINT "workspace_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_ad_accounts" INTEGER NOT NULL,
    "max_checkout_connections" INTEGER NOT NULL,
    "max_users" INTEGER NOT NULL,
    "max_events_month" BIGINT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "stripe_price_id" TEXT,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "subscription_status" NOT NULL,
    "stripe_subscription_id" TEXT,
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_account_connection" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "platform" "ad_platform" NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "status" "connection_status" NOT NULL DEFAULT 'active',
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_account_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_connection" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "platform" "checkout_platform" NOT NULL,
    "external_account_id" TEXT,
    "webhook_secret" TEXT NOT NULL,
    "api_credentials" TEXT,
    "status" "connection_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "ad_account_connection_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_set" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT,

    CONSTRAINT "ad_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "ad_set_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creative_thumbnail_url" TEXT,
    "status" TEXT,

    CONSTRAINT "ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_metric_snapshot" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "spend_cents" BIGINT NOT NULL DEFAULT 0,
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "clicks" BIGINT NOT NULL DEFAULT 0,
    "reach" BIGINT NOT NULL DEFAULT 0,
    "frequency" DECIMAL(10,4),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_metric_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utm_link" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "ad_id" TEXT,
    "short_code" TEXT NOT NULL,
    "destination_url" TEXT NOT NULL,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utm_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "utm_link_id" TEXT,
    "click_id" TEXT NOT NULL,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "checkout_connection_id" TEXT NOT NULL,
    "product_id" TEXT,
    "external_id" TEXT NOT NULL,
    "status" "sale_status" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "customer_email_hash" TEXT,
    "click_id" TEXT,
    "raw_utm_source" TEXT,
    "raw_utm_medium" TEXT,
    "raw_utm_campaign" TEXT,
    "raw_utm_content" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "reason" TEXT,
    "type" "refund_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_attribution" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "click_id" TEXT,
    "ad_id" TEXT,
    "attribution_model" "attribution_model" NOT NULL,
    "confidence" "attribution_confidence" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_attribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "click_id" TEXT,
    "stage" "lead_stage" NOT NULL DEFAULT 'new',
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_interaction" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_target" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "target_amount_cents" BIGINT NOT NULL,

    CONSTRAINT "sales_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rule" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "scope" "alert_scope" NOT NULL,
    "scope_id" TEXT,
    "operator" "alert_operator" NOT NULL,
    "threshold" DECIMAL NOT NULL,
    "channels" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_event" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "alert_rule_id" TEXT NOT NULL,
    "triggered_value" DECIMAL NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "alert_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics_daily" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "campaign_id" TEXT,
    "ad_set_id" TEXT,
    "ad_id" TEXT,
    "spend_cents" BIGINT NOT NULL DEFAULT 0,
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "clicks" BIGINT NOT NULL DEFAULT 0,
    "reach" BIGINT NOT NULL DEFAULT 0,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "revenue_cents" BIGINT NOT NULL DEFAULT 0,
    "refund_cents" BIGINT NOT NULL DEFAULT 0,
    "product_cost_cents" BIGINT NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_webhook" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbound_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_slug_key" ON "workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_member_workspace_id_user_id_key" ON "workspace_member"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_account_connection_workspace_id_platform_external_accoun_key" ON "ad_account_connection"("workspace_id", "platform", "external_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_connection_workspace_id_platform_external_account__key" ON "checkout_connection"("workspace_id", "platform", "external_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_ad_account_connection_id_external_id_key" ON "campaign"("ad_account_connection_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_set_campaign_id_external_id_key" ON "ad_set"("campaign_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_ad_set_id_external_id_key" ON "ad"("ad_set_id", "external_id");

-- CreateIndex
CREATE INDEX "ad_metric_snapshot_workspace_id_date_idx" ON "ad_metric_snapshot"("workspace_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_metric_snapshot_ad_id_date_key" ON "ad_metric_snapshot"("ad_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "utm_link_short_code_key" ON "utm_link"("short_code");

-- CreateIndex
CREATE UNIQUE INDEX "click_click_id_key" ON "click"("click_id");

-- CreateIndex
CREATE INDEX "click_workspace_id_occurred_at_idx" ON "click"("workspace_id", "occurred_at");

-- CreateIndex
CREATE INDEX "sale_workspace_id_created_at_idx" ON "sale"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "sale_click_id_idx" ON "sale"("click_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_checkout_connection_id_external_id_key" ON "sale"("checkout_connection_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_attribution_sale_id_attribution_model_key" ON "sale_attribution"("sale_id", "attribution_model");

-- CreateIndex
CREATE INDEX "metrics_daily_workspace_id_date_campaign_id_idx" ON "metrics_daily"("workspace_id", "date", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "metrics_daily_workspace_id_date_campaign_id_ad_set_id_ad_id_key" ON "metrics_daily"("workspace_id", "date", "campaign_id", "ad_set_id", "ad_id");

-- AddForeignKey
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_account_connection" ADD CONSTRAINT "ad_account_connection_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_connection" ADD CONSTRAINT "checkout_connection_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_ad_account_connection_id_fkey" FOREIGN KEY ("ad_account_connection_id") REFERENCES "ad_account_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_set" ADD CONSTRAINT "ad_set_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_set" ADD CONSTRAINT "ad_set_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad" ADD CONSTRAINT "ad_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad" ADD CONSTRAINT "ad_ad_set_id_fkey" FOREIGN KEY ("ad_set_id") REFERENCES "ad_set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_metric_snapshot" ADD CONSTRAINT "ad_metric_snapshot_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_metric_snapshot" ADD CONSTRAINT "ad_metric_snapshot_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utm_link" ADD CONSTRAINT "utm_link_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utm_link" ADD CONSTRAINT "utm_link_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click" ADD CONSTRAINT "click_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click" ADD CONSTRAINT "click_utm_link_id_fkey" FOREIGN KEY ("utm_link_id") REFERENCES "utm_link"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_checkout_connection_id_fkey" FOREIGN KEY ("checkout_connection_id") REFERENCES "checkout_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_attribution" ADD CONSTRAINT "sale_attribution_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_attribution" ADD CONSTRAINT "sale_attribution_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_attribution" ADD CONSTRAINT "sale_attribution_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "click"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_attribution" ADD CONSTRAINT "sale_attribution_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interaction" ADD CONSTRAINT "lead_interaction_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interaction" ADD CONSTRAINT "lead_interaction_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interaction" ADD CONSTRAINT "lead_interaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_target" ADD CONSTRAINT "sales_target_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_target" ADD CONSTRAINT "sales_target_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_event" ADD CONSTRAINT "alert_event_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_event" ADD CONSTRAINT "alert_event_alert_rule_id_fkey" FOREIGN KEY ("alert_rule_id") REFERENCES "alert_rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics_daily" ADD CONSTRAINT "metrics_daily_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics_daily" ADD CONSTRAINT "metrics_daily_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics_daily" ADD CONSTRAINT "metrics_daily_ad_set_id_fkey" FOREIGN KEY ("ad_set_id") REFERENCES "ad_set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics_daily" ADD CONSTRAINT "metrics_daily_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_webhook" ADD CONSTRAINT "outbound_webhook_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
