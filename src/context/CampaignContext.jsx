/**
 * Campaign Context - Server-Side Campaign Execution
 * 
 * This context manages email campaigns that run on the SERVER.
 * The browser only sends start/pause/resume commands and receives progress updates.
 * SMTP credentials are never exposed to the browser.
 */

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { campaignAPI } from '../services/api';
import { campaignService } from '../services/supabase';
import { useAuth } from './AuthContext';
import { 
  replaceVariables,
  notifyCampaignStarted,
  notifyCampaignCompleted,
  notifyCampaignError,
  notifyCampaignPaused,
  requestNotificationPermission,
} from '../utils';

const CampaignContext = createContext();

// Only log in development
const isDev = import.meta.env.DEV;
const log = (...args) => isDev && console.log('[Campaign]', ...args);

// Connection status notification helper
const notifyConnectionPause = () => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Campaign Paused', {
      body: 'Internet connection lost. Campaign will resume when connection is restored.',
      icon: '/favicon.ico',
    });
  }
};

const notifyConnectionResume = () => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Campaign Resumed', {
      body: 'Internet connection restored. Campaign is resuming...',
      icon: '/favicon.ico',
    });
  }
};


export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within CampaignProvider');
  }
  return context;
};

export const CampaignProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [campaignState, setCampaignState] = useState({
    campaignId: null,
    campaignName: null,
    isRunning: false,
    currentEmail: '',
    progress: 0,
    total: 0,
    sent: 0,
    failed: 0,
    status: 'idle', // idle, running, paused, completed, error
    error: null,
    nextEmailAt: null, // ISO timestamp of when next email will be sent
    startedAt: null,   // Campaign start time for ETA calculation
    currentTemplate: null,
  });

  const subscriptionRef = useRef(null);
  const pollingRef = useRef(null);
  const autoPausedRef = useRef(false); // Track if campaign was auto-paused due to connection loss
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Load active campaign on mount or when user changes
  useEffect(() => {
    if (!user) {
      setCampaignState(prev => ({
        ...prev,
        campaignId: null,
        status: 'idle',
        isRunning: false,
      }));
      return;
    }

    loadActiveCampaign();
  }, [user]);

  // Subscribe to real-time updates when we have a campaign
  useEffect(() => {
    const { campaignId, status } = campaignState;
    
    if (!campaignId) {
      return;
    }

    log('Subscribing to campaign updates:', campaignId);
    
    // Real-time subscription for instant updates
    subscriptionRef.current = campaignService.subscribeToChanges(campaignId, (payload) => {
      log('Campaign update received:', payload);
      const campaign = payload.new;
      
      if (campaign) {
        const newStatus = campaign.status;
        const wasRunning = campaignState.isRunning;
        
        setCampaignState(prev => ({
          ...prev,
          status: newStatus,
          sent: campaign.sent_count || 0,
          failed: campaign.failed_count || 0,
          progress: (campaign.sent_count || 0) + (campaign.failed_count || 0),
          currentEmail: campaign.current_email || '',
          currentTemplate: campaign.current_template || '',
          isRunning: newStatus === 'running',
          error: campaign.error_message,
          nextEmailAt: campaign.next_email_at || null,
          startedAt: campaign.started_at || prev.startedAt,
        }));

        // Send notifications on status changes
        if (newStatus === 'completed' && wasRunning) {
          notifyCampaignCompleted(campaign.sent_count, campaign.failed_count);
        } else if (newStatus === 'error' && wasRunning) {
          notifyCampaignError(campaign.error_message);
        }
      }
    });

    // Also poll for status (backup for when realtime misses updates)
    if (status === 'running') {
      pollingRef.current = setInterval(async () => {
        try {
          const response = await campaignAPI.getStatus(campaignId);
          if (response.success && response.campaign) {
            const camp = response.campaign;
            setCampaignState(prev => ({
              ...prev,
              sent: camp.sent,
              failed: camp.failed,
              progress: camp.sent + camp.failed,
              status: camp.status,
              isRunning: camp.status === 'running',
            }));
          }
        } catch (err) {
          log('Polling error:', err);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (subscriptionRef.current) {
        campaignService.unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [campaignState.campaignId, campaignState.status, campaignState.isRunning]);

  async function loadActiveCampaign() {
    try {
      const campaign = await campaignService.getActive();
      
      if (campaign) {
        log('Found active campaign:', campaign);
        setCampaignState({
          campaignId: campaign.id,
          campaignName: campaign.name || null,
          isRunning: campaign.status === 'running',
          currentEmail: campaign.current_email || '',
          progress: (campaign.sent_count || 0) + (campaign.failed_count || 0),
          total: campaign.total_emails || campaign.total_contacts || 0,
          sent: campaign.sent_count || 0,
          failed: campaign.failed_count || 0,
          status: campaign.status,
          error: campaign.error_message,
          nextEmailAt: campaign.next_email_at || null,
          startedAt: campaign.started_at || null,
          currentTemplate: campaign.current_template,
        });
      }
    } catch (err) {
      log('Error loading active campaign:', err);
    }
  }

  /**
   * Start a new campaign - sends request to server
   * The server handles all email sending - browser never sees SMTP credentials
   */
  const startCampaign = useCallback(async (contacts, config) => {
    log('Starting campaign with:', { contacts: contacts?.length, config });
    
    if (!contacts || contacts.length === 0) {
      setCampaignState(prev => ({
        ...prev,
        status: 'error',
        error: 'No contacts to send to',
      }));
      throw new Error('No contacts to send to');
    }

    // Check if contacts have templates
    const hasTemplates = contacts.every(c => c.template);
    if (!hasTemplates) {
      setCampaignState(prev => ({
        ...prev,
        status: 'error',
        error: 'Contacts missing template information',
      }));
      throw new Error('Contacts missing template information');
    }

    // Request notification permission at campaign start
    requestNotificationPermission();

    try {
      // Apply personalization to each contact's template
      const preparedContacts = contacts.map(contact => ({
        email: contact.email,
        firstName: contact.firstName || contact.name?.split(' ')[0] || '',
        lastName: contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '',
        company: contact.company || '',
        position: contact.position || '',
        template: {
          subject: replaceVariables(contact.template.subject, contact),
          body: replaceVariables(contact.template.body, contact),
        },
      }));

      // Start campaign via server API - server handles email sending
      const response = await campaignAPI.start({
        contacts: preparedContacts,
        template: preparedContacts[0]?.template || {},
        delayMin: config.delayMin || 10000,
        delayMax: config.delayMax || 30000,
        campaignName: config.campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        enableTracking: config.enableTracking !== false,
        senderName: config.senderName,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to start campaign');
      }

      log('Campaign started:', response.campaignId);

      // Send browser notification
      notifyCampaignStarted(preparedContacts.length);

      setCampaignState({
        campaignId: response.campaignId,
        campaignName: config.campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        isRunning: true,
        currentEmail: '',
        progress: 0,
        total: response.total || preparedContacts.length,
        sent: 0,
        failed: 0,
        status: 'running',
        error: null,
        nextEmailAt: null,
        startedAt: new Date().toISOString(),
        currentTemplate: preparedContacts[0]?.template?.subject || '',
      });

      return response;

    } catch (err) {
      log('Failed to start campaign:', err);
      setCampaignState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
      throw err;
    }
  }, []);

  /**
   * Resume a paused campaign
   */
  const resumeCampaign = useCallback(async () => {
    const { campaignId, status } = campaignState;
    
    if (!campaignId) {
      log('No campaign to resume');
      return;
    }

    if (status !== 'paused') {
      log('Campaign is not paused, current status:', status);
      // Don't block - let server be source of truth, it will return proper error
    }

    log('Resuming campaign:', campaignId);

    try {
      const response = await campaignAPI.resume(campaignId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to resume campaign');
      }

      setCampaignState(prev => ({
        ...prev,
        isRunning: true,
        status: 'running',
        error: null,
      }));

      log('Campaign resumed successfully');

    } catch (err) {
      log('Failed to resume campaign:', err);
      // Keep status as 'paused' so user can retry - don't change to 'error'
      setCampaignState(prev => ({
        ...prev,
        error: err.message,
      }));
    }
  }, [campaignState]);

  /**
   * Pause the running campaign
   */
  const stopCampaign = useCallback(async () => {
    const { campaignId, sent, total, status } = campaignState;
    
    if (!campaignId) {
      log('No campaign to pause');
      setCampaignState(prev => ({
        ...prev,
        error: 'No active campaign to pause',
      }));
      return;
    }

    if (status !== 'running') {
      log('Campaign is not running, current status:', status);
      // Don't block - let server be source of truth
    }

    log('Pausing campaign:', campaignId);

    try {
      const response = await campaignAPI.pause(campaignId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to pause campaign');
      }

      // Send pause notification
      notifyCampaignPaused(sent, total);

      setCampaignState(prev => ({
        ...prev,
        isRunning: false,
        status: 'paused',
        error: null,
      }));

      log('Campaign paused successfully');

    } catch (err) {
      log('Failed to pause campaign:', err);
      // Keep current status so user can retry - don't hide buttons
      setCampaignState(prev => ({
        ...prev,
        error: `Pause failed: ${err.message}`,
      }));
    }
  }, [campaignState]);

  /**
   * Reset campaign state (delete and start fresh)
   */
  const resetCampaign = useCallback(async () => {
    log('Resetting campaign state');
    
    const { campaignId } = campaignState;
    
    // If there's an active campaign, try to stop it first
    if (campaignId) {
      try {
        await campaignAPI.stop(campaignId);
      } catch (err) {
        log('Failed to stop campaign during reset:', err);
      }
      
      try {
        await campaignService.delete(campaignId);
      } catch (err) {
        log('Failed to delete campaign:', err);
      }
    }

    setCampaignState({
      campaignId: null,
      campaignName: null,
      isRunning: false,
      currentEmail: '',
      progress: 0,
      total: 0,
      sent: 0,
      failed: 0,
      status: 'idle',
      error: null,
      nextEmailAt: null,
      startedAt: null,
      currentTemplate: null,
    });
  }, [campaignState]);

  // Handle internet connectivity changes - auto-pause and auto-resume
  useEffect(() => {
    const handleOffline = async () => {
      log('Internet connection lost');
      setIsOffline(true);
      
      // Auto-pause if campaign is running
      if (campaignState.status === 'running' && campaignState.campaignId) {
        log('Auto-pausing campaign due to connection loss');
        autoPausedRef.current = true;
        
        try {
          const response = await campaignAPI.pause(campaignState.campaignId);
          if (response.success) {
            notifyConnectionPause();
            setCampaignState(prev => ({
              ...prev,
              isRunning: false,
              status: 'paused',
              error: 'Paused due to connection loss. Will resume when connection is restored.',
            }));
            log('Campaign auto-paused successfully');
          }
        } catch (err) {
          log('Failed to auto-pause campaign:', err);
          // Keep autoPausedRef true so we can try to resume when back online
        }
      }
    };

    const handleOnline = async () => {
      log('Internet connection restored');
      setIsOffline(false);
      
      // Auto-resume if campaign was auto-paused due to connection loss
      if (autoPausedRef.current && campaignState.status === 'paused' && campaignState.campaignId) {
        log('Auto-resuming campaign after connection restored');
        
        // Small delay to ensure connection is stable
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const response = await campaignAPI.resume(campaignState.campaignId);
          if (response.success) {
            autoPausedRef.current = false;
            notifyConnectionResume();
            setCampaignState(prev => ({
              ...prev,
              isRunning: true,
              status: 'running',
              error: null,
            }));
            log('Campaign auto-resumed successfully');
          }
        } catch (err) {
          log('Failed to auto-resume campaign:', err);
          autoPausedRef.current = false; // Clear flag to avoid infinite retries
          setCampaignState(prev => ({
            ...prev,
            error: `Auto-resume failed: ${err.message}. Please resume manually.`,
          }));
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [campaignState.status, campaignState.campaignId]);

  // Check if there's a paused campaign that can be resumed
  const canResume = campaignState.status === 'paused' && campaignState.campaignId !== null;

  // Clear auto-paused flag when user manually resets campaign
  const resetCampaignWithClear = useCallback(async () => {
    autoPausedRef.current = false;
    await resetCampaign();
  }, [resetCampaign]);

  const value = {
    ...campaignState,
    isOffline,
    startCampaign,
    stopCampaign,
    resetCampaign: resetCampaignWithClear,
    resumeCampaign,
    canResume,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
