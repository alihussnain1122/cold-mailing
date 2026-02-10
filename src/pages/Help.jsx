import { useState } from 'react';
import { 
  HelpCircle, 
  BookOpen, 
  Mail, 
  Users, 
  FileText, 
  Send, 
  BarChart3, 
  Settings, 
  Shield, 
  Zap,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Keyboard,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Clock,
  Globe,
  Lock,
  Sparkles,
  Target,
  Search,
} from 'lucide-react';
import { Card, Badge } from '../components/UI';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: Zap },
  { id: 'features', label: 'Features Guide', icon: BookOpen },
  { id: 'email-best-practices', label: 'Email Best Practices', icon: Target },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle },
  { id: 'shortcuts', label: 'Tips & Shortcuts', icon: Keyboard },
  { id: 'security', label: 'Security & Privacy', icon: Shield },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
];

export default function Help() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [expandedFaqs, setExpandedFaqs] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleFaq = (id) => {
    setExpandedFaqs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-stone-600" />
              Help & Documentation
            </h1>
            <p className="text-stone-500 mt-1 text-sm sm:text-base">
              Learn how to use Sendium effectively for your email campaigns
            </p>
          </div>
          <Badge variant="info">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            v1.0
          </Badge>
        </div>

        {/* Search */}
        <div className="mt-5 pt-5 border-t border-stone-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="search"
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <nav className="space-y-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      activeSection === section.id
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${activeSection === section.id ? 'text-white' : 'text-stone-500'}`} />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Getting Started */}
          {activeSection === 'getting-started' && (
            <GettingStartedSection />
          )}

          {/* Features Guide */}
          {activeSection === 'features' && (
            <FeaturesSection />
          )}

          {/* Email Best Practices */}
          {activeSection === 'email-best-practices' && (
            <BestPracticesSection />
          )}

          {/* Troubleshooting */}
          {activeSection === 'troubleshooting' && (
            <TroubleshootingSection />
          )}

          {/* Tips & Shortcuts */}
          {activeSection === 'shortcuts' && (
            <ShortcutsSection />
          )}

          {/* Security & Privacy */}
          {activeSection === 'security' && (
            <SecuritySection />
          )}

          {/* FAQ */}
          {activeSection === 'faq' && (
            <FAQSection expandedFaqs={expandedFaqs} toggleFaq={toggleFaq} />
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SECTION COMPONENTS
// ==========================================

function GettingStartedSection() {
  const steps = [
    {
      step: 1,
      title: 'Configure SMTP Settings',
      description: 'Set up your email server credentials in Settings to enable sending.',
      icon: Settings,
      details: [
        'Go to Settings page',
        'Enter your SMTP host (e.g., smtp.gmail.com)',
        'Enter port (usually 587 for TLS)',
        'Add your email and app password',
        'Click Save to store securely',
      ],
    },
    {
      step: 2,
      title: 'Add Email Templates',
      description: 'Create reusable email templates with personalization variables.',
      icon: FileText,
      details: [
        'Navigate to Templates page',
        'Click "Add Template" or use AI generation',
        'Use {{firstName}}, {{company}} for personalization',
        'Preview how your email will look',
        'Save your template',
      ],
    },
    {
      step: 3,
      title: 'Import Contacts',
      description: 'Upload your contact list via CSV or add manually.',
      icon: Users,
      details: [
        'Go to Contacts page',
        'Click "Import CSV" for bulk upload',
        'Or add emails manually one by one',
        'Include name, company for personalization',
        'Duplicates are automatically detected',
      ],
    },
    {
      step: 4,
      title: 'Start Campaign',
      description: 'Select template, configure settings, and launch your campaign.',
      icon: Send,
      details: [
        'Go to Send Emails page',
        'Select a template from the list',
        'Set delay between emails (10-90 seconds)',
        'Enable tracking for analytics',
        'Click "Start Campaign"',
      ],
    },
  ];

  return (
    <>
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Zap className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Quick Start Guide</h2>
            <p className="text-sm text-stone-500">Get your first campaign running in 4 simple steps</p>
          </div>
        </div>

        <div className="space-y-6">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-stone-900 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    {item.step}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-full bg-stone-200 mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-stone-500" />
                    <h3 className="font-semibold text-stone-900">{item.title}</h3>
                  </div>
                  <p className="text-sm text-stone-600 mb-3">{item.description}</p>
                  <ul className="space-y-1.5">
                    {item.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Video Tutorial Placeholder */}
      <Card>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-stone-500" />
          </div>
          <h3 className="font-semibold text-stone-900 mb-2">Pro Tip</h3>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            Start with a small test batch (10-20 emails) to verify your SMTP settings and template 
            personalization before sending to your full contact list.
          </p>
        </div>
      </Card>
    </>
  );
}

function FeaturesSection() {
  const features = [
    {
      title: 'Dashboard',
      icon: BarChart3,
      description: 'Overview of your email campaigns with quick stats and actions.',
      capabilities: [
        'View total templates, contacts, and emails sent',
        'Monitor campaign status in real-time',
        'Quick access buttons to start campaigns',
        'Onboarding wizard for new users',
      ],
    },
    {
      title: 'Templates',
      icon: FileText,
      description: 'Create and manage reusable email templates.',
      capabilities: [
        'Create templates with rich text formatting',
        'Use personalization variables: {{firstName}}, {{company}}, {{email}}',
        'AI-powered template generation with Groq',
        'Import templates from CSV or JSON files',
        'Preview how emails will look with sample data',
      ],
    },
    {
      title: 'Contacts',
      icon: Users,
      description: 'Manage your email contact list efficiently.',
      capabilities: [
        'Import contacts via CSV with personalization fields',
        'Automatic duplicate detection and removal',
        'Email validation before adding',
        'Search and filter contacts',
        'Bulk delete options',
      ],
    },
    {
      title: 'Send Emails',
      icon: Send,
      description: 'Configure and launch email campaigns.',
      capabilities: [
        'Select template and preview with real data',
        'Configure delay between emails (prevent spam flags)',
        'Enable/disable open and click tracking',
        'Pause, resume, or stop campaigns anytime',
        'Real-time progress updates',
      ],
    },
    {
      title: 'Analytics',
      icon: BarChart3,
      description: 'Track email performance and engagement.',
      capabilities: [
        'View open rates and click rates',
        'See which links were clicked',
        'Campaign-by-campaign breakdown',
        'Export analytics data',
        'Unsubscribe tracking',
      ],
    },
    {
      title: 'Settings',
      icon: Settings,
      description: 'Configure SMTP and application settings.',
      capabilities: [
        'Secure SMTP credential storage',
        'DNS record checker (SPF, DKIM, DMARC)',
        'Provider-specific setup instructions',
        'Clear credentials option',
        'Cross-device sync',
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <Card key={feature.title}>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-stone-100 rounded-lg shrink-0">
                <Icon className="w-5 h-5 text-stone-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-stone-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-stone-600 mb-3">{feature.description}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {feature.capabilities.map((cap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                      <ChevronRight className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function BestPracticesSection() {
  const practices = [
    {
      category: 'Email Content',
      icon: FileText,
      tips: [
        { title: 'Personalize your emails', description: 'Use {{firstName}} and {{company}} to make emails feel personal.' },
        { title: 'Keep subject lines short', description: 'Aim for 40-60 characters for best open rates.' },
        { title: 'Include clear call-to-action', description: 'Tell recipients exactly what you want them to do.' },
        { title: 'Avoid spam trigger words', description: 'Words like "FREE", "URGENT", "ACT NOW" can trigger spam filters.' },
      ],
    },
    {
      category: 'Sending Strategy',
      icon: Send,
      tips: [
        { title: 'Start with warm-up', description: 'Send small batches first to build sender reputation.' },
        { title: 'Use appropriate delays', description: '15-30 seconds between emails prevents triggering spam filters.' },
        { title: 'Send at optimal times', description: 'Tuesday-Thursday, 10am-2pm typically have best open rates.' },
        { title: 'Monitor bounce rates', description: 'High bounces damage sender reputation. Clean your list regularly.' },
      ],
    },
    {
      category: 'Technical Setup',
      icon: Settings,
      tips: [
        { title: 'Configure DNS records', description: 'Set up SPF, DKIM, and DMARC for better deliverability.' },
        { title: 'Use app passwords', description: 'For Gmail/Outlook, use app-specific passwords, not your main password.' },
        { title: 'Enable tracking wisely', description: 'Tracking pixels can affect deliverability in some cases.' },
        { title: 'Test before sending', description: 'Always send test emails to yourself first.' },
      ],
    },
    {
      category: 'Compliance',
      icon: Shield,
      tips: [
        { title: 'Include unsubscribe link', description: 'Required by CAN-SPAM and GDPR regulations.' },
        { title: 'Honor opt-outs immediately', description: 'Never email someone who has unsubscribed.' },
        { title: 'Include physical address', description: 'CAN-SPAM requires a valid postal address in emails.' },
        { title: 'Get consent when needed', description: 'Some jurisdictions require explicit opt-in consent.' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {practices.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.category}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Icon className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-stone-900">{section.category}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {section.tips.map((tip, i) => (
                <div key={i} className="bg-stone-50 rounded-lg p-3">
                  <h4 className="font-medium text-stone-900 text-sm mb-1">{tip.title}</h4>
                  <p className="text-xs text-stone-600">{tip.description}</p>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TroubleshootingSection() {
  const issues = [
    {
      problem: 'SMTP Connection Failed',
      icon: AlertTriangle,
      solutions: [
        'Verify your SMTP host and port are correct',
        'Check that your email and password are correct',
        'For Gmail: Enable 2FA and create an App Password',
        'For Outlook: Use smtp-mail.outlook.com with port 587',
        'Ensure your firewall isn\'t blocking outgoing connections',
      ],
    },
    {
      problem: 'Emails Going to Spam',
      icon: Mail,
      solutions: [
        'Set up SPF, DKIM, and DMARC DNS records',
        'Avoid spam trigger words in subject/body',
        'Use longer delays between emails (30+ seconds)',
        'Warm up your email account gradually',
        'Ensure unsubscribe link is present',
      ],
    },
    {
      problem: 'High Bounce Rate',
      icon: Target,
      solutions: [
        'Verify email addresses before adding to contacts',
        'Remove invalid emails from your list',
        'Check for typos in email addresses',
        'Use email verification services for large lists',
        'Clean your list every 3-6 months',
      ],
    },
    {
      problem: 'Personalization Not Working',
      icon: FileText,
      solutions: [
        'Check variable syntax: use {{firstName}} not {firstName}',
        'Ensure contact has the required field (firstName, company, etc.)',
        'Variable names are case-sensitive',
        'Preview email before sending to verify',
        'Check CSV column headers match expected names',
      ],
    },
    {
      problem: 'Campaign Stuck or Not Progressing',
      icon: Clock,
      solutions: [
        'Check if campaign is paused (click Resume)',
        'Verify SMTP credentials haven\'t expired',
        'Check your internet connection',
        'Try stopping and restarting the campaign',
        'Check browser console for errors',
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-stone-900">Common Issues & Solutions</h2>
            <p className="text-sm text-stone-500">Quick fixes for frequent problems</p>
          </div>
        </div>
      </Card>

      {issues.map((issue) => {
        const Icon = issue.icon;
        return (
          <Card key={issue.problem}>
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-stone-900 mb-2">{issue.problem}</h3>
                <ul className="space-y-2">
                  {issue.solutions.map((solution, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {solution}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ShortcutsSection() {
  const tips = [
    {
      category: 'Template Variables',
      items: [
        { shortcut: '{{firstName}}', description: 'Contact\'s first name' },
        { shortcut: '{{lastName}}', description: 'Contact\'s last name' },
        { shortcut: '{{name}}', description: 'Full name' },
        { shortcut: '{{email}}', description: 'Email address' },
        { shortcut: '{{company}}', description: 'Company name' },
        { shortcut: '{{date}}', description: 'Today\'s date (formatted)' },
        { shortcut: '{{day}}', description: 'Day of week (Monday, Tuesday, etc.)' },
      ],
    },
    {
      category: 'CSV Import Tips',
      items: [
        { shortcut: 'email', description: 'Required column for contact email' },
        { shortcut: 'firstName', description: 'Maps to {{firstName}} variable' },
        { shortcut: 'lastName', description: 'Maps to {{lastName}} variable' },
        { shortcut: 'company', description: 'Maps to {{company}} variable' },
        { shortcut: 'custom1, custom2, custom3', description: 'Custom fields for any data' },
      ],
    },
    {
      category: 'Delay Recommendations',
      items: [
        { shortcut: '10-15 seconds', description: 'Aggressive (may trigger spam filters)' },
        { shortcut: '15-30 seconds', description: 'Balanced (recommended for most users)' },
        { shortcut: '30-60 seconds', description: 'Safe (best for new accounts)' },
        { shortcut: '60+ seconds', description: 'Very safe (for large campaigns)' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {tips.map((section) => (
        <Card key={section.category}>
          <h3 className="font-semibold text-stone-900 mb-4">{section.category}</h3>
          <div className="space-y-2">
            {section.items.map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b border-stone-100 last:border-0">
                <code className="px-2 py-1 bg-stone-100 rounded text-sm font-mono text-stone-800 shrink-0">
                  {item.shortcut}
                </code>
                <span className="text-sm text-stone-600">{item.description}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SecuritySection() {
  const sections = [
    {
      title: 'Data Storage',
      icon: Lock,
      description: 'How your data is protected',
      items: [
        'SMTP credentials are stored securely in our encrypted database',
        'Passwords are stored locally per device (not synced)',
        'All data is encrypted in transit (HTTPS)',
        'Campaign data auto-deletes after 48 hours',
      ],
    },
    {
      title: 'Access Control',
      icon: Shield,
      description: 'Authentication and authorization',
      items: [
        'Secure authentication via our secure authentication system',
        'Row-level security ensures you only see your data',
        'JWT tokens for API authentication',
        'Session management with automatic expiry',
      ],
    },
    {
      title: 'Best Practices',
      icon: CheckCircle,
      description: 'Recommendations for security',
      items: [
        'Use app-specific passwords (not your main password)',
        'Enable 2FA on your email provider account',
        'Log out when using shared computers',
        'Regularly review your contact list for outdated data',
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-stone-900">Security & Privacy</h2>
            <p className="text-sm text-stone-500">How we protect your data</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Privacy First:</strong> Sendium does not store or have access to your email content 
            after sending. Your SMTP credentials are stored securely and never shared.
          </p>
        </div>
      </Card>

      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.title}>
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 text-stone-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-stone-900 mb-1">{section.title}</h3>
                <p className="text-sm text-stone-500 mb-3">{section.description}</p>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function FAQSection({ expandedFaqs, toggleFaq }) {
  const faqs = [
    {
      id: 'smtp-gmail',
      question: 'How do I set up Gmail SMTP?',
      answer: `1. Enable 2-Factor Authentication in your Google Account
2. Go to Google Account → Security → App Passwords
3. Generate a new app password for "Mail"
4. Use smtp.gmail.com as host, port 587
5. Enter your Gmail address and the app password (not your regular password)`,
    },
    {
      id: 'smtp-outlook',
      question: 'How do I set up Outlook/Microsoft 365 SMTP?',
      answer: `1. Use smtp-mail.outlook.com as the SMTP host
2. Port: 587 (TLS)
3. Enter your full Outlook email address
4. For Microsoft 365: You may need admin approval for SMTP AUTH
5. Enable SMTP AUTH in your account settings if needed`,
    },
    {
      id: 'daily-limit',
      question: 'How many emails can I send per day?',
      answer: `This depends on your email provider:
• Gmail: ~500/day for personal, 2,000/day for Workspace
• Outlook: ~300/day
• Custom SMTP: Depends on your provider

We recommend staying under these limits and sending in batches to avoid account suspension.`,
    },
    {
      id: 'tracking-work',
      question: 'How does email tracking work?',
      answer: `We track opens and clicks using:
• Open tracking: A tiny invisible image (1x1 pixel) in your email
• Click tracking: Links are wrapped through our tracking server

When a recipient opens or clicks, we record the event. Note: Some email clients block tracking pixels, so open rates may be underreported.`,
    },
    {
      id: 'personalization',
      question: 'How do I personalize emails?',
      answer: `Use double curly braces with variable names:
• {{firstName}} - Recipient's first name
• {{company}} - Company name
• {{email}} - Email address

Make sure your contacts have these fields filled in. If a field is empty, "there" is used as fallback for names.`,
    },
    {
      id: 'bounce-handling',
      question: 'What happens when an email bounces?',
      answer: `Bounced emails are marked as "failed" in your campaign. The error message shows why it bounced (invalid address, mailbox full, etc.). We recommend removing bounced addresses to protect your sender reputation.`,
    },
    {
      id: 'data-retention',
      question: 'How long is campaign data stored?',
      answer: `Campaign data (emails queued, sent status) is automatically deleted 48 hours after campaign completion for privacy. Your contacts and templates are stored until you delete them.`,
    },
    {
      id: 'unsubscribe',
      question: 'How do unsubscribes work?',
      answer: `When tracking is enabled, unsubscribe links are added to emails. When clicked:
1. The recipient sees a confirmation page
2. Their email is recorded as unsubscribed
3. Future campaigns automatically skip unsubscribed emails

This helps you comply with anti-spam laws.`,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <HelpCircle className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-stone-900">Frequently Asked Questions</h2>
            <p className="text-sm text-stone-500">Quick answers to common questions</p>
          </div>
        </div>
      </Card>

      {faqs.map((faq) => (
        <Card key={faq.id} className="overflow-hidden">
          <button
            onClick={() => toggleFaq(faq.id)}
            className="w-full flex items-center justify-between gap-4 text-left"
          >
            <span className="font-medium text-stone-900">{faq.question}</span>
            {expandedFaqs.has(faq.id) ? (
              <ChevronDown className="w-5 h-5 text-stone-500 shrink-0" />
            ) : (
              <ChevronRight className="w-5 h-5 text-stone-500 shrink-0" />
            )}
          </button>
          {expandedFaqs.has(faq.id) && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <pre className="text-sm text-stone-600 whitespace-pre-wrap font-sans">
                {faq.answer}
              </pre>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
