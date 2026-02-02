import { useEffect, useState } from 'react';
import { Mail, Users, FileText, Send, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';
import { Card, Badge } from '../components/UI';
import { templatesAPI, contactsAPI } from '../services/api';
import { useCampaign } from '../context/CampaignContext';

export default function Dashboard() {
  const campaign = useCampaign();
  const [stats, setStats] = useState({
    templates: 0,
    contacts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [templates, contacts] = await Promise.all([
        templatesAPI.getAll(),
        contactsAPI.getAll(),
      ]);
      
      setStats({
        templates: templates.length,
        contacts: contacts.length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Email Templates', value: stats.templates, icon: FileText, color: 'blue' },
    { label: 'Total Contacts', value: stats.contacts, icon: Users, color: 'green' },
    { label: 'Emails Sent', value: campaign.sent, icon: Send, color: 'purple' },
    { label: 'Failed', value: campaign.failed, icon: XCircle, color: 'red' },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of your email campaigns</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${colorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Campaign Status */}
      <Card title="Campaign Status">
        {campaign.isRunning || campaign.status !== 'idle' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {campaign.isRunning && (
                  <div className="animate-pulse">
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
                <span className="font-medium text-gray-900">
                  {campaign.isRunning ? 'Campaign In Progress' : 
                   campaign.status === 'completed' ? 'Campaign Completed' :
                   campaign.status === 'paused' ? 'Campaign Paused' :
                   'Campaign Status'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">
                  {campaign.sent} / {campaign.total}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${campaign.total > 0 ? (campaign.sent / campaign.total) * 100 : 0}%` }}
                ></div>
              </div>
              
              {campaign.currentEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded p-2">
                  <Mail className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="font-medium">Sending to: {campaign.currentEmail}</div>
                    {campaign.currentTemplate && (
                      <div className="text-xs text-gray-500">Template: {campaign.currentTemplate}</div>
                    )}
                  </div>
                </div>
              )}
              
              {campaign.nextEmailIn > 0 && (
                <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 rounded p-3">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="font-medium">Next email in {campaign.nextEmailIn} seconds</span>
                </div>
              )}

              {campaign.failed > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded p-2">
                  <XCircle className="w-4 h-4" />
                  <span>Failed: {campaign.failed}</span>
                </div>
              )}

              {campaign.status === 'completed' && (
                <div className="bg-green-50 text-green-700 rounded p-3 text-sm">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Campaign completed successfully! Sent {campaign.sent} emails.
                </div>
              )}

              {campaign.error && (
                <div className="bg-red-50 text-red-700 rounded p-3 text-sm">
                  <XCircle className="w-4 h-4 inline mr-2" />
                  {campaign.error}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-500 py-4">
            <Activity className="w-5 h-5" />
            <span>No active campaign. Go to Send Emails to start a campaign.</span>
          </div>
        )}
      </Card>
    </div>
  );
}
