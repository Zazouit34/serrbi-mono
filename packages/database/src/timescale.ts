import { TimescaleDB } from "@vigillabs/timescale-db-core";

/**
 * Central place to describe how we chunk the `Job` table in TimescaleDB.
 * Prisma still owns the schema, but when we need to (re)apply the hypertable
 * definition we can reuse this builder to generate the SQL.
 */
const baseHypertable = TimescaleDB.createHypertable('"Job"', {
  by_range: {
    column_name: "createdAt",
  },
});

export const jobHypertable: ReturnType<typeof TimescaleDB.createHypertable> =
  baseHypertable;

/**
 * Helper that returns the SQL for either applying (`"up"`) or reverting (`"down"`)
 * the Job hypertable definition. This keeps migrations and ad-hoc scripts in sync.
 */
export function getJobHypertableSql(direction: "up" | "down" = "up"): string {
  const base = jobHypertable[direction]().build();
  if (direction === "up") {
    return `${base};
SELECT set_chunk_time_interval('"public"."Job"', INTERVAL '1 month');`;
  }
  return base;
}

