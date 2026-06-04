-- Script de réinitialisation de la base de données PnlTracker
-- ⚠️ ATTENTION : Ce script supprime TOUTES les données et réinitialise complètement la base

-- Supprimer tous les schémas utilisateur AVANT les rôles (pour éviter les erreurs de dépendances)
DO $$
DECLARE
    schema_rec RECORD;
BEGIN
    FOR schema_rec IN 
        SELECT nspname 
        FROM pg_namespace 
        WHERE nspname LIKE 'user_%_db_%'
    LOOP
        EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_rec.nspname);
        RAISE NOTICE 'Dropped schema: %', schema_rec.nspname;
    END LOOP;
END $$;

-- Supprimer tous les rôles utilisateur (NOLOGIN) après les schémas
DO $$
DECLARE
    role_rec RECORD;
BEGIN
    FOR role_rec IN 
        SELECT rolname 
        FROM pg_roles 
        WHERE rolname LIKE 'role_user_%_db_%'
    LOOP
        EXECUTE format('DROP ROLE IF EXISTS %I', role_rec.rolname);
        RAISE NOTICE 'Dropped role: %', role_rec.rolname;
    END LOOP;
END $$;

-- Supprimer et recréer le schéma public (Auth)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO pnltracker;
GRANT ALL ON SCHEMA public TO public;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✓ Base de données réinitialisée avec succès';
    RAISE NOTICE '  - Tous les rôles utilisateur supprimés';
    RAISE NOTICE '  - Tous les schémas utilisateur supprimés';
    RAISE NOTICE '  - Schéma public réinitialisé';
    RAISE NOTICE '  - Toutes les tables, fonctions et séquences supprimées';
    RAISE NOTICE '';
END $$;
