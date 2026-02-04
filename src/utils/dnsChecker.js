/**
 * DNS Record Checker for Email Deliverability
 * Checks SPF, DKIM, and DMARC records for a domain
 */

// Cloudflare DNS-over-HTTPS endpoint
const DNS_API = 'https://cloudflare-dns.com/dns-query';

/**
 * Query DNS records using DNS-over-HTTPS
 * @param {string} domain - Domain to query
 * @param {string} type - Record type (TXT, CNAME, etc.)
 * @returns {Promise<Array>} Array of record values
 */
async function queryDNS(domain, type = 'TXT') {
  try {
    const response = await fetch(`${DNS_API}?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: {
        'Accept': 'application/dns-json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`DNS query failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.Status !== 0) {
      // DNS error codes: 3 = NXDOMAIN (not found), 2 = SERVFAIL
      return [];
    }
    
    return (data.Answer || []).map(record => record.data?.replace(/"/g, '') || '');
  } catch (error) {
    console.error('DNS query error:', error);
    throw error;
  }
}

/**
 * Check SPF record for a domain
 * @param {string} domain - Domain to check
 * @returns {Promise<Object>} SPF check result
 */
export async function checkSPF(domain) {
  try {
    const records = await queryDNS(domain, 'TXT');
    const spfRecord = records.find(r => r.startsWith('v=spf1'));
    
    if (!spfRecord) {
      return {
        status: 'missing',
        message: 'No SPF record found',
        record: null,
        severity: 'warning',
      };
    }
    
    // Basic SPF validation
    const hasInclude = spfRecord.includes('include:');
    const hasIP = spfRecord.includes('ip4:') || spfRecord.includes('ip6:');
    const hasAll = spfRecord.includes('-all') || spfRecord.includes('~all') || spfRecord.includes('?all');
    
    let severity = 'success';
    let message = 'SPF record is valid';
    
    if (!hasAll) {
      severity = 'warning';
      message = 'SPF record is missing -all or ~all directive';
    } else if (spfRecord.includes('+all')) {
      severity = 'error';
      message = 'SPF record uses +all which allows any server to send';
    } else if (spfRecord.includes('?all')) {
      severity = 'warning';
      message = 'SPF record uses ?all (neutral) - consider using ~all or -all';
    }
    
    return {
      status: 'found',
      message,
      record: spfRecord,
      severity,
      details: {
        hasInclude,
        hasIP,
        mechanism: spfRecord.includes('-all') ? 'fail' : spfRecord.includes('~all') ? 'softfail' : 'neutral',
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check SPF: ' + error.message,
      record: null,
      severity: 'error',
    };
  }
}

/**
 * Check DKIM record for a domain
 * @param {string} domain - Domain to check
 * @param {string} selector - DKIM selector (common: default, google, zoho, selector1, selector2)
 * @returns {Promise<Object>} DKIM check result
 */
export async function checkDKIM(domain, selector = null) {
  // Common DKIM selectors for various providers
  const selectors = selector ? [selector] : [
    'default',
    'google',
    'zoho',
    'zmail',
    'selector1', // Microsoft
    'selector2', // Microsoft
    'mail',
    'dkim',
    'k1',
    's1',
    's2',
  ];
  
  const results = [];
  
  for (const sel of selectors) {
    try {
      const dkimDomain = `${sel}._domainkey.${domain}`;
      const records = await queryDNS(dkimDomain, 'TXT');
      
      const dkimRecord = records.find(r => r.includes('v=DKIM1') || r.includes('p='));
      
      if (dkimRecord) {
        results.push({
          selector: sel,
          record: dkimRecord,
          hasPublicKey: dkimRecord.includes('p='),
        });
      }
    } catch {
      // Continue checking other selectors
    }
  }
  
  if (results.length === 0) {
    return {
      status: 'missing',
      message: 'No DKIM record found (checked common selectors)',
      record: null,
      severity: 'warning',
      selectors: selectors,
    };
  }
  
  const validRecord = results.find(r => r.hasPublicKey);
  
  return {
    status: 'found',
    message: `DKIM record found with selector "${results[0].selector}"`,
    record: results[0].record,
    severity: validRecord ? 'success' : 'warning',
    selector: results[0].selector,
    allResults: results,
  };
}

/**
 * Check DMARC record for a domain
 * @param {string} domain - Domain to check
 * @returns {Promise<Object>} DMARC check result
 */
export async function checkDMARC(domain) {
  try {
    const dmarcDomain = `_dmarc.${domain}`;
    const records = await queryDNS(dmarcDomain, 'TXT');
    const dmarcRecord = records.find(r => r.startsWith('v=DMARC1'));
    
    if (!dmarcRecord) {
      return {
        status: 'missing',
        message: 'No DMARC record found',
        record: null,
        severity: 'warning',
      };
    }
    
    // Parse DMARC policy
    const policyMatch = dmarcRecord.match(/p=(\w+)/);
    const policy = policyMatch ? policyMatch[1] : 'none';
    
    const hasRua = dmarcRecord.includes('rua=');
    const hasRuf = dmarcRecord.includes('ruf=');
    const hasPct = dmarcRecord.includes('pct=');
    
    let severity = 'success';
    let message = 'DMARC record is configured';
    
    if (policy === 'none') {
      severity = 'warning';
      message = 'DMARC policy is set to "none" - consider "quarantine" or "reject"';
    } else if (policy === 'quarantine') {
      message = 'DMARC policy is set to "quarantine"';
    } else if (policy === 'reject') {
      message = 'DMARC policy is set to "reject" (strictest)';
    }
    
    return {
      status: 'found',
      message,
      record: dmarcRecord,
      severity,
      details: {
        policy,
        hasRua,
        hasRuf,
        hasPct,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check DMARC: ' + error.message,
      record: null,
      severity: 'error',
    };
  }
}

/**
 * Check MX records for a domain
 * @param {string} domain - Domain to check
 * @returns {Promise<Object>} MX check result
 */
export async function checkMX(domain) {
  try {
    const response = await fetch(`${DNS_API}?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: {
        'Accept': 'application/dns-json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`DNS query failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.Status !== 0 || !data.Answer || data.Answer.length === 0) {
      return {
        status: 'missing',
        message: 'No MX records found',
        records: [],
        severity: 'error',
      };
    }
    
    const mxRecords = data.Answer
      .filter(r => r.type === 15)
      .map(r => {
        const parts = r.data.split(' ');
        return {
          priority: parseInt(parts[0], 10),
          exchange: parts[1]?.replace(/\.$/, '') || '',
        };
      })
      .sort((a, b) => a.priority - b.priority);
    
    return {
      status: 'found',
      message: `Found ${mxRecords.length} MX record(s)`,
      records: mxRecords,
      severity: 'success',
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check MX: ' + error.message,
      records: [],
      severity: 'error',
    };
  }
}

/**
 * Run all DNS checks for email deliverability
 * @param {string} email - Email address to extract domain from
 * @returns {Promise<Object>} All DNS check results
 */
export async function checkAllDNS(email) {
  const domain = email.split('@')[1];
  
  if (!domain) {
    throw new Error('Invalid email address');
  }
  
  const [spf, dkim, dmarc, mx] = await Promise.all([
    checkSPF(domain),
    checkDKIM(domain),
    checkDMARC(domain),
    checkMX(domain),
  ]);
  
  // Calculate overall score
  let score = 0;
  const maxScore = 100;
  
  // SPF: 25 points
  if (spf.status === 'found' && spf.severity === 'success') score += 25;
  else if (spf.status === 'found') score += 15;
  
  // DKIM: 25 points
  if (dkim.status === 'found' && dkim.severity === 'success') score += 25;
  else if (dkim.status === 'found') score += 15;
  
  // DMARC: 25 points
  if (dmarc.status === 'found' && dmarc.severity === 'success') score += 25;
  else if (dmarc.status === 'found') score += 15;
  
  // MX: 25 points
  if (mx.status === 'found') score += 25;
  
  let overallStatus = 'poor';
  if (score >= 90) overallStatus = 'excellent';
  else if (score >= 70) overallStatus = 'good';
  else if (score >= 50) overallStatus = 'fair';
  
  return {
    domain,
    spf,
    dkim,
    dmarc,
    mx,
    score,
    maxScore,
    overallStatus,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Get setup instructions for a specific provider
 * @param {string} provider - Email provider name
 * @returns {Object} Setup instructions
 */
export function getProviderInstructions(provider) {
  const instructions = {
    gmail: {
      name: 'Gmail / Google Workspace',
      spf: 'Add to your DNS TXT record: v=spf1 include:_spf.google.com ~all',
      dkim: 'Go to Google Admin Console > Apps > Google Workspace > Gmail > Authenticate email',
      dmarc: 'Add TXT record for _dmarc: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
      docs: 'https://support.google.com/a/answer/33786',
    },
    zoho: {
      name: 'Zoho Mail',
      spf: 'Add to your DNS TXT record: v=spf1 include:zoho.com ~all',
      dkim: 'Go to Zoho Admin > Email Authentication > DKIM and add the TXT record',
      dmarc: 'Add TXT record for _dmarc: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
      docs: 'https://www.zoho.com/mail/help/adminconsole/dkim-configuration.html',
    },
    outlook: {
      name: 'Microsoft 365 / Outlook',
      spf: 'Add to your DNS TXT record: v=spf1 include:spf.protection.outlook.com ~all',
      dkim: 'Go to Microsoft 365 Admin > Settings > Domains > Email authentication',
      dmarc: 'Add TXT record for _dmarc: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
      docs: 'https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/email-authentication-dkim-configure',
    },
    custom: {
      name: 'Custom Provider',
      spf: 'Add TXT record: v=spf1 ip4:YOUR_SERVER_IP ~all (or include your provider)',
      dkim: 'Contact your email provider for DKIM setup instructions',
      dmarc: 'Add TXT record for _dmarc: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
      docs: null,
    },
  };
  
  return instructions[provider] || instructions.custom;
}
