-- =============================================
-- EMAIL TRACKING SCHEMA
-- =============================================

-- Track email opens and clicks
CREATE TABLE IF NOT EXISTS email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  tracking_id TEXT,                 -- The base64url encoded tracking ID
  email TEXT NOT NULL,              -- Recipient email
  tracking_type TEXT NOT NULL CHECK (tracking_type IN ('open', 'click', 'bounce', 'unsubscribe')),
  link_url TEXT,                    -- For click tracking
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,                 -- desktop, mobile, tablet
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (tracking pixel/links need to work without auth)
CREATE POLICY "Users can view their own tracking" ON email_tracking
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public can insert tracking" ON email_tracking
  FOR INSERT WITH CHECK (true);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_id ON email_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_user_id ON email_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_type ON email_tracking(tracking_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_tracking_id ON email_tracking(tracking_id);

-- =============================================
-- BOUNCED EMAILS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS bounced_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  bounce_type TEXT NOT NULL CHECK (bounce_type IN ('hard', 'soft')),
  reason TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  bounced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

ALTER TABLE bounced_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bounces" ON bounced_emails
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service can insert bounces" ON bounced_emails
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bounced_emails_user_id ON bounced_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_bounced_emails_email ON bounced_emails(email);

-- =============================================
-- UNSUBSCRIBED EMAILS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS unsubscribed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

ALTER TABLE unsubscribed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own unsubscribes" ON unsubscribed_emails
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can insert unsubscribes" ON unsubscribed_emails
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_user_id ON unsubscribed_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_email ON unsubscribed_emails(email);

-- =============================================
-- UPDATE campaign_emails to track opens/clicks
-- =============================================
ALTER TABLE campaign_emails 
ADD COLUMN IF NOT EXISTS tracking_id TEXT,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_campaign_emails_tracking_id ON campaign_emails(tracking_id);

-- =============================================
-- HELPER FUNCTION: Increment click count
-- =============================================
CREATE OR REPLACE FUNCTION increment_click_count(tracking_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_emails 
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE tracking_id = tracking_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for tracking updates
ALTER PUBLICATION supabase_realtime ADD TABLE email_tracking;
