/**
 * Email Validation & Duplicate Detection Utilities
 */

// Comprehensive email validation regex
// Validates format and common issues
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// List of disposable/temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.com', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'trashmail.com', 'fakeinbox.com', 'temp-mail.org',
  'yopmail.com', 'sharklasers.com', 'guerrillamail.info', 'getnada.com',
  'maildrop.cc', 'dispostable.com', 'mailnesia.com', 'tmpmail.org',
  'tempail.com', 'mohmal.com', 'dropmail.me', 'emailondeck.com',
]);

// Common typos in popular domains
const DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahho.com': 'yahoo.com',
  'protonmal.com': 'protonmail.com',
};

/**
 * Validate a single email address
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, error?: string, suggestion?: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  // Check for empty
  if (!trimmed) {
    return { valid: false, error: 'Email cannot be empty' };
  }

  // Check basic format
  if (!trimmed.includes('@')) {
    return { valid: false, error: 'Email must contain @' };
  }

  const [localPart, domain] = trimmed.split('@');

  // Check local part
  if (!localPart || localPart.length === 0) {
    return { valid: false, error: 'Email missing username before @' };
  }

  if (localPart.length > 64) {
    return { valid: false, error: 'Email username too long (max 64 characters)' };
  }

  // Check domain
  if (!domain || domain.length === 0) {
    return { valid: false, error: 'Email missing domain after @' };
  }

  if (!domain.includes('.')) {
    return { valid: false, error: 'Email domain must have a dot (e.g., .com)' };
  }

  // Check for common domain typos
  if (DOMAIN_TYPOS[domain]) {
    return { 
      valid: false, 
      error: `Possible typo in domain`, 
      suggestion: `${localPart}@${DOMAIN_TYPOS[domain]}` 
    };
  }

  // Check full regex
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Check for double dots
  if (trimmed.includes('..')) {
    return { valid: false, error: 'Email cannot contain consecutive dots' };
  }

  // Check for disposable domains (warning, not error)
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: true, warning: 'This appears to be a temporary/disposable email' };
  }

  return { valid: true };
}

/**
 * Validate multiple emails and return detailed results
 * @param {string[]} emails - Array of emails to validate
 * @returns {object} - { valid: [], invalid: [], warnings: [] }
 */
export function validateEmails(emails) {
  const results = {
    valid: [],
    invalid: [],
    warnings: [],
  };

  for (const email of emails) {
    const result = validateEmail(email);
    const trimmed = email?.trim().toLowerCase();
    
    if (result.valid) {
      results.valid.push({ email: trimmed, ...result });
      if (result.warning) {
        results.warnings.push({ email: trimmed, warning: result.warning });
      }
    } else {
      results.invalid.push({ 
        email: email, 
        error: result.error,
        suggestion: result.suggestion 
      });
    }
  }

  return results;
}

/**
 * Find duplicate contacts by email
 * @param {Array} newContacts - New contacts to check
 * @param {Array} existingContacts - Existing contacts to compare against
 * @returns {object} - { duplicates: [], unique: [] }
 */
export function findDuplicateContacts(newContacts, existingContacts = []) {
  const existingEmails = new Set(
    existingContacts.map(c => c.email?.toLowerCase().trim())
  );
  
  const seen = new Set();
  const duplicates = [];
  const unique = [];
  const duplicatesWithExisting = [];

  for (const contact of newContacts) {
    const email = (contact.email || contact)?.toLowerCase().trim();
    
    if (!email) continue;

    // Check if duplicate with existing contacts
    if (existingEmails.has(email)) {
      duplicatesWithExisting.push(contact);
      continue;
    }

    // Check if duplicate within new contacts
    if (seen.has(email)) {
      duplicates.push(contact);
    } else {
      seen.add(email);
      unique.push(contact);
    }
  }

  return { 
    duplicates,           // Duplicates within new contacts
    duplicatesWithExisting, // Duplicates with existing contacts
    unique,               // Unique new contacts
    totalDuplicates: duplicates.length + duplicatesWithExisting.length,
  };
}

/**
 * Find duplicate templates by subject and body
 * @param {Array} newTemplates - New templates to check
 * @param {Array} existingTemplates - Existing templates to compare against
 * @returns {object} - { duplicates: [], unique: [] }
 */
export function findDuplicateTemplates(newTemplates, existingTemplates = []) {
  // Create a signature for each template
  const createSignature = (template) => {
    const subject = (template.subject || '').toLowerCase().trim();
    const body = (template.body || '').toLowerCase().trim();
    return `${subject}|||${body}`;
  };

  const existingSignatures = new Set(
    existingTemplates.map(t => createSignature(t))
  );
  
  const seen = new Map(); // signature -> template
  const duplicates = [];
  const unique = [];
  const duplicatesWithExisting = [];

  for (const template of newTemplates) {
    const signature = createSignature(template);
    
    // Check if duplicate with existing templates
    if (existingSignatures.has(signature)) {
      duplicatesWithExisting.push(template);
      continue;
    }

    // Check if duplicate within new templates
    if (seen.has(signature)) {
      duplicates.push({
        ...template,
        duplicateOf: seen.get(signature).name || 'Untitled',
      });
    } else {
      seen.set(signature, template);
      unique.push(template);
    }
  }

  return { 
    duplicates,           // Duplicates within new templates
    duplicatesWithExisting, // Duplicates with existing templates
    unique,               // Unique new templates
    totalDuplicates: duplicates.length + duplicatesWithExisting.length,
  };
}

/**
 * Check if a contact list has any invalid emails
 * @param {Array} contacts - Contacts to validate
 * @returns {object} - { valid: [], invalid: [], hasInvalid: boolean }
 */
export function validateContactEmails(contacts) {
  const valid = [];
  const invalid = [];

  for (const contact of contacts) {
    const email = contact.email || contact;
    const result = validateEmail(email);
    
    if (result.valid) {
      valid.push(contact);
    } else {
      invalid.push({
        ...contact,
        validationError: result.error,
        suggestion: result.suggestion,
      });
    }
  }

  return {
    valid,
    invalid,
    hasInvalid: invalid.length > 0,
    summary: `${valid.length} valid, ${invalid.length} invalid`,
  };
}
