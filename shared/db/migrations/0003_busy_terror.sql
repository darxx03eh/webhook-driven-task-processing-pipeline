ALTER TABLE "pipelines" ADD COLUMN "webhook_path" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_webhook_path_unique" UNIQUE("webhook_path");