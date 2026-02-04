import { API_ENDPOINTS } from '../config/api';
import { smtpService } from './supabase';

// Error types for better handling
export class NetworkError extends Error {
  constructor(message = 'Network error. Please check your internet connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ServerError extends Error {
  constructor(message = 'Server error. Please try again later.', status) {
    super(message);
    this.name = 'ServerError';
    this.status = status;
  }
}

export class BounceError extends Error {
  constructor(message, email) {
    super(message);
    this.name = 'BounceError';
    this.email = email;
    this.isBounce = true;
  }
}

// Generic fetch wrapper with error handling
async function fetchAPI(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Check if this is a bounce error
      if (data.isBounce) {
        throw new BounceError(data.error || 'Email bounced', data.email);
      }
      if (response.status >= 500) {
        throw new ServerError(data.error || 'Server error', response.status);
      }
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  } catch (error) {
    // Network errors (no internet, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError();
    }
    throw error;
  }
}

// Config API - Now reads from Supabase
export const configAPI = {
  get: async () => {
    const creds = await smtpService.get();
    const isConfigured = !!(creds?.smtpHost && creds?.emailUser && creds?.emailPass);
    return {
      configured: isConfigured,
      smtpHost: creds?.smtpHost || '',
      smtpPort: creds?.smtpPort || '587',
      emailUser: creds?.emailUser || '',
      senderName: creds?.senderName || 'Support Team',
    };
  },
  // Update is handled by smtpService directly in Settings page
  update: () => Promise.resolve({ success: true }),
};

// Templates API
export const templatesAPI = {
  getAll: () => fetchAPI(API_ENDPOINTS.TEMPLATES),
  saveAll: (templates) => fetchAPI(API_ENDPOINTS.TEMPLATES, {
    method: 'POST',
    body: JSON.stringify({ templates }),
  }),
  add: (template) => fetchAPI(API_ENDPOINTS.TEMPLATES_ADD, {
    method: 'POST',
    body: JSON.stringify(template),
  }),
  delete: (index) => fetchAPI(API_ENDPOINTS.TEMPLATES_DELETE(index), {
    method: 'DELETE',
  }),
  upload: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(API_ENDPOINTS.UPLOAD_TEMPLATES, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) {
          throw new ServerError(data.error || 'Upload failed', response.status);
        }
        throw new Error(data.error || 'Upload failed');
      }
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError();
      }
      throw error;
    }
  },
};

// Contacts API
export const contactsAPI = {
  getAll: () => fetchAPI(API_ENDPOINTS.CONTACTS),
  saveAll: (contacts) => fetchAPI(API_ENDPOINTS.CONTACTS, {
    method: 'POST',
    body: JSON.stringify({ contacts }),
  }),
  add: (emails) => fetchAPI(API_ENDPOINTS.CONTACTS_ADD, {
    method: 'POST',
    body: JSON.stringify({ emails }),
  }),
  delete: (email) => fetchAPI(API_ENDPOINTS.CONTACTS_DELETE(email), {
    method: 'DELETE',
  }),
  upload: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(API_ENDPOINTS.UPLOAD_CONTACTS, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) {
          throw new ServerError(data.error || 'Upload failed', response.status);
        }
        throw new Error(data.error || 'Upload failed');
      }
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError();
      }
      throw error;
    }
  },
};

// Email Sending API - Now includes credentials from Supabase
export const sendAPI = {
  // Send test email with template content directly (for Vercel compatibility)
  testWithTemplate: async (email, template, senderName) => {
    const creds = await smtpService.get();
    if (!creds?.smtpHost || !creds?.emailUser || !creds?.emailPass) {
      throw new Error('SMTP not configured. Please set up your credentials in Settings.');
    }
    const credentials = {
      smtpHost: creds.smtpHost,
      smtpPort: creds.smtpPort,
      emailUser: creds.emailUser,
      emailPass: creds.emailPass,
      senderName: creds.senderName,
    };
    // Use sendSingle endpoint with template content
    return fetchAPI(API_ENDPOINTS.SEND_SINGLE, {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        template: {
          subject: template.subject,
          body: template.body,
        },
        senderName: senderName || credentials.senderName,
        credentials,
      }),
    });
  },
  // Legacy test method (deprecated - uses templateIndex)
  test: async (email, templateIndex) => {
    const creds = await smtpService.get();
    if (!creds?.smtpHost || !creds?.emailUser || !creds?.emailPass) {
      throw new Error('SMTP not configured. Please set up your credentials in Settings.');
    }
    const credentials = {
      smtpHost: creds.smtpHost,
      smtpPort: creds.smtpPort,
      emailUser: creds.emailUser,
      emailPass: creds.emailPass,
      senderName: creds.senderName,
    };
    return fetchAPI(API_ENDPOINTS.SEND_TEST, {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        templateIndex,
        credentials,
      }),
    });
  },
  sendSingle: async (emailData, trackingOptions = {}) => {
    const creds = await smtpService.get();
    if (!creds?.smtpHost || !creds?.emailUser || !creds?.emailPass) {
      throw new Error('SMTP not configured. Please set up your credentials in Settings.');
    }
    const credentials = {
      smtpHost: creds.smtpHost,
      smtpPort: creds.smtpPort,
      emailUser: creds.emailUser,
      emailPass: creds.emailPass,
      senderName: creds.senderName,
    };
    return fetchAPI(API_ENDPOINTS.SEND_SINGLE, {
      method: 'POST',
      body: JSON.stringify({
        email: emailData.to,
        template: {
          subject: emailData.subject,
          body: emailData.html
        },
        senderName: emailData.senderName || credentials.senderName || 'Support Team',
        credentials, // Include SMTP credentials
        // Tracking options
        campaignId: trackingOptions.campaignId,
        userId: trackingOptions.userId,
        enableTracking: trackingOptions.enableTracking !== false, // Default true
      }),
    });
  },
};
