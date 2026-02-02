import { API_ENDPOINTS } from '../config/api';

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
      throw new Error(data.error || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

// Config API
export const configAPI = {
  get: () => fetchAPI(API_ENDPOINTS.CONFIG),
  update: (config) => fetchAPI(API_ENDPOINTS.CONFIG, {
    method: 'POST',
    body: JSON.stringify(config),
  }),
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
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(API_ENDPOINTS.UPLOAD_TEMPLATES, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    return data;
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
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(API_ENDPOINTS.UPLOAD_CONTACTS, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
};

// Email Sending API
export const sendAPI = {
  getStatus: () => fetchAPI(API_ENDPOINTS.SEND_STATUS),
  start: (options) => fetchAPI(API_ENDPOINTS.SEND_START, {
    method: 'POST',
    body: JSON.stringify(options),
  }),
  stop: () => fetchAPI(API_ENDPOINTS.SEND_STOP, {
    method: 'POST',
  }),
  test: (email, templateIndex) => fetchAPI(API_ENDPOINTS.SEND_TEST, {
    method: 'POST',
    body: JSON.stringify({ email, templateIndex }),
  }),
  sendSingle: (emailData) => fetchAPI(API_ENDPOINTS.SEND_SINGLE, {
    method: 'POST',
    body: JSON.stringify({
      email: emailData.to,
      template: {
        subject: emailData.subject,
        body: emailData.html
      },
      senderName: emailData.name || 'Ali'
    }),
  }),
};
