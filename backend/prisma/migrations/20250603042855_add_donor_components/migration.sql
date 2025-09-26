-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "major" TEXT,
    "bio" TEXT,
    "profile_photo" TEXT,
    "registration_status" TEXT NOT NULL DEFAULT 'pending',
    "registration_paid" BOOLEAN NOT NULL DEFAULT false,
    "funding_goal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount_raised" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_donations" INTEGER NOT NULL DEFAULT 0,
    "donation_goal" DECIMAL(65,30),
    "profile_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "graduation_year" TEXT,
    "location" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "tags" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "public_profile" BOOLEAN NOT NULL DEFAULT true,
    "allow_messages" BOOLEAN NOT NULL DEFAULT true,
    "show_donor_names" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donors" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "address" JSONB,
    "preferences" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "member_since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),
    "total_donated" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "students_supported" INTEGER NOT NULL DEFAULT 0,
    "impact_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor_bookmarks" (
    "id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "bookmarked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "donor_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_donations" (
    "id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "frequency" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "next_payment_date" TIMESTAMP(3) NOT NULL,
    "last_payment_date" TIMESTAMP(3),
    "total_donated" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "payment_count" INTEGER NOT NULL DEFAULT 0,
    "subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "recurring_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "reply_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor_notifications" (
    "id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "student_id" TEXT,
    "donation_id" TEXT,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "donor_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_updates" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "update_type" TEXT NOT NULL DEFAULT 'general',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor_reports" (
    "id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donor_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "donor_id" TEXT,
    "recurring_donation_id" TEXT,
    "tax_receipt_number" TEXT,
    "donor_first_name" TEXT,
    "donor_last_name" TEXT,
    "donor_email" TEXT NOT NULL,
    "donor_phone" TEXT,
    "donor_address" JSONB,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "donation_type" TEXT NOT NULL DEFAULT 'general',
    "target_registry_id" TEXT,
    "payment_method" TEXT NOT NULL,
    "payment_intent_id" TEXT,
    "paypal_order_id" TEXT,
    "transaction_fee" DECIMAL(65,30) NOT NULL,
    "net_amount" DECIMAL(65,30) NOT NULL,
    "tax_receipt_issued" BOOLEAN NOT NULL DEFAULT false,
    "nonprofit_id" TEXT NOT NULL DEFAULT 'gradvillage-501c3',
    "ein" TEXT NOT NULL DEFAULT 'XX-XXXXXXX',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_frequency" TEXT,
    "subscription_id" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "donor_message" TEXT,
    "allow_public_display" BOOLEAN NOT NULL DEFAULT true,
    "allow_student_contact" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "refund_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registries" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_description" TEXT,
    "item_link" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "funded_status" TEXT NOT NULL DEFAULT 'needed',
    "amount_funded" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "donation_goal" DECIMAL(65,30),
    "funding_deadline" TIMESTAMP(3),
    "allow_partial_funding" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_transaction_id" TEXT NOT NULL,
    "provider_fee" DECIMAL(65,30) NOT NULL,
    "provider_fee_currency" TEXT NOT NULL DEFAULT 'USD',
    "gross_amount" DECIMAL(65,30) NOT NULL,
    "net_amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(65,30),
    "merchant_account_id" TEXT NOT NULL,
    "settlement_batch_id" TEXT,
    "risk_score" DOUBLE PRECISION,
    "fraud_status" TEXT,
    "compliance_checked" BOOLEAN NOT NULL DEFAULT false,
    "gateway_response" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_receipts" (
    "id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "receipt_date" TIMESTAMP(3) NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "nonprofit_name" TEXT NOT NULL DEFAULT 'GradVillage',
    "nonprofit_ein" TEXT NOT NULL DEFAULT 'XX-XXXXXXX',
    "nonprofit_address" JSONB NOT NULL,
    "donor_name" TEXT NOT NULL,
    "donor_address" JSONB NOT NULL,
    "donation_amount" DECIMAL(65,30) NOT NULL,
    "donation_date" TIMESTAMP(3) NOT NULL,
    "donation_description" TEXT NOT NULL,
    "issued" BOOLEAN NOT NULL DEFAULT false,
    "issued_at" TIMESTAMP(3),
    "email_sent_at" TIMESTAMP(3),
    "receipt_pdf_url" TEXT,
    "receipt_html" TEXT,
    "generated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_campaigns" (
    "id" TEXT NOT NULL,
    "student_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goal_amount" DECIMAL(65,30) NOT NULL,
    "raised_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "allow_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "nonprofit_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "campaign_type" TEXT NOT NULL DEFAULT 'individual',
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_items" (
    "id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "registry_id" TEXT NOT NULL,
    "amount_allocated" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "welcome_boxes" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "contents" JSONB,
    "tracking_number" TEXT,
    "shipping_address" JSONB,
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "welcome_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'moderator',
    "permissions" JSONB,
    "last_login" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_profile_url_key" ON "students"("profile_url");

-- CreateIndex
CREATE INDEX "students_school_idx" ON "students"("school");

-- CreateIndex
CREATE INDEX "students_major_idx" ON "students"("major");

-- CreateIndex
CREATE INDEX "students_location_idx" ON "students"("location");

-- CreateIndex
CREATE INDEX "students_graduation_year_idx" ON "students"("graduation_year");

-- CreateIndex
CREATE INDEX "students_urgency_idx" ON "students"("urgency");

-- CreateIndex
CREATE INDEX "students_verified_idx" ON "students"("verified");

-- CreateIndex
CREATE INDEX "students_last_active_idx" ON "students"("last_active");

-- CreateIndex
CREATE INDEX "students_public_profile_idx" ON "students"("public_profile");

-- CreateIndex
CREATE UNIQUE INDEX "donors_email_key" ON "donors"("email");

-- CreateIndex
CREATE INDEX "donors_email_idx" ON "donors"("email");

-- CreateIndex
CREATE INDEX "donors_verified_idx" ON "donors"("verified");

-- CreateIndex
CREATE INDEX "donors_total_donated_idx" ON "donors"("total_donated");

-- CreateIndex
CREATE INDEX "donors_member_since_idx" ON "donors"("member_since");

-- CreateIndex
CREATE INDEX "donor_bookmarks_donor_id_idx" ON "donor_bookmarks"("donor_id");

-- CreateIndex
CREATE INDEX "donor_bookmarks_student_id_idx" ON "donor_bookmarks"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "donor_bookmarks_donor_id_student_id_key" ON "donor_bookmarks"("donor_id", "student_id");

-- CreateIndex
CREATE INDEX "recurring_donations_donor_id_idx" ON "recurring_donations"("donor_id");

-- CreateIndex
CREATE INDEX "recurring_donations_student_id_idx" ON "recurring_donations"("student_id");

-- CreateIndex
CREATE INDEX "recurring_donations_active_idx" ON "recurring_donations"("active");

-- CreateIndex
CREATE INDEX "recurring_donations_next_payment_date_idx" ON "recurring_donations"("next_payment_date");

-- CreateIndex
CREATE INDEX "messages_donor_id_idx" ON "messages"("donor_id");

-- CreateIndex
CREATE INDEX "messages_student_id_idx" ON "messages"("student_id");

-- CreateIndex
CREATE INDEX "messages_read_idx" ON "messages"("read");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "donor_notifications_donor_id_idx" ON "donor_notifications"("donor_id");

-- CreateIndex
CREATE INDEX "donor_notifications_type_idx" ON "donor_notifications"("type");

-- CreateIndex
CREATE INDEX "donor_notifications_read_idx" ON "donor_notifications"("read");

-- CreateIndex
CREATE INDEX "donor_notifications_created_at_idx" ON "donor_notifications"("created_at");

-- CreateIndex
CREATE INDEX "student_updates_student_id_idx" ON "student_updates"("student_id");

-- CreateIndex
CREATE INDEX "student_updates_published_idx" ON "student_updates"("published");

-- CreateIndex
CREATE INDEX "student_updates_created_at_idx" ON "student_updates"("created_at");

-- CreateIndex
CREATE INDEX "donor_reports_donor_id_idx" ON "donor_reports"("donor_id");

-- CreateIndex
CREATE INDEX "donor_reports_student_id_idx" ON "donor_reports"("student_id");

-- CreateIndex
CREATE INDEX "donor_reports_status_idx" ON "donor_reports"("status");

-- CreateIndex
CREATE INDEX "donor_reports_created_at_idx" ON "donor_reports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "donations_tax_receipt_number_key" ON "donations"("tax_receipt_number");

-- CreateIndex
CREATE INDEX "donations_student_id_idx" ON "donations"("student_id");

-- CreateIndex
CREATE INDEX "donations_donor_id_idx" ON "donations"("donor_id");

-- CreateIndex
CREATE INDEX "donations_donor_email_idx" ON "donations"("donor_email");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE INDEX "donations_created_at_idx" ON "donations"("created_at");

-- CreateIndex
CREATE INDEX "donations_tax_receipt_number_idx" ON "donations"("tax_receipt_number");

-- CreateIndex
CREATE INDEX "donations_is_recurring_idx" ON "donations"("is_recurring");

-- CreateIndex
CREATE INDEX "donations_donation_type_idx" ON "donations"("donation_type");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_donation_id_key" ON "payment_transactions"("donation_id");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_idx" ON "payment_transactions"("provider");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_transaction_id_idx" ON "payment_transactions"("provider_transaction_id");

-- CreateIndex
CREATE INDEX "payment_transactions_created_at_idx" ON "payment_transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tax_receipts_donation_id_key" ON "tax_receipts"("donation_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_receipts_receipt_number_key" ON "tax_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "tax_receipts_receipt_number_idx" ON "tax_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "tax_receipts_tax_year_idx" ON "tax_receipts"("tax_year");

-- CreateIndex
CREATE INDEX "tax_receipts_receipt_date_idx" ON "tax_receipts"("receipt_date");

-- CreateIndex
CREATE INDEX "donation_campaigns_student_id_idx" ON "donation_campaigns"("student_id");

-- CreateIndex
CREATE INDEX "donation_campaigns_is_active_idx" ON "donation_campaigns"("is_active");

-- CreateIndex
CREATE INDEX "donation_campaigns_nonprofit_approved_idx" ON "donation_campaigns"("nonprofit_approved");

-- CreateIndex
CREATE INDEX "donation_items_donation_id_idx" ON "donation_items"("donation_id");

-- CreateIndex
CREATE INDEX "donation_items_registry_id_idx" ON "donation_items"("registry_id");

-- CreateIndex
CREATE UNIQUE INDEX "welcome_boxes_student_id_key" ON "welcome_boxes"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- AddForeignKey
ALTER TABLE "donor_bookmarks" ADD CONSTRAINT "donor_bookmarks_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donor_bookmarks" ADD CONSTRAINT "donor_bookmarks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_donations" ADD CONSTRAINT "recurring_donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_donations" ADD CONSTRAINT "recurring_donations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donor_notifications" ADD CONSTRAINT "donor_notifications_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_updates" ADD CONSTRAINT "student_updates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donor_reports" ADD CONSTRAINT "donor_reports_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_target_registry_id_fkey" FOREIGN KEY ("target_registry_id") REFERENCES "registries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registries" ADD CONSTRAINT "registries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_receipts" ADD CONSTRAINT "tax_receipts_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_receipts" ADD CONSTRAINT "tax_receipts_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_campaigns" ADD CONSTRAINT "donation_campaigns_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_campaigns" ADD CONSTRAINT "donation_campaigns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "registries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welcome_boxes" ADD CONSTRAINT "welcome_boxes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
