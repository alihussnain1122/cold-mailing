import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { sendAPI } from '../services/api';
import { campaignService, unsubscribedService } from '../services/supabase';
import { useAuth } from './AuthContext';
import TimerWorker from '../workers/timerWorker.js?worker';
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
const log = (...args) => isDev && console.log(...args);

// Helper: Create a delay that works in background tabs using Web Worker
const createBackgroundDelay = (ms, onTick, stopRef) => {
  return new Promise((resolve) => {
    const worker = new TimerWorker();
    
    worker.onmessage = (e) => {
      const { type, remaining } = e.data;
      
      if (type === 'tick') {
        const seconds = Math.ceil(remaining / 1000);
        onTick?.(seconds);
        
        // Check if we should stop
        if (stopRef?.current) {
          worker.postMessage({ type: 'stop' });
        }
      }
      
      if (type === 'complete' || type === 'stopped') {
        worker.terminate();
        resolve();
      }
    };
    
    worker.postMessage({ type: 'start', duration: ms });
  });
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
    isRunning: false,
    currentEmail: '',
    progress: 0,
    total: 0,
    sent: 0,
    failed: 0,
    status: 'idle', // idle, running, paused, completed, error
    error: null,
    nextEmailIn: 0,
    currentTemplate: null,
    isExecuting: false, // true if THIS browser is executing the campaign
  });

  const stopRef = useRef(false);
  const executingRef = useRef(false);
  const subscriptionRef = useRef(null);

  // Load active campaign on mount or when user changes
  useEffect(() => {
    if (!user) {
      setCampaignState(prev => ({
        ...prev,
        campaignId: null,
        status: 'idle',
        isRunning: false,
        isExecuting: false,
      }));
      return;
    }

    loadActiveCampaign();
  }, [user]);

  // Subscribe to real-time updates when we have a campaign
  // Even the executing device needs to listen for pause commands from other devices
  useEffect(() => {
    const { campaignId } = campaignState;
    
    if (!campaignId) {
      return;
    }

    log('Subscribing to campaign updates:', campaignId);
    
    subscriptionRef.current = campaignService.subscribeToChanges(campaignId, (payload) => {
      log('Campaign update received:', payload);
      const campaign = payload.new;
      
      if (campaign) {
        // If we're executing and someone else paused it, stop!
        if (executingRef.current && campaign.status === 'paused') {
          log('Received pause command from another device');
          stopRef.current = true;
        }
        
        // Only update state if we're NOT executing (avoid overwriting our own updates)
        if (!executingRef.current) {
          setCampaignState(prev => ({
            ...prev,
            status: campaign.status,
            sent: campaign.sent_count,
            failed: campaign.failed_count,
            progress: campaign.current_index,
            currentEmail: campaign.current_email || '',
            currentTemplate: campaign.current_template || '',
            isRunning: campaign.status === 'running',
            error: campaign.error_message,
          }));
        }
      }
    });

    return () => {
      if (subscriptionRef.current) {
        campaignService.unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [campaignState.campaignId]);

  async function loadActiveCampaign() {
    try {
      const campaign = await campaignService.getActive();
      
      if (campaign) {
        log('Found active campaign:', campaign);
        setCampaignState({
          campaignId: campaign.id,
          isRunning: campaign.status === 'running',
          currentEmail: campaign.current_email || '',
          progress: campaign.current_index,
          total: campaign.total_contacts,
          sent: campaign.sent_count,
          failed: campaign.failed_count,
          status: campaign.status,
          error: campaign.error_message,
          nextEmailIn: 0,
          currentTemplate: campaign.current_template,
          isExecuting: false, // Not executing until user clicks resume
        });
      }
    } catch (err) {
      log('Error loading active campaign:', err);
    }
  }

  // Internal function to execute the campaign
  const executeCampaign = useCallback(async (campaignId, senderName, delayMin, delayMax) => {
    if (executingRef.current) {
      log('Already executing a campaign');
      return;
    }

    executingRef.current = true;
    stopRef.current = false;

    setCampaignState(prev => ({ ...prev, isExecuting: true }));

    // Helper function to check if campaign was paused remotely
    const checkIfPaused = async () => {
      try {
        const campaign = await campaignService.getById(campaignId);
        if (campaign && campaign.status === 'paused') {
          log('Campaign was paused remotely');
          stopRef.current = true;
          return true;
        }
      } catch (err) {
        log('Error checking campaign status:', err);
      }
      return false;
    };

    try {
      // Get pending emails
      let pendingEmails = await campaignService.getPendingEmails(campaignId);
      
      // Get current counts
      let currentSent = 0;
      let currentFailed = 0;
      setCampaignState(prev => {
        currentSent = prev.sent;
        currentFailed = prev.failed;
        return prev;
      });
      
      log(`Executing campaign with ${pendingEmails.length} pending emails`);

      for (let i = 0; i < pendingEmails.length; i++) {
        // Check stop flag first - immediate response to pause button
        if (stopRef.current) {
          log('Campaign stopped by user');
          // Don't update status here - stopCampaign already did it
          setCampaignState(prev => ({
            ...prev,
            isRunning: false,
            status: 'paused',
            isExecuting: false,
            nextEmailIn: 0,
          }));
          executingRef.current = false;
          return;
        }

        // Check database for remote pause (every email)
        if (await checkIfPaused()) {
          log('Campaign paused remotely - stopping');
          setCampaignState(prev => ({
            ...prev,
            isRunning: false,
            status: 'paused',
            isExecuting: false,
            nextEmailIn: 0,
          }));
          executingRef.current = false;
          return;
        }

        const email = pendingEmails[i];

        // Update campaign progress in Supabase
        await campaignService.updateProgress(campaignId, {
          current_index: email.sort_order + 1,
          current_email: email.contact_email,
          current_template: email.template_subject,
        });

        setCampaignState(prev => ({
          ...prev,
          currentEmail: email.contact_email,
          progress: email.sort_order + 1,
          currentTemplate: email.template_subject,
        }));

        log(`Sending email ${email.sort_order + 1} to ${email.contact_email}`);

        try {
          // Check if email is unsubscribed
          const isUnsubscribed = await unsubscribedService.isEmailUnsubscribed(email.contact_email);

          if (isUnsubscribed) {
            log(`⊘ Skipping ${email.contact_email} - unsubscribed`);
            await campaignService.markEmailFailed(email.id, 'Unsubscribed');
            currentFailed++;
            await campaignService.updateProgress(campaignId, { failed_count: currentFailed });
            setCampaignState(prev => ({ ...prev, failed: currentFailed }));
            continue;
          }

          const emailData = {
            to: email.contact_email,
            subject: email.template_subject,
            html: email.template_body,
            senderName: senderName || 'Support Team',
          };

          // Pass tracking options
          const result = await sendAPI.sendSingle(emailData, {
            campaignId,
            userId: user?.id,
            enableTracking: true,
          });
          
          log(`✓ Email sent to ${email.contact_email}`, result.trackingId ? `(tracking: ${result.trackingId})` : '');
          
          // Mark as sent in Supabase with tracking ID
          await campaignService.markEmailSent(email.id, result.trackingId);
          
          // Update campaign sent count
          currentSent++;
          await campaignService.updateProgress(campaignId, {
            sent_count: currentSent,
          });

          setCampaignState(prev => ({
            ...prev,
            sent: currentSent,
          }));

          // Delay between emails - uses Web Worker to work in background tabs
          if (i < pendingEmails.length - 1 && (delayMin > 0 || delayMax > 0)) {
            const randomDelayMs = Math.floor(Math.random() * (delayMax - delayMin) + delayMin);
            
            log(`Waiting ${Math.ceil(randomDelayMs / 1000)} seconds before next email...`);
            
            // Check for pause before starting delay
            if (stopRef.current || await checkIfPaused()) {
              log('Pause detected, stopping before delay');
              break;
            }
            
            // Use Web Worker for background-safe timing
            await createBackgroundDelay(
              randomDelayMs,
              (secondsRemaining) => {
                setCampaignState(prev => ({ ...prev, nextEmailIn: secondsRemaining }));
              },
              stopRef
            );
            
            setCampaignState(prev => ({ ...prev, nextEmailIn: 0 }));
            
            // Check for pause after delay
            if (stopRef.current || await checkIfPaused()) {
              log('Pause detected after delay');
              break;
            }
          }

        } catch (error) {
          log(`✗ Failed to send to ${email.contact_email}:`, error);
          
          // Check if this is a bounce error
          if (error.isBounce || error.name === 'BounceError') {
            log(`⚠ Bounce detected for ${email.contact_email}`);
            // Record bounce in database
            try {
              await bouncedEmailsService.add(
                email.contact_email,
                'hard',
                error.message,
                campaignId
              );
            } catch (bounceErr) {
              log('Failed to record bounce:', bounceErr);
            }
          }
          
          // Mark as failed in Supabase
          await campaignService.markEmailFailed(email.id, error.message);
          
          // Update campaign failed count
          currentFailed++;
          await campaignService.updateProgress(campaignId, {
            failed_count: currentFailed,
          });

          setCampaignState(prev => ({
            ...prev,
            failed: currentFailed,
            error: error.message,
          }));
        }
      }

      // Campaign completed
      log('Campaign completed');
      await campaignService.updateStatus(campaignId, 'completed');
      
      // Send browser notification for completion
      notifyCampaignCompleted(currentSent, currentFailed);
      
      setCampaignState(prev => ({
        ...prev,
        isRunning: false,
        status: 'completed',
        currentEmail: '',
        isExecuting: false,
      }));

    } catch (err) {
      log('Campaign execution error:', err);
      
      // Send browser notification for error
      notifyCampaignError(err.message);
      
      await campaignService.updateStatus(campaignId, 'error', {
        error_message: err.message,
      });
      
      setCampaignState(prev => ({
        ...prev,
        isRunning: false,
        status: 'error',
        error: err.message,
        isExecuting: false,
      }));
    } finally {
      executingRef.current = false;
    }
  }, []);

  const startCampaign = useCallback(async (contacts, config) => {
    log('Starting campaign with:', { contacts: contacts.length, config });
    
    if (!contacts || contacts.length === 0) {
      setCampaignState(prev => ({
        ...prev,
        status: 'error',
        error: 'No contacts to send to',
      }));
      return;
    }

    // Check if contacts have templates
    const hasTemplates = contacts.every(c => c.template);
    if (!hasTemplates) {
      setCampaignState(prev => ({
        ...prev,
        status: 'error',
        error: 'Contacts missing template information',
      }));
      return;
    }

    // Request notification permission at campaign start
    requestNotificationPermission();

    try {
      // Apply personalization to each contact's template
      const personalizedContacts = contacts.map(contact => ({
        ...contact,
        template: {
          ...contact.template,
          subject: replaceVariables(contact.template.subject, contact),
          body: replaceVariables(contact.template.body, contact),
        },
      }));

      // Create campaign in Supabase with personalized templates
      const campaign = await campaignService.create(personalizedContacts, config);
      
      log('Campaign created:', campaign.id);

      // Send browser notification
      notifyCampaignStarted(personalizedContacts.length);

      setCampaignState({
        campaignId: campaign.id,
        isRunning: true,
        currentEmail: '',
        progress: 0,
        total: personalizedContacts.length,
        sent: 0,
        failed: 0,
        status: 'running',
        error: null,
        nextEmailIn: 0,
        currentTemplate: null,
        isExecuting: true,
      });

      // Start executing
      await executeCampaign(
        campaign.id,
        config.senderName,
        config.delayMin,
        config.delayMax
      );

    } catch (err) {
      log('Failed to start campaign:', err);
      setCampaignState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  }, [executeCampaign]);

  const resumeCampaign = useCallback(async () => {
    const { campaignId } = campaignState;
    
    if (!campaignId) {
      log('No campaign to resume');
      return;
    }

    try {
      // Get campaign details
      const campaign = await campaignService.getById(campaignId);
      
      if (!campaign) {
        log('Campaign not found');
        return;
      }

      log('Resuming campaign:', campaignId);

      // Update status to running
      await campaignService.updateStatus(campaignId, 'running');

      setCampaignState(prev => ({
        ...prev,
        isRunning: true,
        status: 'running',
        isExecuting: true,
      }));

      // Resume execution
      await executeCampaign(
        campaignId,
        campaign.sender_name,
        campaign.delay_min,
        campaign.delay_max
      );

    } catch (err) {
      log('Failed to resume campaign:', err);
      setCampaignState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  }, [campaignState.campaignId, executeCampaign]);

  const stopCampaign = useCallback(async () => {
    log('Stopping campaign...');
    stopRef.current = true;
    
    // Send pause notification
    const currentState = campaignState;
    notifyCampaignPaused(currentState.sent, currentState.total);
    
    // Always update Supabase to paused status
    if (campaignState.campaignId) {
      try {
        await campaignService.updateStatus(campaignState.campaignId, 'paused');
        
        // Update local state immediately
        setCampaignState(prev => ({
          ...prev,
          isRunning: false,
          status: 'paused',
          isExecuting: false,
        }));
        
        // Reset executing ref since we're paused
        executingRef.current = false;
        
        log('Campaign paused successfully');
      } catch (err) {
        log('Failed to pause campaign:', err);
      }
    }
  }, [campaignState.campaignId, campaignState.sent, campaignState.total]);

  const resetCampaign = useCallback(async () => {
    log('Resetting campaign...');
    stopRef.current = true;
    
    const { campaignId } = campaignState;
    
    if (campaignId) {
      try {
        await campaignService.delete(campaignId);
      } catch (err) {
        log('Failed to delete campaign:', err);
      }
    }

    setCampaignState({
      campaignId: null,
      isRunning: false,
      currentEmail: '',
      progress: 0,
      total: 0,
      sent: 0,
      failed: 0,
      status: 'idle',
      error: null,
      nextEmailIn: 0,
      currentTemplate: null,
      isExecuting: false,
    });
  }, [campaignState.campaignId]);

  // Check if there's a paused campaign that can be resumed
  const canResume = campaignState.status === 'paused' && 
                    campaignState.campaignId !== null && 
                    !campaignState.isExecuting;

  // Check if campaign is running on another device
  const isRunningElsewhere = campaignState.isRunning && !campaignState.isExecuting;

  const value = {
    ...campaignState,
    startCampaign,
    stopCampaign,
    resetCampaign,
    resumeCampaign,
    canResume,
    isRunningElsewhere,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
