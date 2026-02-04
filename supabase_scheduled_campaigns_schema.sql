-- =============================================
-- SCHEDULED CAMPAIGNS & EMAIL SEQUENCES SCHEMA
-- =============================================

-- =============================================
-- ADD scheduled_at COLUMN TO campaigns TABLE
-- =============================================
-- Add scheduled_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN scheduled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add 'scheduled' status to the check constraint
-- First drop the old constraint, then add new one with 'scheduled' status
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('idle', 'running', 'paused', 'completed', 'error', 'scheduled'));

-- Index for finding scheduled campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at 
  ON campaigns(scheduled_at) 
  WHERE scheduled_at IS NOT NULL AND status = 'scheduled';


-- =============================================
-- EMAIL SEQUENCES TABLE
-- =============================================
-- Stores multi-step email sequence definitions
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sequences
CREATE POLICY "Users can view their own sequences" ON email_sequences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sequences" ON email_sequences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sequences" ON email_sequences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sequences" ON email_sequences
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- EMAIL SEQUENCE STEPS TABLE
-- =============================================
-- Individual steps within a sequence
CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 1,  -- Days to wait after previous step
  delay_hours INTEGER NOT NULL DEFAULT 0, -- Additional hours to wait
  condition TEXT DEFAULT 'always', -- 'always', 'if_no_reply', 'if_no_open'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sequence_id, step_number)
);

-- Enable RLS
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sequence steps
CREATE POLICY "Users can view their own sequence steps" ON email_sequence_steps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sequence steps" ON email_sequence_steps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sequence steps" ON email_sequence_steps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sequence steps" ON email_sequence_steps
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster step lookups
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON email_sequence_steps(sequence_id);


-- =============================================
-- CONTACT SEQUENCE STATUS TABLE
-- =============================================
-- Tracks which step each contact is on in a sequence
CREATE TABLE IF NOT EXISTS contact_sequence_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'unsubscribed')),
  last_email_sent_at TIMESTAMPTZ,
  next_email_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(contact_id, sequence_id)
);

-- Enable RLS
ALTER TABLE contact_sequence_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact sequence status
CREATE POLICY "Users can view their own contact sequence status" ON contact_sequence_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact sequence status" ON contact_sequence_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact sequence status" ON contact_sequence_status
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact sequence status" ON contact_sequence_status
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_contact_sequence_status_next_email 
  ON contact_sequence_status(next_email_at) 
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_contact_sequence_status_sequence 
  ON contact_sequence_status(sequence_id);


-- =============================================
-- ONBOARDING STATUS TABLE
-- =============================================
-- Tracks user's onboarding progress
CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  smtp_configured BOOLEAN DEFAULT false,
  first_template_created BOOLEAN DEFAULT false,
  first_contact_imported BOOLEAN DEFAULT false,
  test_email_sent BOOLEAN DEFAULT false,
  first_campaign_sent BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_skipped BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding
CREATE POLICY "Users can view their own onboarding status" ON user_onboarding
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding status" ON user_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding status" ON user_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_sequences_updated_at ON email_sequences;
CREATE TRIGGER trigger_sequences_updated_at
  BEFORE UPDATE ON email_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_sequence_steps_updated_at ON email_sequence_steps;
CREATE TRIGGER trigger_sequence_steps_updated_at
  BEFORE UPDATE ON email_sequence_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_contact_sequence_updated_at ON contact_sequence_status;
CREATE TRIGGER trigger_contact_sequence_updated_at
  BEFORE UPDATE ON contact_sequence_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_onboarding_updated_at ON user_onboarding;
CREATE TRIGGER trigger_onboarding_updated_at
  BEFORE UPDATE ON user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
