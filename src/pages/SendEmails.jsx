import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Mail, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Users,
  FileText,
  Send,
  Timer,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, Button, Alert, LoadingSpinner } from '../components/UI';
import { useCampaign } from '../context/CampaignContext';
import { templatesService, contactsService } from '../services/supabase';
import { replaceVariables, validateContactEmails } from '../utils';

export default function SendEmails() {
  const { 
    startCampaign, 
    resumeCampaign, 
    stopCampaign,
    resetCampaign,
    canResume,
    // Campaign state spread
    campaignId,
    isRunning,
    currentEmail,
    progress,
    total,
    sent,
    failed,
    status,
    error: campaignError,
    nextEmailAt,
    startedAt,
    currentTemplate,
  } = useCampaign();

  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Campaign settings
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [delayMin, setDelayMin] = useState(10);
  const [delayMax, setDelayMax] = useState(30);
  const [enableTracking, setEnableTracking] = useState(true);
  const [campaignName, setCampaignName] = useState('');
  
  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load data function
  const loadData = useCallback(async () => {
    try {
      const [templatesData, contactsData] = await Promise.all([
        templatesService.getAll(),
        contactsService.getAll(),
      ]);
      setTemplates(templatesData || []);
      setContacts(contactsData || []);
      
      // Auto-select first template
      if (templatesData?.length > 0) {
        setSelectedTemplate(prev => prev || templatesData[0]);
      }
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Preview email with first contact's data
  const previewEmail = useMemo(() => {
    if (!selectedTemplate || contacts.length === 0) return null;
    
    const sampleContact = contacts[0];
    return {
      subject: replaceVariables(selectedTemplate.subject, sampleContact),
      body: replaceVariables(selectedTemplate.body, sampleContact),
    };
  }, [selectedTemplate, contacts]);

  // Handle campaign start
  async function handleStartCampaign() {
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }
    if (contacts.length === 0) {
      setError('No contacts available. Please add contacts first.');
      return;
    }

    // Validate all emails before sending
    const validation = validateContactEmails(contacts);
    
    if (validation.hasInvalid) {
      const invalidEmails = validation.invalid.slice(0, 5).map(c => c.email).join(', ');
      const moreCount = validation.invalid.length > 5 ? ` and ${validation.invalid.length - 5} more` : '';
      setError(`Found ${validation.invalid.length} invalid email(s): ${invalidEmails}${moreCount}. Please fix or remove them from Contacts before sending.`);
      return;
    }

    setError('');
    
    try {
      // Attach template to each contact (as the context expects)
      const contactsWithTemplate = validation.valid.map(contact => ({
        ...contact,
        template: selectedTemplate,
      }));
      
      await startCampaign(contactsWithTemplate, {
        delayMin: delayMin * 1000,
        delayMax: delayMax * 1000,
        campaignName: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        enableTracking,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  // Calculate progress percentage
  const progressPercent = total > 0 
    ? Math.round((sent + failed) / total * 100)
    : 0;
  
  // Real countdown timer based on server's next_email_at timestamp
  const [countdown, setCountdown] = useState(0);
  
  useEffect(() => {
    if (!isRunning || !nextEmailAt) {
      setCountdown(0);
      return;
    }
    
    // Calculate countdown from server timestamp
    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(nextEmailAt).getTime();
      const remaining = Math.max(0, Math.ceil((target - now) / 1000));
      setCountdown(remaining);
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, [isRunning, nextEmailAt]);
  
  // Calculate real estimated time based on actual progress rate
  const estimatedTime = useMemo(() => {
    if (total === 0 || !isRunning || !startedAt) return null;
    const remaining = total - (sent + failed);
    if (remaining <= 0) return null;
    
    const emailsProcessed = sent + failed;
    
    // If we have progress data, calculate based on actual rate
    if (emailsProcessed > 0) {
      const elapsedMs = Date.now() - new Date(startedAt).getTime();
      const msPerEmail = elapsedMs / emailsProcessed;
      const estimatedMs = remaining * msPerEmail;
      const estimatedSeconds = Math.ceil(estimatedMs / 1000);
      
      const hours = Math.floor(estimatedSeconds / 3600);
      const minutes = Math.floor((estimatedSeconds % 3600) / 60);
      const seconds = estimatedSeconds % 60;
      
      if (hours > 0) return `~${hours}h ${minutes}m`;
      if (minutes > 0) return `~${minutes}m ${seconds}s`;
      return `~${seconds}s`;
    }
    
    // Fallback to estimate based on configured delay
    const avgDelay = (delayMin + delayMax) / 2;
    const estimatedSeconds = Math.ceil(remaining * avgDelay);
    
    const hours = Math.floor(estimatedSeconds / 3600);
    const minutes = Math.floor((estimatedSeconds % 3600) / 60);
    const seconds = estimatedSeconds % 60;
    
    if (hours > 0) return `~${hours}h ${minutes}m`;
    if (minutes > 0) return `~${minutes}m ${seconds}s`;
    return `~${seconds}s`;
  }, [total, sent, failed, startedAt, delayMin, delayMax, isRunning]);

  // Status color
  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'text-green-600';
      case 'paused': return 'text-amber-600';
      case 'completed': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-stone-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Send Emails</h2>
        <p className="text-stone-500 mt-1">Start and manage your email campaigns</p>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError('')} />
      )}

      {/* Data Retention Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Data Retention Policy</p>
            <p className="text-sm text-amber-700 mt-1">
              Campaign data is automatically deleted 48 hours after completion for your privacy and security.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Campaign Setup */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Selection */}
          <Card>
            <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-stone-600" />
              Select Template
            </h3>
            
            {templates.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No templates available.</p>
                <p className="text-sm mt-1">Create a template first to start sending.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.slice(0, 5).map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-stone-900">{template.name}</h4>
                        <p className="text-sm text-stone-500 mt-1 truncate max-w-md">
                          {template.subject}
                        </p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircle className="w-5 h-5 text-stone-900" />
                      )}
                    </div>
                  </div>
                ))}
                {templates.length > 5 && (
                  <p className="text-sm text-stone-500 text-center">
                    +{templates.length - 5} more templates available
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Campaign Settings */}
          <Card>
            <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-stone-600" />
              Campaign Settings
            </h3>

            <div className="space-y-4">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Campaign Name (optional)
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={`Campaign ${new Date().toLocaleDateString()}`}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                  disabled={isRunning}
                />
              </div>

              {/* Delay Setting */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Random Delay Between Emails
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-stone-600">Min:</span>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={delayMin}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val <= delayMax) setDelayMin(val);
                      }}
                      className="w-20 px-2 py-1 border border-stone-300 rounded text-center"
                      disabled={isRunning}
                    />
                    <span className="text-sm text-stone-600">Max:</span>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={delayMax}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= delayMin) setDelayMax(val);
                      }}
                      className="w-20 px-2 py-1 border border-stone-300 rounded text-center"
                      disabled={isRunning}
                    />
                    <span className="text-sm text-stone-600">seconds</span>
                  </div>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Recommended: 10-30 seconds for natural sending pattern
                </p>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="space-y-3 pt-2 border-t border-stone-100">
                  {/* Tracking Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableTracking}
                      onChange={(e) => setEnableTracking(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                      disabled={isRunning}
                    />
                    <span className="text-sm text-stone-700">Enable open & click tracking</span>
                  </label>
                </div>
              )}
            </div>
          </Card>

          {/* Email Preview */}
          {selectedTemplate && (
            <Card>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-stone-600" />
                  Email Preview
                </h3>
                {showPreview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showPreview && previewEmail && (
                <div className="mt-4 space-y-3">
                  <div className="bg-stone-50 p-4 rounded-lg">
                    <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Subject</p>
                    <p className="font-medium text-stone-900">{previewEmail.subject}</p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-lg">
                    <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Body</p>
                    <div 
                      className="text-stone-700 text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: previewEmail.body.replace(/\n/g, '<br>') }}
                    />
                  </div>
                  <p className="text-xs text-stone-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Preview shown with data from first contact
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column - Campaign Status */}
        <div className="space-y-6">
          {/* Campaign Status Card */}
          <Card>
            <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-stone-600" />
              Campaign Status
            </h3>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-medium capitalize ${getStatusColor()}`}>
                {status}
              </span>
              {status === 'running' && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
            </div>

            {/* Progress */}
            {total > 0 && (
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Progress</span>
                  <span className="font-medium text-stone-900">{progressPercent}%</span>
                </div>
                <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-stone-900 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-stone-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-stone-600 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Total</span>
                </div>
                <p className="text-xl font-bold text-stone-900">
                  {total || contacts.length}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Sent</span>
                </div>
                <p className="text-xl font-bold text-green-700">{sent}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Failed</span>
                </div>
                <p className="text-xl font-bold text-red-700">{failed}</p>
              </div>
              {isRunning && countdown > 0 && (
                <div className="bg-amber-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <Timer className="w-4 h-4" />
                    <span className="text-xs">Next in</span>
                  </div>
                  <p className="text-xl font-bold text-amber-700">{countdown}s</p>
                </div>
              )}
              {isRunning && estimatedTime && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Est. Time</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700">{estimatedTime}</p>
                </div>
              )}
            </div>

            {/* Current Email */}
            {currentEmail && (
              <div className="mb-6 p-3 bg-stone-50 rounded-lg">
                <p className="text-xs text-stone-500 mb-1">Sending to</p>
                <p className="text-sm font-medium text-stone-900 truncate">
                  {currentEmail}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {status === 'idle' && (
                <Button
                  onClick={handleStartCampaign}
                  className="w-full"
                  disabled={!selectedTemplate || contacts.length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Campaign
                </Button>
              )}

              {status === 'running' && (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={stopCampaign}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                  <Button variant="danger" onClick={resetCampaign}>
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              )}

              {status === 'paused' && (
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={resumeCampaign}>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                  <Button variant="danger" onClick={resetCampaign}>
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              )}

              {(status === 'completed' || status === 'error') && (
                <Button
                  onClick={handleStartCampaign}
                  className="w-full"
                  disabled={!selectedTemplate || contacts.length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start New Campaign
                </Button>
              )}
            </div>

            {/* Error Display */}
            {campaignError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{campaignError}</p>
              </div>
            )}
          </Card>

          {/* Tips Card */}
          <Card>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Tips for Better Delivery</h3>
            <ul className="space-y-2 text-xs text-stone-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Use 15-30 second delays between emails
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Personalize with recipient's name
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Keep subject lines under 50 characters
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Avoid spam trigger words
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
