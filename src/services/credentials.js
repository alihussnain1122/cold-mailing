// Credentials Service - Stores SMTP credentials in browser localStorage
// Credentials never leave the user's device except when sending emails
// Uses basic encoding to prevent casual inspection (not secure against determined attackers)

const STORAGE_KEY = 'mailflow_smtp_credentials';
const ENCODING_KEY = 'mf_v1_'; // Version prefix for future migration

// Simple encoding to prevent casual inspection (base64 + reversal)
function encode(str) {
  if (!str) return '';
  try {
    return ENCODING_KEY + btoa(encodeURIComponent(str).split('').reverse().join(''));
  } catch {
    return str;
  }
}

function decode(str) {
  if (!str) return '';
  try {
    if (!str.startsWith(ENCODING_KEY)) return str; // Legacy unencoded value
    const encoded = str.slice(ENCODING_KEY.length);
    return decodeURIComponent(atob(encoded).split('').reverse().join(''));
  } catch {
    return str;
  }
}

// Check if connection is secure
export function isSecureContext() {
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

// Get stored credentials
export function getCredentials() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored);
    // Decode sensitive fields
    return {
      ...data,
      emailPass: decode(data.emailPass),
    };
  } catch {
    return null;
  }
}

// Save credentials to localStorage
export function saveCredentials(credentials) {
  try {
    const data = {
      smtpHost: credentials.smtpHost,
      smtpPort: credentials.smtpPort || '587',
      emailUser: credentials.emailUser,
      emailPass: encode(credentials.emailPass), // Encode password
      senderName: credentials.senderName || 'Support Team',
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Clear stored credentials
export function clearCredentials() {
  localStorage.removeItem(STORAGE_KEY);
}

// Check if credentials are configured
export function isConfigured() {
  const creds = getCredentials();
  return !!(creds?.smtpHost && creds?.emailUser && creds?.emailPass);
}

// Get credentials for API requests (without exposing in logs)
export function getCredentialsForRequest() {
  const creds = getCredentials();
  if (!creds) return null;
  
  return {
    smtpHost: creds.smtpHost,
    smtpPort: creds.smtpPort,
    emailUser: creds.emailUser,
    emailPass: creds.emailPass,
    senderName: creds.senderName,
  };
}
