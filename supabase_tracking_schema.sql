-- =============================================
-- TRACKING REMOVAL / DECOMMISSION SCRIPT
-- =============================================
-- This project no longer uses open/click analytics tracking.
-- Run this script to remove old tracking artifacts.

DROP FUNCTION IF EXISTS increment_click_count(TEXT);

DROP TABLE IF EXISTS email_tracking;

ALTER TABLE campaign_emails
  DROP COLUMN IF EXISTS tracking_id,
  DROP COLUMN IF EXISTS opened_at,
  DROP COLUMN IF EXISTS open_count,
  DROP COLUMN IF EXISTS click_count;
