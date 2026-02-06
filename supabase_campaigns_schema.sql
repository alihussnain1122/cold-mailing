-- =============================================
-- CAMPAIGNS TABLE - Stores campaign state
-- =============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'completed', 'error')),
  total_contacts INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  current_index INTEGER NOT NULL DEFAULT 0,
  current_email TEXT,
  current_template TEXT,
  delay_min INTEGER NOT NULL DEFAULT 10000,
  delay_max INTEGER NOT NULL DEFAULT 90000,
  sender_name TEXT DEFAULT 'Support Team',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- =============================================
-- CAMPAIGN_EMAILS TABLE - Tracks individual email status
-- =============================================
CREATE TABLE IF NOT EXISTS campaign_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  template_subject TEXT NOT NULL,
  template_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE campaign_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own campaign emails" ON campaign_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaign emails" ON campaign_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign emails" ON campaign_emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign emails" ON campaign_emails
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_emails_campaign_id ON campaign_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_status ON campaign_emails(status);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_sort_order ON campaign_emails(sort_order);

-- =============================================
-- FUNCTION: Update campaign updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_campaigns_updated_at ON campaigns;
CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_updated_at();
-- =============================================
-- ADD NEW COLUMNS FOR SERVER-SIDE CAMPAIGN EXECUTION
-- =============================================

-- Add columns if they don't exist
DO $$
BEGIN
  -- Add total_emails column (renamed from total_contacts for clarity)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='total_emails') THEN
    ALTER TABLE campaigns ADD COLUMN total_emails INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- Add template columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='template_subject') THEN
    ALTER TABLE campaigns ADD COLUMN template_subject TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='template_body') THEN
    ALTER TABLE campaigns ADD COLUMN template_body TEXT;
  END IF;
  
  -- Add delay_ms column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='delay_ms') THEN
    ALTER TABLE campaigns ADD COLUMN delay_ms INTEGER NOT NULL DEFAULT 15000;
  END IF;
  
  -- Add paused_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='paused_at') THEN
    ALTER TABLE campaigns ADD COLUMN paused_at TIMESTAMPTZ;
  END IF;
  
  -- Add name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='name') THEN
    ALTER TABLE campaigns ADD COLUMN name TEXT;
  END IF;
END $$;

-- Update campaign_emails table for server-side execution
DO $$
BEGIN
  -- Add contact_data JSON column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_emails' AND column_name='contact_data') THEN
    ALTER TABLE campaign_emails ADD COLUMN contact_data JSONB;
  END IF;
  
  -- Rename contact_email to email if needed (keep both for compatibility)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_emails' AND column_name='email') THEN
    ALTER TABLE campaign_emails ADD COLUMN email TEXT;
    UPDATE campaign_emails SET email = contact_email WHERE email IS NULL;
  END IF;
  
  -- Add tracking_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_emails' AND column_name='tracking_id') THEN
    ALTER TABLE campaign_emails ADD COLUMN tracking_id TEXT;
  END IF;
  
  -- Add email_hash column for lookup without exposing email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_emails' AND column_name='email_hash') THEN
    ALTER TABLE campaign_emails ADD COLUMN email_hash TEXT;
  END IF;
  
  -- Add message_id column for tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_emails' AND column_name='message_id') THEN
    ALTER TABLE campaign_emails ADD COLUMN message_id TEXT;
  END IF;
  
  -- Add failed_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_emails' AND column_name='failed_at') THEN
    ALTER TABLE campaign_emails ADD COLUMN failed_at TIMESTAMPTZ;
  END IF;
END $$;

-- =============================================
-- FIX EXISTING DATA BEFORE CONSTRAINT CHANGES
-- =============================================

-- Normalize any invalid campaign status values
UPDATE campaigns 
SET status = 'completed' 
WHERE status IS NULL OR status NOT IN ('idle', 'running', 'paused', 'completed', 'error', 'stopped');

-- Normalize any invalid campaign_emails status values  
UPDATE campaign_emails 
SET status = 'failed' 
WHERE status IS NULL OR status NOT IN ('pending', 'sent', 'failed', 'cancelled');

-- Drop old constraints (ignore if they don't exist)
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaign_emails DROP CONSTRAINT IF EXISTS campaign_emails_status_check;

-- Add new constraints
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('idle', 'running', 'paused', 'completed', 'error', 'stopped'));

ALTER TABLE campaign_emails ADD CONSTRAINT campaign_emails_status_check 
  CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'));

-- =============================================
-- RPC FUNCTIONS FOR ATOMIC UPDATES
-- =============================================

-- Function to increment sent count atomically
CREATE OR REPLACE FUNCTION increment_campaign_sent(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE campaigns 
  SET sent_count = sent_count + 1,
      updated_at = NOW()
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment failed count atomically
CREATE OR REPLACE FUNCTION increment_campaign_failed(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE campaigns 
  SET failed_count = failed_count + 1,
      updated_at = NOW()
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_campaign_sent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_campaign_failed(UUID) TO authenticated;

-- =============================================
-- REALTIME SUBSCRIPTION FOR CAMPAIGNS
-- =============================================

-- Enable realtime for campaigns table (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE campaign_emails;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;