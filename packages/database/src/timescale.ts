import { TimescaleDB } from "@vigillabs/timescale-db-core";

/**
 * Central place to describe how we chunk the `Job` table in TimescaleDB.
 * Prisma still owns the schema, but when we need to (re)apply the hypertable
 * definition we can reuse this builder to generate the SQL.
 */
export const jobHypertable = TimescaleDB.createHypertable('"Job"', {
  if_not_exists: true,
  by_range: {
    column_name: "createdAt",
    chunk_time_interval: "1 month",
  },
});

/**
 * Helper that returns the SQL for either applying (`"up"`) or reverting (`"down"`)
 * the Job hypertable definition. This keeps migrations and ad-hoc scripts in sync.
 */
export function getJobHypertableSql(direction: "up" | "down" = "up"): string {
  return jobHypertable[direction]().build();
}

