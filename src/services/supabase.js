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
// SMTP CONFIG (optional - can also use localStorage)
// ==================
export const smtpService = {
  async get() {
    const { data, error } = await supabase
      .from('smtp_configs')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
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
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('smtp_configs')
      .delete()
      .eq('user_id', user.id);
    
    if (error) throw error;
  }
};
