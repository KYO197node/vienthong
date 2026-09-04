import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_billing_cycle" AS ENUM('daily', 'weekly', 'monthly', '1m', '3m', '6m', '12m', 'other');
  ALTER TABLE "products" ADD COLUMN "billing_cycle" "enum_products_billing_cycle" DEFAULT 'monthly';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN "billing_cycle";
  DROP TYPE "public"."enum_products_billing_cycle";`)
}
