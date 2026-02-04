/**
 * Personalization Variables Utility
 * 
 * Replaces template variables like {{firstName}}, {{companyName}}, etc.
 * with actual contact data.
 * 
 * Supported variables:
 * - {{firstName}} - Contact's first name
 * - {{lastName}} - Contact's last name
 * - {{name}} - Full name (fallback to firstName)
 * - {{email}} - Email address
 * - {{company}} or {{companyName}} - Company name
 * - {{website}} - Website URL
 * - {{custom1}} through {{custom5}} - Custom fields
 * - {{date}} - Current date (formatted)
 * - {{day}} - Day of week (Monday, Tuesday, etc.)
 */

// All supported variables
export const SUPPORTED_VARIABLES = [
  { key: 'firstName', label: 'First Name', example: 'John' },
  { key: 'lastName', label: 'Last Name', example: 'Doe' },
  { key: 'name', label: 'Full Name', example: 'John Doe' },
  { key: 'email', label: 'Email Address', example: 'john@example.com' },
  { key: 'company', label: 'Company Name', example: 'Acme Corp' },
  { key: 'companyName', label: 'Company Name (alt)', example: 'Acme Corp' },
  { key: 'website', label: 'Website', example: 'acme.com' },
  { key: 'custom1', label: 'Custom Field 1', example: 'Custom value' },
  { key: 'custom2', label: 'Custom Field 2', example: 'Custom value' },
  { key: 'custom3', label: 'Custom Field 3', example: 'Custom value' },
  { key: 'date', label: 'Today\'s Date', example: 'February 5, 2026' },
  { key: 'day', label: 'Day of Week', example: 'Wednesday' },
];

// CSV columns that map to personalization variables
export const CSV_COLUMN_MAPPINGS = {
  email: ['email', 'e-mail', 'emailaddress', 'email_address', 'email address'],
  firstName: ['firstname', 'first_name', 'first name', 'first', 'fname'],
  lastName: ['lastname', 'last_name', 'last name', 'last', 'lname'],
  name: ['name', 'fullname', 'full_name', 'full name'],
  company: ['company', 'companyname', 'company_name', 'company name', 'organization', 'org'],
  website: ['website', 'web', 'url', 'site', 'domain'],
  custom1: ['custom1', 'custom_1', 'custom 1', 'field1'],
  custom2: ['custom2', 'custom_2', 'custom 2', 'field2'],
  custom3: ['custom3', 'custom_3', 'custom 3', 'field3'],
};

/**
 * Replace all personalization variables in text with contact data
 * @param {string} text - Template text with {{variables}}
 * @param {object} contact - Contact object with data
 * @returns {string} - Text with variables replaced
 */
export function replaceVariables(text, contact) {
  if (!text || !contact) return text;
  
  // Get current date info
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Build replacement map
  const replacements = {
    firstName: contact.firstName || contact.first_name || extractFirstName(contact.name) || '',
    lastName: contact.lastName || contact.last_name || extractLastName(contact.name) || '',
    name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '',
    email: contact.email || '',
    company: contact.company || contact.companyName || contact.company_name || '',
    companyName: contact.company || contact.companyName || contact.company_name || '',
    website: contact.website || '',
    custom1: contact.custom1 || '',
    custom2: contact.custom2 || '',
    custom3: contact.custom3 || '',
    date: dateFormatted,
    day: dayOfWeek,
  };
  
  // Replace all {{variable}} patterns
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    // Match both {{variable}} and {{ variable }} (with spaces)
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Extract first name from full name
 */
function extractFirstName(fullName) {
  if (!fullName) return '';
  return fullName.split(' ')[0] || '';
}

/**
 * Extract last name from full name
 */
function extractLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

/**
 * Parse CSV header and map columns to personalization fields
 * @param {string[]} headers - Array of CSV header values
 * @returns {object} - Map of column index to field name
 */
export function mapCSVHeaders(headers) {
  const columnMap = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    
    // Check each field's possible column names
    for (const [field, aliases] of Object.entries(CSV_COLUMN_MAPPINGS)) {
      if (aliases.includes(normalizedHeader)) {
        columnMap[index] = field;
        break;
      }
    }
  });
  
  return columnMap;
}

/**
 * Parse a CSV row into a contact object
 * @param {string[]} values - Array of row values
 * @param {object} columnMap - Map of column index to field name
 * @returns {object|null} - Contact object or null if invalid
 */
export function parseCSVRow(values, columnMap) {
  const contact = {};
  
  // Map each value to its field
  for (const [index, field] of Object.entries(columnMap)) {
    const value = values[parseInt(index)]?.trim().replace(/^["']|["']$/g, '');
    if (value) {
      contact[field] = value;
    }
  }
  
  // Must have email to be valid
  if (!contact.email || !contact.email.includes('@')) {
    return null;
  }
  
  return contact;
}

/**
 * Parse full CSV text into contacts array with personalization fields
 * @param {string} csvText - Raw CSV text
 * @returns {object} - { contacts: array, fields: array of used field names }
 */
export function parseContactsCSV(csvText) {
  const lines = csvText.split(/[\n\r]+/).filter(line => line.trim());
  
  if (lines.length < 1) {
    throw new Error('CSV file is empty');
  }
  
  // Parse header row
  const headers = parseCSVLine(lines[0]);
  const columnMap = mapCSVHeaders(headers);
  
  // Must have email column
  const hasEmail = Object.values(columnMap).includes('email');
  if (!hasEmail) {
    throw new Error('CSV must have an "email" column');
  }
  
  // Parse data rows
  const contacts = [];
  const usedFields = new Set();
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const contact = parseCSVRow(values, columnMap);
    
    if (contact) {
      contacts.push(contact);
      // Track which fields are actually used
      Object.keys(contact).forEach(field => usedFields.add(field));
    }
  }
  
  if (contacts.length === 0) {
    throw new Error('No valid contacts found in CSV');
  }
  
  return {
    contacts,
    fields: Array.from(usedFields),
  };
}

/**
 * Parse a single CSV line, handling quoted fields
 * @param {string} line - CSV line
 * @returns {string[]} - Array of field values
 */
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Don't forget the last field
  fields.push(currentField.trim());
  
  return fields;
}

/**
 * Get preview of how template will look with sample data
 * @param {string} template - Template text
 * @param {object} sampleContact - Sample contact for preview
 * @returns {string} - Rendered preview
 */
export function getTemplatePreview(template, sampleContact = null) {
  const defaultSample = {
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp',
    website: 'acme.com',
    custom1: 'Custom Value 1',
    custom2: 'Custom Value 2',
    custom3: 'Custom Value 3',
  };
  
  return replaceVariables(template, sampleContact || defaultSample);
}

/**
 * Detect which variables are used in a template
 * @param {string} template - Template text
 * @returns {string[]} - Array of variable names used
 */
export function detectUsedVariables(template) {
  if (!template) return [];
  
  const variablePattern = /\{\{\s*(\w+)\s*\}\}/g;
  const used = new Set();
  let match;
  
  while ((match = variablePattern.exec(template)) !== null) {
    used.add(match[1].toLowerCase());
  }
  
  return Array.from(used);
}
