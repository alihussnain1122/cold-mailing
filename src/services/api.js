import { API_ENDPOINTS } from '../config/api';
import { smtpService } from './supabase';
import { supabase } from '../config/supabase';

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

export class AuthError extends Error {
  constructor(message = 'Authentication required. Please log in.') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Get the current user's JWT token for API authentication
 */
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Generic fetch wrapper with error handling and auth
async function fetchAPI(url, options = {}) {
  // Check internet connection first
  if (!navigator.onLine) {
    throw new NetworkError('No internet connection. Please check your network and try again.');
  }

  try {
    // Get auth token
    const token = await getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add Authorization header if we have a token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError(data.error || 'Authentication required');
      }
      if (response.status === 403 && data.error?.includes('CORS')) {
        throw new NetworkError('CORS error - backend may not be configured for this domain');
      }
      if (response.status >= 500) {
        throw new ServerError(data.error || 'Server error', response.status);
      }
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  } catch (error) {
    // Network errors (no internet, CORS, etc.)
    if (error instanceof TypeError) {
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        // Check if it's actually an offline issue
        if (!navigator.onLine) {
          throw new NetworkError('No internet connection. Please check your network and try again.');
        }
        throw new NetworkError('Cannot connect to server. Please check your internet connection or try again later.');
      }
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

// AI API
export const aiAPI = {
  generateTemplate: async (options) => {
    return fetchAPI(API_ENDPOINTS.AI_GENERATE_TEMPLATE, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },
  improveTemplate: async (options) => {
    return fetchAPI(API_ENDPOINTS.AI_IMPROVE_TEMPLATE, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },
};

// Campaign API (Server-side queue)
export const campaignAPI = {
  // Start a new campaign (server-side execution)
  start: async (options) => {
    const creds = await smtpService.get();
    if (!creds?.smtpHost || !creds?.emailUser || !creds?.emailPass) {
      throw new Error('SMTP not configured. Please set up your credentials in Settings.');
    }
    
    return fetchAPI(API_ENDPOINTS.CAMPAIGN_START, {
      method: 'POST',
      body: JSON.stringify({
        contacts: options.contacts,
        template: options.template,
        credentials: {
          smtpHost: creds.smtpHost,
          smtpPort: creds.smtpPort,
          emailUser: creds.emailUser,
          emailPass: creds.emailPass,
          senderName: creds.senderName,
        },
        senderName: options.senderName || creds.senderName,
        delayMin: options.delayMin || 10000,
        delayMax: options.delayMax || 30000,
        campaignName: options.campaignName,
        enableTracking: options.enableTracking !== false,
      }),
    });
  },

  // Pause a running campaign
  pause: async (campaignId) => {
    return fetchAPI(API_ENDPOINTS.CAMPAIGN_PAUSE, {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    });
  },

  // Resume a paused campaign
  resume: async (campaignId) => {
    const creds = await smtpService.get();
    if (!creds?.smtpHost || !creds?.emailUser || !creds?.emailPass) {
      throw new Error('SMTP not configured. Please set up your credentials in Settings.');
    }
    
    return fetchAPI(API_ENDPOINTS.CAMPAIGN_RESUME, {
      method: 'POST',
      body: JSON.stringify({
        campaignId,
        credentials: {
          smtpHost: creds.smtpHost,
          smtpPort: creds.smtpPort,
          emailUser: creds.emailUser,
          emailPass: creds.emailPass,
          senderName: creds.senderName,
        },
      }),
    });
  },

  // Stop a campaign completely
  stop: async (campaignId) => {
    return fetchAPI(API_ENDPOINTS.CAMPAIGN_STOP, {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    });
  },

  // Get campaign status
  getStatus: async (campaignId) => {
    return fetchAPI(API_ENDPOINTS.CAMPAIGN_STATUS(campaignId));
  },

  // Trigger worker to process emails (for Vercel free plan - no cron)
  triggerWorker: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CAMPAIGN_WORKER, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      // Silently fail - worker will be triggered again on next poll
      return false;
    }
  },
};
