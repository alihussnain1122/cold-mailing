-- =============================================
-- CONTACTS TABLE - Add personalization fields
-- =============================================

-- Add new columns for personalization variables
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS custom1 TEXT,
ADD COLUMN IF NOT EXISTS custom2 TEXT,
ADD COLUMN IF NOT EXISTS custom3 TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_first_name ON contacts(first_name);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);

-- =============================================
-- CAMPAIGN_EMAILS TABLE - Add personalization data
-- =============================================

-- Store the contact's personalization data at time of campaign creation
-- This ensures if contact is updated later, the original values are preserved
ALTER TABLE campaign_emails
ADD COLUMN IF NOT EXISTS contact_first_name TEXT,
ADD COLUMN IF NOT EXISTS contact_last_name TEXT,
ADD COLUMN IF NOT EXISTS contact_company TEXT,
ADD COLUMN IF NOT EXISTS contact_website TEXT,
ADD COLUMN IF NOT EXISTS contact_custom1 TEXT,
ADD COLUMN IF NOT EXISTS contact_custom2 TEXT,
ADD COLUMN IF NOT EXISTS contact_custom3 TEXT;

-- =============================================
-- View: Contacts with computed full name
-- =============================================
CREATE OR REPLACE VIEW contacts_with_names AS
SELECT 
  id,
  user_id,
  email,
  name,
  first_name,
  last_name,
  COALESCE(
    name,
    CASE 
      WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
        THEN first_name || ' ' || last_name
      WHEN first_name IS NOT NULL 
        THEN first_name
      ELSE NULL
    END
  ) AS display_name,
  company,
  website,
  custom1,
  custom2,
  custom3,
  created_at
FROM contacts;

-- Grant access to the view
GRANT SELECT ON contacts_with_names TO authenticated;

-- =============================================
-- Sample data for testing (optional, commented out)
-- =============================================
-- INSERT INTO contacts (user_id, email, first_name, last_name, company, website) VALUES
-- ('your-user-id', 'john@acme.com', 'John', 'Doe', 'Acme Corp', 'acme.com'),
-- ('your-user-id', 'jane@startup.io', 'Jane', 'Smith', 'Startup Inc', 'startup.io'),
-- ('your-user-id', 'bob@company.org', 'Bob', 'Johnson', 'Company LLC', 'company.org');
