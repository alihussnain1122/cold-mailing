import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Users, FileText, Send, Clock, CheckCircle, XCircle, Activity,
  PlayCircle, Settings, AlertTriangle, ArrowRight,
  BarChart3, Target
} from 'lucide-react';
import { Card, Badge, PageLoader, Button, OnboardingWizard } from '../components/UI';
import { templatesService, contactsService, smtpService } from '../services/supabase';
import { useCampaign } from '../context/CampaignContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const campaign = useCampaign();
  const [stats, setStats] = useState({
    templates: 0,
    contacts: 0,
    configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [recentTemplates, setRecentTemplates] = useState([]);

  useEffect(() => {
    let cancelled = false;
    
    async function loadData() {
      try {
        const [templates, contacts, isConfigured] = await Promise.all([
          templatesService.getAll(),
          contactsService.getAll(),
          smtpService.isConfigured(),
        ]);
        
        if (cancelled) return;
        
        setStats({
          templates: templates.length,
          contacts: contacts.length,
          configured: isConfigured,
        });
        setRecentTemplates(templates.slice(0, 3));
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load dashboard data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    loadData();
    
    return () => { cancelled = true; };
  }, []);

  const successRate = campaign.total > 0 
    ? Math.min(100, Math.round((campaign.sent / campaign.total) * 100))
    : 100;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Dashboard</h1>
            <p className="text-stone-500 mt-1 text-sm sm:text-base">
              Monitor your email campaigns and manage your outreach
            </p>
          </div>
          <div className="flex items-center gap-3">
            {stats.configured ? (
              <Badge variant="success">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                SMTP Connected
              </Badge>
            ) : (
              <Badge variant="warning">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Setup Required
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-5 pt-5 border-t border-stone-100">
          <Button size="sm" onClick={() => navigate('/send')}>
            <PlayCircle className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Start Campaign</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/templates')}>
            <FileText className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Template</span>
          </Button>
          {!stats.configured && (
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Configure SMTP</span>
            </Button>
          )}
        </div>
      </div>

      {/* Onboarding Wizard - Show for new users */}
      <OnboardingWizard />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={FileText}
          label="Email Templates"
          value={stats.templates}
          sublabel={stats.templates === 0 ? "Create your first template" : "Ready to use"}
          onClick={() => navigate('/templates')}
        />
        <StatCard
          icon={Users}
          label="Total Contacts"
          value={stats.contacts}
          sublabel={stats.contacts === 0 ? "Import contacts" : "In your list"}
          onClick={() => navigate('/contacts')}
        />
        <StatCard
          icon={Send}
          label="Emails Sent"
          value={campaign.sent}
          sublabel={campaign.isRunning ? "Campaign active" : "This session"}
        />
        <StatCard
          icon={Target}
          label="Success Rate"
          value={`${successRate}%`}
          sublabel={campaign.failed > 0 ? `${campaign.failed} failed` : "All delivered"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Status - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card 
            title="Campaign Status" 
            action={
              campaign.status !== 'idle' && (
                <Badge variant={
                  campaign.status === 'running' ? 'success' :
                  campaign.status === 'completed' ? 'default' :
                  'warning'
                }>
                  {campaign.status === 'running' && <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>}
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              )
            }
          >
            {campaign.isRunning || campaign.status !== 'idle' ? (
              <div className="space-y-5">
                {/* Progress Section */}
                <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-stone-500" />
                      <span className="text-sm font-medium text-stone-700">Progress</span>
                    </div>
                    <span className="text-lg font-semibold text-stone-900">
                      {campaign.sent} <span className="text-stone-400 text-sm font-normal">/ {campaign.total}</span>
                    </span>
                  </div>
                  
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out bg-stone-700"
                      style={{ width: `${Math.min(100, campaign.total > 0 ? (campaign.sent / campaign.total) * 100 : 0)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-stone-500 mt-2">
                    <span>{Math.min(100, Math.round((campaign.sent / campaign.total) * 100 || 0))}% complete</span>
                    <span>{campaign.total - campaign.sent} remaining</span>
                  </div>
                </div>

                {/* Current Activity */}
                {campaign.currentEmail && (
                  <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-lg p-3">
                    <div className="w-8 h-8 bg-stone-200 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-stone-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-stone-900 truncate">Sending to: {campaign.currentEmail}</div>
                      {campaign.currentTemplate && (
                        <div className="text-xs text-stone-500 truncate">Template: {campaign.currentTemplate}</div>
                      )}
                    </div>
                    <div className="w-4 h-4 border-2 border-stone-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {/* Timer */}
                {campaign.nextEmailIn > 0 && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-700">Next email in <span className="font-semibold">{campaign.nextEmailIn}s</span></span>
                  </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <div className="text-xl font-semibold text-emerald-700">{campaign.sent}</div>
                    <div className="text-xs text-emerald-600">Sent</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 border border-red-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <div className="text-xl font-semibold text-red-600">{campaign.failed}</div>
                    <div className="text-xs text-red-500">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-stone-50 border border-stone-200 rounded-lg">
                    <Clock className="w-5 h-5 text-stone-500 mx-auto mb-1" />
                    <div className="text-xl font-semibold text-stone-700">{campaign.total - campaign.sent}</div>
                    <div className="text-xs text-stone-500">Pending</div>
                  </div>
                </div>

                {/* Paused Campaign Banner */}
                {campaign.status === 'paused' && campaign.canResume && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium text-stone-900">Campaign Paused</div>
                        <div className="text-sm text-amber-600">{campaign.sent}/{campaign.total} emails sent</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => campaign.resumeCampaign()} 
                      >
                        <PlayCircle className="w-4 h-4 mr-1.5" />
                        Resume
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline" 
                        onClick={() => campaign.resetCampaign()}
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                )}

                {/* Running on Another Device Banner */}
                {campaign.isRunningElsewhere && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-sky-600 animate-pulse" />
                      </div>
                      <div>
                        <div className="font-medium text-stone-900">Campaign Running on Another Device</div>
                        <div className="text-sm text-sky-600">Progress syncing in real-time</div>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => campaign.stopCampaign()}
                    >
                      Pause Campaign
                    </Button>
                  </div>
                )}

                {/* Completion Message */}
                {campaign.status === 'completed' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-medium text-stone-900">Campaign Completed</div>
                      <div className="text-sm text-emerald-600">Successfully sent {campaign.sent} emails</div>
                    </div>
                  </div>
                )}

                {campaign.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">{campaign.error}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-stone-400" />
                </div>
                <h3 className="text-lg font-medium text-stone-900 mb-2">No Active Campaign</h3>
                <p className="text-stone-500 mb-6 max-w-sm mx-auto">
                  Start sending emails to your contacts with personalized templates
                </p>
                <Button onClick={() => navigate('/send')}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start New Campaign
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Info Panel */}
        <div className="space-y-6">
          {/* Recent Templates */}
          <Card title="Recent Templates">
            {recentTemplates.length > 0 ? (
              <div className="space-y-3">
                {recentTemplates.map((template, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                    onClick={() => navigate('/templates')}
                  >
                    <div className="w-8 h-8 bg-stone-200 rounded-lg flex items-center justify-center text-stone-700 font-semibold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-900 truncate text-sm">{template.subject}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                  </div>
                ))}
                <button 
                  onClick={() => navigate('/templates')}
                  className="w-full text-center text-sm text-stone-600 hover:text-stone-900 font-medium py-2"
                >
                  View all templates →
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-500 mb-3">No templates yet</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/templates')}>
                  Create Template
                </Button>
              </div>
            )}
          </Card>

          {/* System Status */}
          <Card title="System Status">
            <div className="space-y-4">
              <StatusItem 
                label="SMTP Configuration" 
                status={stats.configured ? 'active' : 'warning'}
                value={stats.configured ? 'Connected' : 'Not configured'}
              />
              <StatusItem 
                label="Templates" 
                status={stats.templates > 0 ? 'active' : 'inactive'}
                value={`${stats.templates} available`}
              />
              <StatusItem 
                label="Contact List" 
                status={stats.contacts > 0 ? 'active' : 'inactive'}
                value={`${stats.contacts} contacts`}
              />
              <StatusItem 
                label="Campaign Engine" 
                status={campaign.isRunning ? 'live' : 'active'}
                value={campaign.isRunning ? 'Running' : 'Ready'}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, sublabel, onClick }) {
  return (
    <div 
      className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="p-2 rounded-lg bg-stone-100 group-hover:bg-stone-200 transition-colors">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />
        </div>
      </div>
      
      <div className="text-xl sm:text-2xl font-semibold text-stone-900">{value}</div>
      <div className="text-xs sm:text-sm text-stone-600 mt-0.5">{label}</div>
      <div className="text-xs text-stone-400 mt-1 hidden sm:block">{sublabel}</div>
    </div>
  );
}

// Status Item Component
function StatusItem({ label, status, value }) {
  const statusColors = {
    active: 'bg-emerald-500',
    live: 'bg-emerald-500 animate-pulse',
    warning: 'bg-amber-500',
    inactive: 'bg-stone-300',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`}></div>
        <span className="text-sm text-stone-600">{label}</span>
      </div>
      <span className="text-sm font-medium text-stone-900">{value}</span>
    </div>
  );
}
