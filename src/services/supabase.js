import { supabase } from '../config/supabase';

// ==================
// TEMPLATES
// ==================
export const templatesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async add(template) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name: template.name || 'Untitled Template',
        subject: template.subject,
        body: template.body,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, template) {
    const { data, error } = await supabase
      .from('templates')
      .update({
        name: template.name,
        subject: template.subject,
        body: template.body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async bulkAdd(templates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const records = templates.map(t => ({
      user_id: user.id,
      name: t.name || 'Imported Template',
      subject: t.subject,
      body: t.body,
    }));

    const { data, error } = await supabase
      .from('templates')
      .insert(records)
      .select();
    
    if (error) throw error;
    return data;
  },

  async deleteAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('user_id', user.id);
    
    if (error) throw error;
  }
};

// ==================
// CONTACTS
// ==================
export const contactsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async add(email, name = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        email,
        name,
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Contact already exists');
      }
      throw error;
    }
    return data;
  },

  async bulkAdd(contacts) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Filter out duplicates and format
    const records = contacts.map(c => ({
      user_id: user.id,
      email: typeof c === 'string' ? c : c.email,
      name: typeof c === 'string' ? null : c.name,
    }));

    const { data, error } = await supabase
      .from('contacts')
      .upsert(records, { onConflict: 'user_id,email', ignoreDuplicates: true })
      .select();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteByEmail(email) {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('email', email);
    
    if (error) throw error;
  },

  async deleteAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('user_id', user.id);
    
    if (error) throw error;
  }
};

// ==================
// SMTP CONFIG - Synced across devices
// ==================
export const smtpService = {
  async get() {
    const { data, error } = await supabase
      .from('smtp_configs')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    
    if (data) {
      // Get password from localStorage (device-specific for security)
      const storedPass = localStorage.getItem(`smtp_pass_${data.id}`);
      return {
        id: data.id,
        smtpHost: data.smtp_host,
        smtpPort: data.smtp_port?.toString() || '587',
        emailUser: data.email_user,
        emailPass: storedPass || '',
        senderName: data.sender_name || 'Support Team',
      };
    }
    return null;
  },

  async save(config) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('smtp_configs')
      .upsert({
        user_id: user.id,
        smtp_host: config.smtpHost,
        smtp_port: parseInt(config.smtpPort) || 587,
        email_user: config.emailUser,
        sender_name: config.senderName || 'Support Team',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    
    // Store password in localStorage (device-specific for security)
    if (config.emailPass) {
      localStorage.setItem(`smtp_pass_${data.id}`, config.emailPass);
    }
    
    return data;
  },

  async delete() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get config ID first to clear localStorage
    const { data: config } = await supabase
      .from('smtp_configs')
      .select('id')
      .single();
    
    if (config) {
      localStorage.removeItem(`smtp_pass_${config.id}`);
    }

    const { error } = await supabase
      .from('smtp_configs')
      .delete()
      .eq('user_id', user.id);
    
    if (error) throw error;
  },

  // Check if configured (has all required fields)
  async isConfigured() {
    const config = await this.get();
    return !!(config?.smtpHost && config?.emailUser && config?.emailPass);
  }
};

// ==================
// CAMPAIGNS - Synced across devices
// ==================
export const campaignService = {
  // Get all campaigns for analytics
  async getAll() {
const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    return data || [];
  },

  // Get active campaign (running or paused)
  async getActive() {
    console.log('\n========== Getting Active Campaign ==========');
    console.log('Checking auth session...');
    
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session exists:', !!session);
    console.log('User ID:', session?.user?.id || 'NOT LOGGED IN');
    
    if (!session) {
      console.warn('⚠️  No active session - user not logged in');
      return null;
    }
    
    console.log('Querying campaigns table...');
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .in('status', ['running', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Campaign query error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      if (error.code !== 'PGRST116') throw error;
    }
    
    console.log('Campaign found:', !!data);
    if (data) console.log('Campaign ID:', data.id);
    console.log('============================================\n');
    
    return data;
  },

  // Get campaign by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create a new campaign
  async create(contacts, config) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create the campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        status: 'running',
        total_contacts: contacts.length,
        sent_count: 0,
        failed_count: 0,
        current_index: 0,
        delay_min: config.delayMin || 10000,
        delay_max: config.delayMax || 90000,
        sender_name: config.senderName || 'Support Team',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (campaignError) throw campaignError;

    // Create campaign_emails records for each contact
    const emailRecords = contacts.map((contact, index) => ({
      campaign_id: campaign.id,
      user_id: user.id,
      contact_email: contact.email,
      contact_name: contact.name || '',
      template_subject: contact.template.subject,
      template_body: contact.template.body,
      status: 'pending',
      sort_order: index,
    }));

    const { error: emailsError } = await supabase
      .from('campaign_emails')
      .insert(emailRecords);
    
    if (emailsError) throw emailsError;

    return campaign;
  },

  // Update campaign status
  async updateStatus(campaignId, status, extraFields = {}) {
    const updateData = { status, ...extraFields };
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update campaign progress
  async updateProgress(campaignId, updates) {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get pending emails for a campaign
  async getPendingEmails(campaignId) {
    const { data, error } = await supabase
      .from('campaign_emails')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get all emails for a campaign
  async getCampaignEmails(campaignId) {
    const { data, error } = await supabase
      .from('campaign_emails')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Mark an email as sent
  async markEmailSent(emailId, trackingId = null) {
    const updateData = { 
      status: 'sent', 
      sent_at: new Date().toISOString(),
    };
    if (trackingId) {
      updateData.tracking_id = trackingId;
    }
    
    const { error } = await supabase
      .from('campaign_emails')
      .update(updateData)
      .eq('id', emailId);
    
    if (error) throw error;
  },

  // Mark an email as failed
  async markEmailFailed(emailId, errorMessage) {
    const { error } = await supabase
      .from('campaign_emails')
      .update({ 
        status: 'failed', 
        error_message: errorMessage 
      })
      .eq('id', emailId);
    
    if (error) throw error;
  },

  // Delete a campaign and its emails
  async delete(campaignId) {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId);
    
    if (error) throw error;
  },

  // Subscribe to campaign changes (real-time)
  subscribeToChanges(campaignId, callback) {
    return supabase
      .channel(`campaign-${campaignId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaigns',
        filter: `id=eq.${campaignId}`,
      }, callback)
      .subscribe();
  },

  // Unsubscribe from campaign changes
  unsubscribe(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  }
};

// ==================
// EMAIL TRACKING
// ==================
export const trackingService = {
  // Get tracking stats for a campaign
  async getCampaignStats(campaignId) {
    const { data, error } = await supabase
      .from('email_tracking')
      .select('tracking_type, created_at')
      .eq('campaign_id', campaignId);
    
    if (error) throw error;
    
    const stats = {
      opens: 0,
      uniqueOpens: new Set(),
      clicks: 0,
      uniqueClicks: new Set(),
      unsubscribes: 0,
    };
    
    (data || []).forEach(event => {
      switch (event.tracking_type) {
        case 'open':
          stats.opens++;
          break;
        case 'click':
          stats.clicks++;
          break;
        case 'unsubscribe':
          stats.unsubscribes++;
          break;
      }
    });
    
    return {
      opens: stats.opens,
      clicks: stats.clicks,
      unsubscribes: stats.unsubscribes,
    };
  },

  // Get all tracking events for a campaign
  async getCampaignEvents(campaignId) {
    const { data, error } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get user's overall stats
  async getUserStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('email_tracking')
      .select('tracking_type')
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    const stats = { opens: 0, clicks: 0, unsubscribes: 0 };
    (data || []).forEach(event => {
      if (stats[event.tracking_type + 's'] !== undefined) {
        stats[event.tracking_type + 's']++;
      }
    });
    
    return stats;
  }
};

// ==================
// UNSUBSCRIBED EMAILS
// ==================
export const unsubscribedService = {
  async getAll() {
    const { data, error } = await supabase
      .from('unsubscribed_emails')
      .select('*')
      .order('unsubscribed_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async add(email, reason = null, campaignId = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('unsubscribed_emails')
      .upsert({
        user_id: user.id,
        email,
        reason,
        campaign_id: campaignId,
      }, { onConflict: 'user_id,email' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('unsubscribed_emails')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async isEmailUnsubscribed(email) {
    const { data, error } = await supabase
      .from('unsubscribed_emails')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking unsubscribed email:', error);
      return false; // Default to not unsubscribed on error
    }
    return !!data;
  }
};
