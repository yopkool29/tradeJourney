-- PostgreSQL Initialization Script for TradeJourney
-- This script is executed when the PostgreSQL container starts for the first time

-- Create the main database (already created by POSTGRES_DB env var)
-- CREATE DATABASE tradejourney;

-- Connect to the tradejourney database
\c tradejourney;

-- Function to create a user schema dynamically
-- This function will be called from the application when a new user database is created
CREATE OR REPLACE FUNCTION create_user_schema(u_id INT, slug TEXT) 
RETURNS TEXT AS $$
DECLARE
    schema_name TEXT := format('user_%s_db_%s', u_id, slug);
BEGIN
    -- Create the schema if it doesn't exist
    -- Note: The NOLOGIN role for this schema will be created by the application
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    RETURN schema_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to drop a user schema (for cleanup/deletion)
CREATE OR REPLACE FUNCTION drop_user_schema(schema_name TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Drop the schema and all its contents
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all user schemas
CREATE OR REPLACE FUNCTION list_user_schemas() 
RETURNS TABLE(schema_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT nspname::TEXT
    FROM pg_namespace
    WHERE nspname LIKE 'user_%_db_%'
    ORDER BY nspname;
END;
$$ LANGUAGE plpgsql;

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'TradeJourney PostgreSQL initialization completed successfully';
END
$$;
