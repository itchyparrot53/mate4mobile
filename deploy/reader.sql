-- Run with psql as the database owner connected to the TeslaMate database.
-- Adjust the database name in GRANT CONNECT if it is not teslamate.
-- Refuses an existing role; never takes over an existing account.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE mate4mobile_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE mate4mobile_reader SET default_transaction_read_only = on;
GRANT CONNECT ON DATABASE teslamate TO mate4mobile_reader;
GRANT USAGE ON SCHEMA public TO mate4mobile_reader;
GRANT SELECT ON public.cars, public.settings, public.states, public.positions, public.drives, public.charging_processes, public.charges, public.updates, public.addresses, public.geofences TO mate4mobile_reader;
COMMIT;
-- psql prompts for the new password; do not put it in this file or a shell arg.
\password mate4mobile_reader
