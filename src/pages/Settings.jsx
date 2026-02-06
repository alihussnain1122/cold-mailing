import { useEffect, useState } from 'react';
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, Shield, Server, Key, User, Info, Trash2, Lock, Cloud, Globe, Search, ExternalLink, XCircle, Loader2, RefreshCw, Clock } from 'lucide-react';
import { Card, Button, Input, Alert, Badge, ConfirmDialog } from '../components/UI';
import { smtpService } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { checkAllDNS, getProviderInstructions } from '../utils';

export default function Settings() {
  const { user } = useAuth();
  const [config, setConfig] = useState({
    smtpHost: '',
    smtpPort: '587',
    emailUser: '',
    emailPass: '',
    senderName: 'Support Team',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configured, setConfigured] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [secureConnection, setSecureConnection] = useState(true);
  
  // DNS Checker state
  const [dnsResults, setDnsResults] = useState(null);
  const [dnsChecking, setDnsChecking] = useState(false);
  const [dnsError, setDnsError] = useState('');
  const [showInstructions, setShowInstructions] = useState(null);

  useEffect(() => {
    loadConfig();
    setSecureConnection(window.isSecureContext || location.hostname === 'localhost');
  }, [user]);

  // Auto-dismiss messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  async function loadConfig() {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const creds = await smtpService.get();
      if (creds) {
        setConfig({
          smtpHost: creds.smtpHost || '',
          smtpPort: creds.smtpPort || '587',
          emailUser: creds.emailUser || '',
          emailPass: creds.emailPass || '',
          senderName: creds.senderName || 'Support Team',
        });
        setConfigured(!!(creds.smtpHost && creds.emailUser && creds.emailPass));
      }
    } catch (err) {
      console.error('Failed to load SMTP config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    
    if (!config.smtpHost || !config.emailUser || !config.emailPass) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await smtpService.save(config);
      setSuccess('Settings saved successfully! Your SMTP configuration is securely stored and accessible from all your devices.');
      setConfigured(true);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setClearConfirm(true);
  }

  async function confirmClear() {
    try {
      await smtpService.delete();
      setConfig({
        smtpHost: '',
        smtpPort: '587',
        emailUser: '',
        emailPass: '',
        senderName: 'Support Team',
      });
      setConfigured(false);
      setDnsResults(null);
      setSuccess('Credentials cleared');
    } catch (err) {
      setError('Failed to clear credentials');
    }
    setClearConfirm(false);
  }

  // DNS Checker function
  async function handleCheckDNS() {
    if (!config.emailUser || !config.emailUser.includes('@')) {
      setDnsError('Please enter a valid email address first');
      return;
    }
    
    setDnsChecking(true);
    setDnsError('');
    
    try {
      const results = await checkAllDNS(config.emailUser);
      setDnsResults(results);
    } catch (err) {
      setDnsError('Failed to check DNS records: ' + err.message);
    } finally {
      setDnsChecking(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Security Warning */}
      {!secureConnection && (
        <Alert 
          type="error" 
          message="Warning: You're not using HTTPS. Your credentials could be intercepted. Only use this on localhost for testing." 
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Settings</h2>
          <p className="text-stone-500 mt-1 text-sm sm:text-base">Configure your SMTP email server settings</p>
        </div>
        <Badge variant={configured ? 'success' : 'warning'} size="md">
          {configured ? (
            <>
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Connected
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 mr-1.5" />
              Not Configured
            </>
          )}
        </Badge>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-600"></div>
            <span className="ml-3 text-stone-500">Loading settings...</span>
          </div>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            {/* Status Banner */}
            <div className={`mb-6 p-3 sm:p-4 rounded-xl flex items-start sm:items-center gap-3 sm:gap-4 ${
              configured 
                ? 'bg-emerald-50 border border-emerald-200' 
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${configured ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <Shield className={`w-5 h-5 sm:w-6 sm:h-6 ${configured ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <h3 className={`font-semibold text-sm sm:text-base ${configured ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {configured ? 'SMTP Connected' : 'SMTP Required'}
                </h3>
                <p className={`text-xs sm:text-sm ${configured ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {configured 
                    ? 'Your email server is configured and ready to send emails' 
                    : 'Configure your SMTP settings to start sending emails'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Sender Info Section */}
              <div>
                <h4 className="text-sm font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-stone-500" />
                  Sender Information
                </h4>
                <Input
                  label="Sender Name"
                  placeholder="e.g., Support Team, Your Company"
                  value={config.senderName}
                  onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                  hint="This name will appear as the sender in recipients' inboxes"
                />
              </div>

              {/* Server Settings Section */}
              <div className="pt-4 border-t border-stone-100">
                <h4 className="text-sm font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  <Server className="w-4 h-4 text-stone-500" />
                  Server Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="SMTP Host"
                      placeholder="smtp.gmail.com"
                      value={config.smtpHost}
                      onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Port"
                    placeholder="587"
                    value={config.smtpPort}
                    onChange={(e) => setConfig({ ...config, smtpPort: e.target.value })}
                  />
                </div>
              </div>

              {/* Authentication Section */}
              <div className="pt-4 border-t border-stone-100">
                <h4 className="text-sm font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  <Key className="w-4 h-4 text-stone-500" />
                  Authentication
                </h4>
                <div className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="your-email@gmail.com"
                    value={config.emailUser}
                    onChange={(e) => setConfig({ ...config, emailUser: e.target.value })}
                  />

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      App Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your app password"
                        value={config.emailPass}
                        onChange={(e) => setConfig({ ...config, emailPass: e.target.value })}
                        className="w-full px-4 py-3 pr-12 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-stone-500 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      For Gmail, use an App Password instead of your regular password
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-stone-100 flex flex-wrap gap-3">
                <Button type="submit" loading={saving}>
                  <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                  Save Configuration
                </Button>
                {configured && (
                  <Button type="button" variant="outline" onClick={handleClear}>
                    <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                    Clear Credentials
                  </Button>
                )}
              </div>

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Cloud className="w-5 h-5 text-stone-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-stone-900 text-sm">Multi-Device Access</h4>
                    <p className="text-xs text-stone-600 mt-1">
                      Your SMTP settings are securely stored in our servers and accessible from all your devices. 
                      Password is stored locally on each device for added security.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar Help */}
        <div className="space-y-6">
          {/* Quick Setup Guide */}
          <Card title="Quick Setup Guide" subtitle="Follow these steps">
            <div className="space-y-4">
              <SetupStep 
                number={1} 
                title="Choose Provider" 
                description="Select your email provider (Gmail, Outlook, etc.)"
                completed={!!config.smtpHost}
              />
              <SetupStep 
                number={2} 
                title="Enter Credentials" 
                description="Add your email and app password"
                completed={!!config.emailUser && !!config.emailPass}
              />
              <SetupStep 
                number={3} 
                title="Test Connection" 
                description="Save and verify your settings"
                completed={configured}
              />
            </div>
          </Card>

          {/* Provider Settings */}
          <Card title="Provider Settings">
            <div className="space-y-3">
              <ProviderInfo name="Gmail" host="smtp.gmail.com" port="587" />
              <ProviderInfo name="Outlook" host="smtp.office365.com" port="587" />
              <ProviderInfo name="Yahoo" host="smtp.mail.yahoo.com" port="587" />
              <ProviderInfo name="Zoho" host="smtp.zoho.com" port="587" />
            </div>
          </Card>

          {/* Security Note */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-stone-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-stone-900 text-sm">Security & Privacy</h4>
                <p className="text-xs text-stone-600 mt-1">
                  Your SMTP host, port, and email are securely stored in our encrypted database. Your password is stored locally on each device for maximum security.
                </p>
              </div>
            </div>
          </div>

          {/* Data Retention Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 text-sm">Auto Data Cleanup</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Campaign data is automatically deleted 48 hours after completion for your privacy and security. Templates and contacts remain until you delete them manually.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* DNS Record Checker Section */}
      {configured && (
        <Card>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-stone-100">
                <Globe className="w-6 h-6 text-stone-600" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Email Deliverability Check</h3>
                <p className="text-sm text-stone-500">
                  Check SPF, DKIM, and DMARC records for your domain
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleCheckDNS} 
              loading={dnsChecking}
              disabled={!config.emailUser}
            >
              {dnsChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : dnsResults ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-check
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Check DNS Records
                </>
              )}
            </Button>
          </div>

          {dnsError && <Alert type="error" message={dnsError} className="mb-4" />}

          {dnsResults && (
            <div className="space-y-6">
              {/* Score Overview */}
              <div className={`p-4 rounded-xl border ${
                dnsResults.overallStatus === 'excellent' ? 'bg-emerald-50 border-emerald-200' :
                dnsResults.overallStatus === 'good' ? 'bg-sky-50 border-sky-200' :
                dnsResults.overallStatus === 'fair' ? 'bg-amber-50 border-amber-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-4xl font-bold ${
                      dnsResults.overallStatus === 'excellent' ? 'text-emerald-600' :
                      dnsResults.overallStatus === 'good' ? 'text-sky-600' :
                      dnsResults.overallStatus === 'fair' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {dnsResults.score}/{dnsResults.maxScore}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900">Deliverability Score</div>
                      <div className="text-sm text-stone-600">Domain: {dnsResults.domain}</div>
                    </div>
                  </div>
                  <Badge 
                    variant={
                      dnsResults.overallStatus === 'excellent' ? 'success' :
                      dnsResults.overallStatus === 'good' ? 'info' :
                      dnsResults.overallStatus === 'fair' ? 'warning' :
                      'danger'
                    }
                    size="md"
                  >
                    {dnsResults.overallStatus.charAt(0).toUpperCase() + dnsResults.overallStatus.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Individual Record Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DNSRecordCard 
                  title="SPF Record"
                  description="Specifies which servers can send email for your domain"
                  result={dnsResults.spf}
                  onShowInstructions={() => setShowInstructions('spf')}
                />
                <DNSRecordCard 
                  title="DKIM Record"
                  description="Adds a digital signature to verify email authenticity"
                  result={dnsResults.dkim}
                  onShowInstructions={() => setShowInstructions('dkim')}
                />
                <DNSRecordCard 
                  title="DMARC Record"
                  description="Tells receivers what to do with failed emails"
                  result={dnsResults.dmarc}
                  onShowInstructions={() => setShowInstructions('dmarc')}
                />
                <DNSRecordCard 
                  title="MX Records"
                  description="Specifies mail servers for receiving email"
                  result={dnsResults.mx}
                  isMX={true}
                />
              </div>

              {/* Setup Instructions */}
              {showInstructions && (
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-stone-900">
                      Setup Instructions for {showInstructions.toUpperCase()}
                    </h4>
                    <button 
                      onClick={() => setShowInstructions(null)}
                      className="p-1 hover:bg-stone-200 rounded-lg"
                    >
                      <XCircle className="w-5 h-5 text-stone-500" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {['gmail', 'zoho', 'outlook'].map(provider => {
                      const instructions = getProviderInstructions(provider);
                      return (
                        <div key={provider} className="p-3 bg-white rounded-lg border">
                          <div className="font-medium text-stone-900 mb-2">{instructions.name}</div>
                          <p className="text-sm text-stone-600 font-mono bg-stone-50 p-2 rounded">
                            {instructions[showInstructions]}
                          </p>
                          {instructions.docs && (
                            <a 
                              href={instructions.docs}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-stone-700 hover:underline flex items-center gap-1 mt-2"
                            >
                              View full documentation
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-xs text-stone-500 text-center">
                Checked at {new Date(dnsResults.checkedAt).toLocaleString()}
              </p>
            </div>
          )}

          {!dnsResults && !dnsChecking && (
            <div className="text-center py-8 text-stone-500">
              <Globe className="w-12 h-12 mx-auto mb-3 text-stone-300" />
              <p>Click "Check DNS Records" to verify your email domain configuration</p>
              <p className="text-sm mt-1">This helps ensure your emails reach recipients' inboxes</p>
            </div>
          )}
        </Card>
      )}

      {/* Clear Credentials Confirmation */}
      <ConfirmDialog
        isOpen={clearConfirm}
        onClose={() => setClearConfirm(false)}
        onConfirm={confirmClear}
        title="Clear Credentials"
        message="Are you sure you want to clear your SMTP credentials? You'll need to reconfigure them to send emails."
        confirmText="Clear"
        variant="danger"
      />
    </div>
  );
}

// Setup Step Component
function SetupStep({ number, title, description, completed }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
        completed 
          ? 'bg-emerald-100 text-emerald-700' 
          : 'bg-stone-100 text-stone-500'
      }`}>
        {completed ? <CheckCircle className="w-4 h-4" /> : number}
      </div>
      <div>
        <h5 className={`text-sm font-medium ${completed ? 'text-emerald-700' : 'text-stone-900'}`}>{title}</h5>
        <p className="text-xs text-stone-500">{description}</p>
      </div>
    </div>
  );
}

// Provider Info Component
function ProviderInfo({ name, host, port }) {
  return (
    <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
      onClick={() => {
        navigator.clipboard?.writeText(host);
      }}
    >
      <div>
        <div className="text-sm font-medium text-stone-900">{name}</div>
        <div className="text-xs text-stone-500">{host}</div>
      </div>
      <Badge variant="default" size="xs">Port {port}</Badge>
    </div>
  );
}

// DNS Record Card Component
function DNSRecordCard({ title, description, result, onShowInstructions, isMX = false }) {
  const getStatusIcon = () => {
    if (result.status === 'found' && result.severity === 'success') {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    } else if (result.status === 'found' && result.severity === 'warning') {
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    } else if (result.status === 'missing') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (result.status === 'found' && result.severity === 'success') return 'border-emerald-200 bg-emerald-50';
    if (result.status === 'found' && result.severity === 'warning') return 'border-amber-200 bg-amber-50';
    return 'border-red-200 bg-red-50';
  };

  return (
    <div className={`p-4 rounded-xl border ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div>
            <div className="font-semibold text-stone-900">{title}</div>
            <div className="text-xs text-stone-600">{description}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <div className="text-sm text-stone-700">{result.message}</div>
        
        {result.record && !isMX && (
          <div className="mt-2 p-2 bg-white rounded border text-xs font-mono text-stone-600 break-all max-h-20 overflow-y-auto">
            {result.record}
          </div>
        )}
        
        {isMX && result.records && result.records.length > 0 && (
          <div className="mt-2 space-y-1">
            {result.records.slice(0, 3).map((mx, i) => (
              <div key={i} className="p-2 bg-white rounded border text-xs font-mono text-stone-600">
                Priority {mx.priority}: {mx.exchange}
              </div>
            ))}
            {result.records.length > 3 && (
              <div className="text-xs text-stone-500">
                +{result.records.length - 3} more record(s)
              </div>
            )}
          </div>
        )}
        
        {result.status === 'missing' && onShowInstructions && (
          <button
            onClick={onShowInstructions}
            className="mt-3 text-sm text-stone-700 hover:underline flex items-center gap-1"
          >
            <Info className="w-4 h-4" />
            How to fix this
          </button>
        )}
        
        {result.selector && (
          <div className="mt-2 text-xs text-stone-500">
            Selector: {result.selector}
          </div>
        )}
      </div>
    </div>
  );
}
