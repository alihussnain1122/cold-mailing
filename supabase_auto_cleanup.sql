-- =============================================
-- AUTO-CLEANUP: DELETE OLD CAMPAIGN DATA
-- =============================================
-- This ensures user privacy by automatically deleting
-- templates and contacts 48 hours after campaign completion
-- =============================================

-- Function to cleanup old campaign data
CREATE OR REPLACE FUNCTION cleanup_old_campaign_data()
RETURNS TABLE (
  campaigns_deleted INTEGER,
  emails_deleted INTEGER
) AS $$
DECLARE
  cutoff_time TIMESTAMPTZ;
  v_campaigns_deleted INTEGER := 0;
  v_emails_deleted INTEGER := 0;
BEGIN
  -- Calculate cutoff time (48 hours ago)
  cutoff_time := NOW() - INTERVAL '48 hours';
  
  -- Delete campaign_emails for completed campaigns older than 48 hours
  WITH deleted_emails AS (
    DELETE FROM campaign_emails
    WHERE campaign_id IN (
      SELECT id FROM campaigns
      WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at < cutoff_time
    )
    RETURNING *
  )
  SELECT COUNT(*) INTO v_emails_deleted FROM deleted_emails;
  
  -- Delete the campaigns themselves
  WITH deleted_campaigns AS (
    DELETE FROM campaigns
    WHERE status = 'completed'
    AND completed_at IS NOT NULL
    AND completed_at < cutoff_time
    RETURNING *
  )
  SELECT COUNT(*) INTO v_campaigns_deleted FROM deleted_campaigns;
  
  -- Return counts
  RETURN QUERY SELECT v_campaigns_deleted, v_emails_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- OPTIONAL: Schedule with pg_cron (if enabled)
-- =============================================
-- Uncomment the following if pg_cron is enabled in your Supabase project:
-- 
-- SELECT cron.schedule(
--   'cleanup-old-campaigns',
--   '0 */6 * * *',  -- Every 6 hours
--   $$SELECT cleanup_old_campaign_data()$$
-- );

-- =============================================
-- MANUAL CLEANUP QUERY
-- =============================================
-- To manually run cleanup, execute:
-- SELECT * FROM cleanup_old_campaign_data();

-- =============================================
-- CHECK WHAT WILL BE DELETED (DRY RUN)
-- =============================================
-- Run this to see what will be deleted without actually deleting:
-- 
-- SELECT 
--   c.id,
--   c.user_id,
--   c.completed_at,
--   c.total_contacts,
--   NOW() - c.completed_at AS age,
--   (SELECT COUNT(*) FROM campaign_emails WHERE campaign_id = c.id) AS email_count
-- FROM campaigns c
-- WHERE c.status = 'completed'
--   AND c.completed_at IS NOT NULL
--   AND c.completed_at < NOW() - INTERVAL '48 hours'
-- ORDER BY c.completed_at DESC;
