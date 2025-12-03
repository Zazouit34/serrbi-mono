-- Enable TimescaleDB extension (safe if already installed)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert the Job table into a hypertable chunked monthly on createdAt
SELECT
  create_hypertable(
    '"public"."Job"',
    'createdAt',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
  );

-- Ensure existing hypertables keep the expected chunk interval
SELECT set_chunk_time_interval('"public"."Job"', INTERVAL '1 month');

