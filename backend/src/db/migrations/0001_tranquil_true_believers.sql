CREATE TABLE "pipelines_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"step_type" text NOT NULL,
	"step_config" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "stop_reason" text;--> statement-breakpoint
ALTER TABLE "pipelines_steps" ADD CONSTRAINT "pipelines_steps_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" DROP COLUMN "action_type";--> statement-breakpoint
ALTER TABLE "pipelines" DROP COLUMN "actions_config";