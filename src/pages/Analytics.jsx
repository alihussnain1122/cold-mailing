import { useState, useEffect } from 'react';
import { Eye, MousePointer, XCircle, RefreshCw, Mail, TrendingUp, X } from 'lucide-react';
import { Card, Badge, Button, PageLoader } from '../components/UI';
import { trackingService, campaignService } from '../services/supabase';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);
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
      const campaignsData = await campaignService.getAll();
      setCampaigns(campaignsData);
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Analytics</h1>
            <p className="text-stone-500 mt-1">Track email opens, clicks, and engagement</p>
          </div>
          <Button variant="outline" onClick={loadInitialData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 pt-5 border-t border-stone-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-stone-200'
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
              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-stone-700">
                    View Analytics For
                  </label>
                  {selectedCampaign && campaigns.length > 1 && (
                    <button
                      onClick={() => setSelectedCampaign(campaigns[0]?.id || null)}
                      className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Reset to latest
                    </button>
                  )}
                </div>
                <p className="text-xs text-stone-500 mb-3">
                  Choose a campaign to see its performance metrics
                </p>
                <div className="flex gap-2">
                  <select
                    value={selectedCampaign || ''}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                  >
                    {campaigns.map((campaign, index) => {
                      const date = new Date(campaign.created_at);
                      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const status = campaign.sent_count === campaign.total_contacts ? '✓ Completed' : 'In Progress';
                      return (
                        <option key={campaign.id} value={campaign.id}>
                          {formattedDate} • {campaign.sent_count} of {campaign.total_contacts} emails sent • {status}
                        </option>
                      );
                    })}
                  </select>
                  {campaigns.length > 1 && (
                    <button
                      onClick={() => {
                        setCampaignStats(null);
                        setTrackingEvents([]);
                        setSelectedCampaign(campaigns[0]?.id || null);
                      }}
                      className="px-3 py-2.5 border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                      title="Clear filter and show latest campaign"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-2">
                  {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Mail}
                  label="Total Sent"
                  value={currentCampaign?.sent_count || 0}
                  sublabel={currentCampaign?.total_contacts > 0 
                    ? `of ${currentCampaign.total_contacts} contacts`
                    : null}
                  color="stone"
                />
                <StatCard
                  icon={Eye}
                  label="Opens"
                  value={campaignStats?.opens || 0}
                  sublabel={currentCampaign?.sent_count > 0 
                    ? `${((campaignStats?.opens || 0) / currentCampaign.sent_count * 100).toFixed(1)}% rate`
                    : null}
                  color="emerald"
                />
                <StatCard
                  icon={MousePointer}
                  label="Clicks"
                  value={campaignStats?.clicks || 0}
                  sublabel={campaignStats?.opens > 0 
                    ? `${((campaignStats?.clicks || 0) / campaignStats.opens * 100).toFixed(1)}% CTR`
                    : null}
                  color="amber"
                />

              </div>

              {/* Recent Activity */}
              <Card title="Recent Activity">
                {trackingEvents.length > 0 ? (
                  <div className="divide-y divide-stone-100">
                    {trackingEvents.slice(0, 20).map(event => (
                      <div key={event.id} className="py-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          event.tracking_type === 'open' ? 'bg-emerald-100' :
                          event.tracking_type === 'click' ? 'bg-amber-100' :
                          'bg-stone-100'
                        }`}>
                          {event.tracking_type === 'open' && <Eye className="w-4 h-4 text-emerald-600" />}
                          {event.tracking_type === 'click' && <MousePointer className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-stone-900 truncate">{event.email}</div>
                          <div className="text-xs text-stone-500">
                            {event.tracking_type.charAt(0).toUpperCase() + event.tracking_type.slice(1)}
                            {event.link_url && (() => {
                              try {
                                return <span className="text-stone-400"> • {new URL(event.link_url).hostname}</span>;
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                        <div className="text-xs text-stone-400">
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
            <div className="bg-white border border-stone-200 rounded-xl p-8">
              <EmptyState
                icon={Mail}
                title="No campaigns yet"
                description="Send your first campaign to see analytics"
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
    stone: 'bg-stone-50 text-stone-600 border-stone-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-semibold text-stone-900">{value}</div>
      <div className="text-sm text-stone-500">{label}</div>
      {sublabel && <div className="text-xs text-stone-400 mt-1">{sublabel}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-stone-400" />
      </div>
      <h3 className="text-sm font-medium text-stone-900">{title}</h3>
      <p className="text-sm text-stone-500 mt-1">{description}</p>
    </div>
  );
}
