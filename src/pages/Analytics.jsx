import { useState, useEffect } from 'react';
import { Eye, MousePointer, XCircle, UserX, RefreshCw, Mail, TrendingUp } from 'lucide-react';
import { Card, Badge, Button, PageLoader } from '../components/UI';
import { trackingService, bouncedEmailsService, unsubscribedService, campaignService } from '../services/supabase';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [bouncedEmails, setBouncedEmails] = useState([]);
  const [unsubscribedEmails, setUnsubscribedEmails] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignData(selectedCampaign);
    }
  }, [selectedCampaign]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [campaignsData, bounced, unsubscribed] = await Promise.all([
        campaignService.getAll(),
        bouncedEmailsService.getAll(),
        unsubscribedService.getAll(),
      ]);
      setCampaigns(campaignsData);
      setBouncedEmails(bounced);
      setUnsubscribedEmails(unsubscribed);
      if (campaignsData.length > 0) {
        setSelectedCampaign(campaignsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignData = async (campaignId) => {
    try {
      const [stats, events] = await Promise.all([
        trackingService.getCampaignStats(campaignId),
        trackingService.getCampaignEvents(campaignId),
      ]);
      setCampaignStats(stats);
      setTrackingEvents(events);
    } catch (err) {
      console.error('Error loading campaign data:', err);
    }
  };

  const currentCampaign = campaigns.find(c => c.id === selectedCampaign);

  if (loading) {
    return <PageLoader />;
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'bounced', label: 'Bounced', count: bouncedEmails.length },
    { id: 'unsubscribed', label: 'Unsubscribed', count: unsubscribedEmails.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">Track email opens, clicks, and engagement</p>
          </div>
          <Button variant="outline" onClick={loadInitialData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 pt-5 border-t border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {campaigns.length > 0 ? (
            <>
              {/* Campaign Selector */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Campaign
                </label>
                <select
                  value={selectedCampaign || ''}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} — {new Date(campaign.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Mail}
                  label="Total Sent"
                  value={currentCampaign?.total_emails || 0}
                  color="blue"
                />
                <StatCard
                  icon={Eye}
                  label="Opens"
                  value={campaignStats?.opens || 0}
                  sublabel={currentCampaign?.total_emails > 0 
                    ? `${((campaignStats?.opens || 0) / currentCampaign.total_emails * 100).toFixed(1)}% rate`
                    : null}
                  color="green"
                />
                <StatCard
                  icon={MousePointer}
                  label="Clicks"
                  value={campaignStats?.clicks || 0}
                  sublabel={campaignStats?.opens > 0 
                    ? `${((campaignStats?.clicks || 0) / campaignStats.opens * 100).toFixed(1)}% CTR`
                    : null}
                  color="violet"
                />
                <StatCard
                  icon={XCircle}
                  label="Bounced"
                  value={campaignStats?.bounces || 0}
                  sublabel={currentCampaign?.total_emails > 0 
                    ? `${((campaignStats?.bounces || 0) / currentCampaign.total_emails * 100).toFixed(1)}% rate`
                    : null}
                  color="red"
                />
              </div>

              {/* Recent Activity */}
              <Card title="Recent Activity">
                {trackingEvents.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {trackingEvents.slice(0, 20).map(event => (
                      <div key={event.id} className="py-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          event.tracking_type === 'open' ? 'bg-green-100' :
                          event.tracking_type === 'click' ? 'bg-violet-100' :
                          event.tracking_type === 'bounce' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          {event.tracking_type === 'open' && <Eye className="w-4 h-4 text-green-600" />}
                          {event.tracking_type === 'click' && <MousePointer className="w-4 h-4 text-violet-600" />}
                          {event.tracking_type === 'bounce' && <XCircle className="w-4 h-4 text-red-600" />}
                          {event.tracking_type === 'unsubscribe' && <UserX className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{event.email}</div>
                          <div className="text-xs text-gray-500">
                            {event.tracking_type.charAt(0).toUpperCase() + event.tracking_type.slice(1)}
                            {event.link_url && (() => {
                              try {
                                return <span className="text-gray-400"> • {new URL(event.link_url).hostname}</span>;
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={TrendingUp}
                    title="No activity yet"
                    description="Send a campaign to start tracking engagement"
                  />
                )}
              </Card>
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <EmptyState
                icon={Mail}
                title="No campaigns yet"
                description="Send your first campaign to see analytics"
              />
            </div>
          )}
        </div>
      )}

      {/* Bounced Tab */}
      {activeTab === 'bounced' && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Bounced Emails</h3>
            <p className="text-sm text-gray-500 mt-1">
              These emails failed to deliver and will be automatically skipped in future campaigns
            </p>
          </div>
          {bouncedEmails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bouncedEmails.map(email => (
                    <tr key={email.id} className="hover:bg-gray-50">
                      <td className="py-3 px-5 text-sm text-gray-900">{email.email}</td>
                      <td className="py-3 px-5">
                        <Badge variant={email.bounce_type === 'hard' ? 'error' : 'warning'}>
                          {email.bounce_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-500 max-w-xs truncate">{email.reason || '—'}</td>
                      <td className="py-3 px-5 text-sm text-gray-500">
                        {new Date(email.bounced_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8">
              <EmptyState
                icon={XCircle}
                title="No bounced emails"
                description="Great! All your emails have been delivered successfully"
              />
            </div>
          )}
        </div>
      )}

      {/* Unsubscribed Tab */}
      {activeTab === 'unsubscribed' && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Unsubscribed Contacts</h3>
            <p className="text-sm text-gray-500 mt-1">
              These contacts opted out and will be automatically skipped in future campaigns
            </p>
          </div>
          {unsubscribedEmails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unsubscribedEmails.map(email => (
                    <tr key={email.id} className="hover:bg-gray-50">
                      <td className="py-3 px-5 text-sm text-gray-900">{email.email}</td>
                      <td className="py-3 px-5 text-sm text-gray-500">{email.reason || '—'}</td>
                      <td className="py-3 px-5 text-sm text-gray-500">
                        {new Date(email.unsubscribed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8">
              <EmptyState
                icon={UserX}
                title="No unsubscribed contacts"
                description="No one has opted out yet"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {sublabel && <div className="text-xs text-gray-400 mt-1">{sublabel}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}
