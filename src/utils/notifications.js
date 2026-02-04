/**
 * Browser Notifications Utility
 * 
 * Handles requesting permission and sending browser notifications
 * for campaign events.
 */

// Check if notifications are supported
export const isNotificationSupported = () => {
  return 'Notification' in window;
};

// Check if notifications are permitted
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    console.log('Notifications not supported');
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Request permission
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'error';
  }
};

// Send a notification
export const sendNotification = (title, options = {}) => {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  const defaultOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    ...options,
  };

  try {
    const notification = new Notification(title, defaultOptions);

    // Auto-close after 5 seconds if not requireInteraction
    if (!defaultOptions.requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options.onClick) options.onClick();
    };

    return notification;
  } catch (err) {
    console.error('Failed to send notification:', err);
    return null;
  }
};

// ==================
// Campaign-specific notifications
// ==================

export const notifyCampaignStarted = (totalContacts) => {
  return sendNotification('Campaign Started! 🚀', {
    body: `Sending ${totalContacts} emails...`,
    tag: 'campaign-start',
  });
};

export const notifyCampaignCompleted = (sent, failed) => {
  return sendNotification('Campaign Completed! ✅', {
    body: `Sent: ${sent} emails${failed > 0 ? ` | Failed: ${failed}` : ''}`,
    tag: 'campaign-complete',
    requireInteraction: true,
  });
};

export const notifyCampaignError = (error) => {
  return sendNotification('Campaign Error ❌', {
    body: error || 'An error occurred during the campaign',
    tag: 'campaign-error',
    requireInteraction: true,
  });
};

export const notifyCampaignPaused = (sent, total) => {
  return sendNotification('Campaign Paused ⏸️', {
    body: `Progress: ${sent}/${total} emails sent`,
    tag: 'campaign-paused',
  });
};

export const notifyHighOpenRate = (campaignName, openRate) => {
  return sendNotification('Great Open Rate! 📈', {
    body: `${campaignName}: ${openRate}% open rate`,
    tag: 'high-open-rate',
  });
};

// ==================
// Notification Permission UI Helper
// ==================

export const NotificationPermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  DEFAULT: 'default',
  UNSUPPORTED: 'unsupported',
};

export const getPermissionLabel = (permission) => {
  switch (permission) {
    case 'granted':
      return 'Enabled';
    case 'denied':
      return 'Blocked';
    case 'default':
      return 'Not Set';
    case 'unsupported':
      return 'Not Supported';
    default:
      return 'Unknown';
  }
};
