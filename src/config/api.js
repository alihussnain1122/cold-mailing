// API Configuration
// This file reads from .env file for easy deployment updates

// Remove trailing slash if present
const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
export const API_BASE_URL = baseUrl;

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
  
  // Sending
  SEND_STATUS: `${API_BASE_URL}/api/send/status`,
  SEND_START: `${API_BASE_URL}/api/send/start`,
  SEND_STOP: `${API_BASE_URL}/api/send/stop`,
  SEND_TEST: `${API_BASE_URL}/api/send/test`,
};
