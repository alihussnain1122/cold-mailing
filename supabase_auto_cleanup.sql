-- =============================================
-- DATA RETENTION UPDATE: DISABLE LEGACY AUTO-CLEANUP
-- =============================================
-- This script removes the old auto-cleanup function so campaign data
-- is retained and can be reused for future campaigns.
-- =============================================

DROP FUNCTION IF EXISTS cleanup_old_campaign_data();
