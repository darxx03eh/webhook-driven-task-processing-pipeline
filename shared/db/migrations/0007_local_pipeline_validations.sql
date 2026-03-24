ALTER TABLE "subscribers"
ADD CONSTRAINT "subscribers_pipeline_id_url_unique" UNIQUE("pipeline_id","url");

ALTER TABLE "pipelines_steps"
ADD CONSTRAINT "pipelines_steps_pipeline_id_step_order_unique" UNIQUE("pipeline_id","step_order");
