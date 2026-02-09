// API Configuration
// This file reads from .env file for easy deployment updates

// Remove trailing slash if present
const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
export const API_BASE_URL = baseUrl;

// Log API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('[API Config] Using API URL:', API_BASE_URL);
}

// Warn if using localhost in production
if (!import.meta.env.DEV && API_BASE_URL.includes('localhost')) {
  console.warn('⚠️ WARNING: Using localhost API URL in production! Set VITE_API_URL environment variable.');
}

export const API_ENDPOINTS = {
  // Config
  CONFIG: `${API_BASE_URL}/api/config`,
  
  // Templates
  TEMPLATES: `${API_BASE_URL}/api/templates`,
  TEMPLATES_ADD: `${API_BASE_URL}/api/templates/add`,
  TEMPLATES_DELETE: (index) => `${API_BASE_URL}/api/templates/${index}`,
  
  // Contacts
  CONTACTS: `${API_BASE_URL}/api/contacts`,
  CONTACTS_ADD: `${API_BASE_URL}/api/contacts/add`,
  CONTACTS_DELETE: (email) => `${API_BASE_URL}/api/contacts/${encodeURIComponent(email)}`,
  
  // Upload
  UPLOAD_CONTACTS: `${API_BASE_URL}/api/upload/contacts`,
  UPLOAD_TEMPLATES: `${API_BASE_URL}/api/upload/templates`,
  
  // Sending - Only endpoints that exist on backend
  SEND_TEST: `${API_BASE_URL}/api/send/test`,
  SEND_SINGLE: `${API_BASE_URL}/api/send/single`,
  
  // AI Generation
  AI_GENERATE_TEMPLATE: `${API_BASE_URL}/api/ai/generate-template`,
  AI_IMPROVE_TEMPLATE: `${API_BASE_URL}/api/ai/improve-template`,
  
  // Campaign Queue (Server-side execution)
  CAMPAIGN_START: `${API_BASE_URL}/api/campaign/start`,
  CAMPAIGN_PAUSE: `${API_BASE_URL}/api/campaign/pause`,
  CAMPAIGN_RESUME: `${API_BASE_URL}/api/campaign/resume`,
  CAMPAIGN_STOP: `${API_BASE_URL}/api/campaign/stop`,
  CAMPAIGN_STATUS: (id) => `${API_BASE_URL}/api/campaign/status/${id}`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/api/health`,
};
