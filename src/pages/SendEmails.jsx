import { useEffect, useState, useCallback, useMemo } from 'react';
import { Play, Square, Send, Clock, CheckCircle, XCircle, Mail, RefreshCw, PlayCircle, Activity, Cloud, Bell, BellOff, Timer, Calendar, X } from 'lucide-react';
import { Card, Button, Input, Alert, Badge, PageLoader, useMarkTestEmailSent, useMarkFirstCampaignSent } from '../components/UI';
import { templatesService, contactsService, smtpService } from '../services/supabase';
import { sendAPI } from '../services/api';
import { useCampaign } from '../context/CampaignContext';
import { 
  detectUsedVariables, 
  getNotificationPermission, 
  requestNotificationPermission,
  SUPPORTED_VARIABLES,
} from '../utils';

export default function SendEmails() {
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [senderName, setSenderName] = useState('');
  const [delayMin, setDelayMin] = useState(10);
  const [delayMax, setDelayMax] = useState(90);
  
  const [testEmail, setTestEmail] = useState('');
  const [testTemplateIndex, setTestTemplateIndex] = useState(0);
  
  // Onboarding markers
  const markTestEmailSent = useMarkTestEmailSent();
  const markFirstCampaignSent = useMarkFirstCampaignSent();
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  // Scheduling state
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Use campaign context
  const campaign = useCampaign();

  // Check notification permission on mount
  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
  }, []);

  // Calculate estimated completion time
  const estimatedCompletion = useMemo(() => {
    const remaining = selectedContacts.length - (campaign.sent || 0);
    if (remaining <= 0) return null;
    
    const avgDelaySeconds = (delayMin + delayMax) / 2;
    const totalSeconds = remaining * avgDelaySeconds;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [selectedContacts.length, campaign.sent, delayMin, delayMax]);

  // Detect which personalization variables are used in selected templates
  const usedVariables = useMemo(() => {
    if (selectedTemplates.length === 0 || templates.length === 0) return [];
    
    const allVariables = new Set();
    selectedTemplates.forEach(index => {
      const template = templates[index];
      if (template) {
        const varsInSubject = detectUsedVariables(template.subject);
        const varsInBody = detectUsedVariables(template.body);
        varsInSubject.forEach(v => allVariables.add(v));
        varsInBody.forEach(v => allVariables.add(v));
      }
    });
    return Array.from(allVariables);
  }, [selectedTemplates, templates]);

  // Handle notification permission request
  async function handleEnableNotifications() {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  }

  // Initial data load - runs once on mount
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const [templatesData, contactsData, smtpConfig] = await Promise.all([
        templatesService.getAll(),
        contactsService.getAll(),
        smtpService.get(),
      ]);
      
      setTemplates(templatesData);
      setContacts(contactsData);
      
      // Set sender name from SMTP config only on initial load
      if (smtpConfig?.senderName) {
        setSenderName(prev => prev || smtpConfig.senderName);
      }
      
      // Only auto-select all if none are selected (initial load)
      setSelectedTemplates(prev => 
        prev.length === 0 && templatesData.length > 0 
          ? templatesData.map((_, i) => i) 
          : prev
      );
      setSelectedContacts(prev => 
        prev.length === 0 && contactsData.length > 0 
          ? contactsData 
          : prev
      );
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // No dependencies - uses functional updates

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  async function handleStart() {
    if (selectedContacts.length === 0) {
      setError('Please select at least one contact');
      return;
    }
    if (selectedTemplates.length === 0) {
      setError('Please select at least one template');
      return;
    }
    
    // Validate delay values
    const minDelay = Math.max(1, delayMin);
    const maxDelay = Math.max(minDelay, delayMax);
    if (delayMin !== minDelay || delayMax !== maxDelay) {
      setDelayMin(minDelay);
      setDelayMax(maxDelay);
    }

    setError('');
    setSuccess('');
    
    const selectedTemplateObjects = selectedTemplates.map(i => templates[i]).filter(Boolean);

    // Prepare campaign data with template rotation
    const campaignContacts = selectedContacts.map((contact, index) => {
      const templateIndex = index % selectedTemplateObjects.length;
      const template = selectedTemplateObjects[templateIndex];
      return {
        email: contact.email || contact,
        name: contact.name || '',
        company: contact.company || '',
        template
      };
    });

    // Start campaign using context with validated delays
    campaign.startCampaign(
      campaignContacts,
      { 
        delayMin: minDelay * 1000, 
        delayMax: maxDelay * 1000,
        senderName: senderName || 'Support Team'
      }
    );

    markFirstCampaignSent(); // Mark first campaign step as complete
    setSuccess('Campaign started! You can navigate to other pages while it runs.');
  }

  function handleStop() {
    campaign.stopCampaign();
  }

  function handleReset() {
    campaign.resetCampaign();
    setSuccess('');
    setError('');
  }

  async function handleScheduleCampaign() {
    if (!scheduleDate || !scheduleTime) {
      setError('Please select a date and time for scheduling');
      return;
    }
    
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    
    if (scheduledAt <= new Date()) {
      setError('Scheduled time must be in the future');
      return;
    }
    
    if (selectedContacts.length === 0) {
      setError('Please select at least one contact');
      return;
    }
    if (selectedTemplates.length === 0) {
      setError('Please select at least one template');
      return;
    }
    
    setScheduling(true);
    setError('');
    
    try {
      const selectedTemplateObjects = selectedTemplates.map(i => templates[i]).filter(Boolean);
      
      // Create campaign data for scheduling
      const campaignContacts = selectedContacts.map((contact, index) => {
        const templateIndex = index % selectedTemplateObjects.length;
        const template = selectedTemplateObjects[templateIndex];
        return {
          email: contact.email || contact,
          name: contact.name || '',
          company: contact.company || '',
          template
        };
      });
      
      // Schedule the campaign using context
      await campaign.scheduleCampaign(
        campaignContacts,
        {
          delayMin: delayMin * 1000,
          delayMax: delayMax * 1000,
          senderName: senderName || 'Support Team',
          scheduledAt: scheduledAt.toISOString(),
        }
      );
      
      setSuccess(`Campaign scheduled for ${scheduledAt.toLocaleString()}`);
      setShowScheduler(false);
      setScheduleDate('');
      setScheduleTime('');
    } catch (err) {
      setError('Failed to schedule campaign: ' + err.message);
    } finally {
      setScheduling(false);
    }
  }

  // Get minimum date for scheduling (now)
  function getMinDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
  
  // Get minimum time if date is today
  function getMinTime() {
    if (scheduleDate === getMinDate()) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 5); // At least 5 minutes from now
      return now.toTimeString().slice(0, 5);
    }
    return '00:00';
  }

  async function handleTestEmail() {
    if (!testEmail || !testEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const template = templates[testTemplateIndex];
    if (!template) {
      setError('Please select a template');
      return;
    }

    setTestSending(true);
    setError('');
    try {
      await sendAPI.testWithTemplate(testEmail, template, senderName);
      setSuccess(`Test email sent to ${testEmail}`);
      markTestEmailSent(); // Mark test email step as complete
    } catch (err) {
      setError(err.message);
    } finally {
      setTestSending(false);
    }
  }

  function toggleTemplate(index) {
    setSelectedTemplates(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  }

  if (loading) {
    return <PageLoader />;
  }

  const progressPercent = campaign.total > 0 ? (campaign.sent / campaign.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Send Emails</h2>
          <p className="text-gray-500 mt-1">Configure and start your email campaign</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => loadData(true)}
          loading={refreshing}
          aria-label="Refresh data"
        >
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card title="Campaign Configuration">
          <div className="space-y-4">
            <Input
              label="Sender Name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Name that appears in emails"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min Delay (seconds)"
                type="number"
                value={delayMin}
                onChange={(e) => setDelayMin(Number(e.target.value))}
                min="1"
              />
              <Input
                label="Max Delay (seconds)"
                type="number"
                value={delayMax}
                onChange={(e) => setDelayMax(Number(e.target.value))}
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Templates ({selectedTemplates.length} selected)
              </label>
              <div 
                className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3"
                role="group"
                aria-label="Select templates"
              >
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No templates available. Create templates first.
                  </p>
                ) : (
                  templates.map((template, index) => (
                    <label key={index} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(index)}
                        onChange={() => toggleTemplate(index)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 truncate">{template.subject}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Recipients: {selectedContacts.length} contacts
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedContacts(
                    selectedContacts.length === contacts.length ? [] : contacts
                  )}
                >
                  {selectedContacts.length === contacts.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              {/* Personalization Variables Info */}
              {usedVariables.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-purple-900 mb-1">
                    📝 Personalization Variables Detected
                  </p>
                  <p className="text-xs text-purple-700">
                    Using: {usedVariables.map(v => `{{${v}}}`).join(', ')}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Make sure your contacts have these fields in their CSV data.
                  </p>
                </div>
              )}
              
              {/* Estimated Time Preview */}
              {selectedContacts.length > 0 && !campaign.isRunning && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Timer className="w-4 h-4 text-gray-500" />
                    <span>
                      Estimated time: <strong>{estimatedCompletion}</strong>
                    </span>
                  </div>
                </div>
              )}
              
              {/* Browser Notifications Toggle */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  {notificationPermission === 'granted' ? (
                    <Bell className="w-4 h-4 text-green-600" />
                  ) : (
                    <BellOff className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700">Browser Notifications</span>
                </div>
                {notificationPermission === 'granted' ? (
                  <Badge variant="success">Enabled</Badge>
                ) : notificationPermission === 'denied' ? (
                  <Badge variant="error">Blocked</Badge>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleEnableNotifications}>
                    Enable
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {campaign.isRunningElsewhere ? (
                <div className="w-full">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-900">Campaign running on another device</div>
                      <div className="text-xs text-blue-600">Progress: {campaign.sent}/{campaign.total} sent</div>
                    </div>
                    <Cloud className="w-4 h-4 text-blue-400" />
                  </div>
                  <Button variant="outline" onClick={handleStop} className="w-full">
                    <Square className="w-4 h-4 mr-2" aria-hidden="true" />
                    Pause Campaign
                  </Button>
                </div>
              ) : campaign.isRunning ? (
                <>
                  <Button variant="danger" onClick={handleStop} className="flex-1">
                    <Square className="w-4 h-4 mr-2" aria-hidden="true" />
                    Stop Campaign
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </>
              ) : campaign.canResume ? (
                <>
                  <Button 
                    onClick={() => campaign.resumeCampaign()} 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                    Resume Campaign ({campaign.sent}/{campaign.total})
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Discard
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleStart} 
                    className="flex-1" 
                    disabled={selectedTemplates.length === 0 || selectedContacts.length === 0}
                  >
                    <Play className="w-4 h-4 mr-2" aria-hidden="true" />
                    Start Now
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setShowScheduler(!showScheduler)}
                    disabled={selectedTemplates.length === 0 || selectedContacts.length === 0}
                  >
                    <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
                    Schedule
                  </Button>
                  {campaign.status !== 'idle' && (
                    <Button variant="outline" onClick={handleReset}>
                      Reset
                    </Button>
                  )}
                </>
              )}
            </div>
            
            {/* Schedule Panel */}
            {showScheduler && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-blue-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule Campaign
                  </h4>
                  <button 
                    onClick={() => setShowScheduler(false)}
                    className="p-1 hover:bg-blue-100 rounded"
                  >
                    <X className="w-4 h-4 text-blue-700" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={getMinDate()}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      min={getMinTime()}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
                
                {scheduleDate && scheduleTime && (
                  <p className="text-sm text-blue-700 mb-3">
                    📅 Will start: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
                  </p>
                )}
                
                <Button 
                  onClick={handleScheduleCampaign}
                  loading={scheduling}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!scheduleDate || !scheduleTime}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Campaign
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Test Email */}
        <Card title="Send Test Email">
          <div className="space-y-4">
            <Input
              label="Test Email Address"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to test"
            />
            
            <div>
              <label htmlFor="test-template" className="block text-sm font-medium text-gray-700 mb-1.5">
                Template
              </label>
              <select
                id="test-template"
                value={testTemplateIndex}
                onChange={(e) => setTestTemplateIndex(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={templates.length === 0}
              >
                {templates.length === 0 ? (
                  <option>No templates available</option>
                ) : (
                  templates.map((template, index) => (
                    <option key={index} value={index}>
                      {template.subject}
                    </option>
                  ))
                )}
              </select>
            </div>

            <Button 
              variant="secondary" 
              onClick={handleTestEmail} 
              className="w-full"
              loading={testSending}
              disabled={templates.length === 0}
            >
              <Send className="w-4 h-4 mr-2" aria-hidden="true" />
              Send Test Email
            </Button>
          </div>
        </Card>
      </div>

      {/* Progress */}
      {campaign.status !== 'idle' && (
        <Card title="Campaign Progress">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {campaign.isRunning && (
                  <div className="animate-pulse" aria-hidden="true">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                )}
                <Badge variant={
                  campaign.status === 'running' ? 'success' :
                  campaign.status === 'completed' ? 'default' :
                  campaign.status === 'paused' ? 'warning' :
                  'error'
                }>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              </div>
              <span className="text-lg font-semibold">
                {campaign.sent || 0} / {campaign.total || 0}
              </span>
            </div>

            <div 
              className="w-full bg-gray-200 rounded-full h-3"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Campaign progress"
            >
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {campaign.currentEmail && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <Mail className="w-4 h-4" aria-hidden="true" />
                <div className="flex-1">
                  <div>Sending to: <strong>{campaign.currentEmail}</strong></div>
                  {campaign.currentTemplate && (
                    <div className="text-xs text-gray-500 mt-1">Template: {campaign.currentTemplate}</div>
                  )}
                </div>
              </div>
            )}

            {campaign.nextEmailIn > 0 && (
              <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 rounded-lg p-3">
                <Clock className="w-4 h-4 animate-pulse" aria-hidden="true" />
                <span className="font-medium">Next email in {campaign.nextEmailIn} seconds</span>
              </div>
            )}

            {/* Estimated Completion Time */}
            {campaign.isRunning && campaign.total > campaign.sent && (
              <div className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg p-3">
                <Timer className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">
                  Estimated completion: {(() => {
                    const remaining = campaign.total - campaign.sent;
                    const avgDelaySeconds = (delayMin + delayMax) / 2;
                    const totalSeconds = remaining * avgDelaySeconds;
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    if (hours > 0) return `${hours}h ${minutes}m`;
                    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                    return 'Less than a minute';
                  })()}
                </span>
              </div>
            )}

            {campaign.failed > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700">
                  <XCircle className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Failed: {campaign.failed}
                </p>
              </div>
            )}

            {campaign.error && (
              <Alert type="error" message={campaign.error} />
            )}

            {campaign.status === 'completed' && (
              <Alert 
                type="success" 
                message={`Campaign completed! Sent ${campaign.sent} emails successfully.`} 
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
