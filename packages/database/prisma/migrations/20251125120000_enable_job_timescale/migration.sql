-- Attempt to enable TimescaleDB only if the extension is available on the server.
-- This avoids migration failures when the control file is missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'
  ) THEN
    RAISE NOTICE 'TimescaleDB not installed on this server; skipping hypertable setup';
  ELSE
    -- Enable TimescaleDB (safe if already installed)
    CREATE EXTENSION IF NOT EXISTS timescaledb;

    -- Convert the Job table into a hypertable chunked monthly on createdAt
    PERFORM create_hypertable(
      '"public"."Job"',
      'createdAt',
      chunk_time_interval => INTERVAL '1 month',
      if_not_exists => TRUE
    );

    -- Ensure existing hypertables keep the expected chunk interval
    PERFORM set_chunk_time_interval('"public"."Job"', INTERVAL '1 month');
  END IF;
END
$$;

