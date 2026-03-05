/**
 * Notification System Backend
 * 
 * This module provides comprehensive notification system backend functionality
 * including notification types, templates, delivery system, and user preference
 * management for the VaidyaChain system.
 * 
 * @author Team Member 1 - Backend & Database Specialist
 * @version 1.0.0
 */

const admin = require('firebase-admin');
const { logSecurityEvent } = require('./security');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Notification Service
 * Manages notification types, templates, delivery, and user preferences
 */
class NotificationService {
  constructor() {
    this.notificationsCollection = 'notifications';
    this.notificationTemplatesCollection = 'notification_templates';
    this.userPreferencesCollection = 'user_notification_preferences';
    this.notificationTypes = this.initializeNotificationTypes();
  }

  /**
   * Initialize notification types and templates
   */
  initializeNotificationTypes() {
    return {
      // Smart Contract Events
      'contract_execution': {
        name: 'Smart Contract Execution',
        description: 'Smart contract function executed successfully',
        channels: ['in_app', 'email'],
        priority: 'medium',
        template: 'contract_execution_template'
      },
      'contract_error': {
        name: 'Smart Contract Error',
        description: 'Smart contract execution failed',
        channels: ['in_app', 'email'],
        priority: 'high',
        template: 'contract_error_template'
      },

      // Transaction Events
      'transaction_completed': {
        name: 'Transaction Completed',
        description: 'Transaction has been completed successfully',
        channels: ['in_app', 'email'],
        priority: 'medium',
        template: 'transaction_completed_template'
      },
      'transaction_failed': {
        name: 'Transaction Failed',
        description: 'Transaction failed validation or execution',
        channels: ['in_app', 'email'],
        priority: 'high',
        template: 'transaction_failed_template'
      },

      // Batch Events
      'batch_created': {
        name: 'Batch Created',
        description: 'New batch has been created',
        channels: ['in_app'],
        priority: 'low',
        template: 'batch_created_template'
      },
      'batch_status_changed': {
        name: 'Batch Status Changed',
        description: 'Batch status has been updated',
        channels: ['in_app', 'email'],
        priority: 'medium',
        template: 'batch_status_changed_template'
      },
      'batch_transferred': {
        name: 'Batch Transferred',
        description: 'Batch ownership has been transferred',
        channels: ['in_app', 'email'],
        priority: 'medium',
        template: 'batch_transferred_template'
      },
      'batch_quality_updated': {
        name: 'Batch Quality Updated',
        description: 'Batch quality status has been updated',
        channels: ['in_app', 'email'],
        priority: 'medium',
        template: 'batch_quality_updated_template'
      },

      // Payment Events
      'payment_initiated': {
        name: 'Payment Initiated',
        description: 'Payment has been initiated',
        channels: ['in_app', 'email'],
        priority: 'medium',
        template: 'payment_initiated_template'
      },
      'payment_completed': {
        name: 'Payment Completed',
        description: 'Payment has been completed successfully',
        channels: ['in_app', 'email'],
        priority: 'medium',
        template: 'payment_completed_template'
      },
      'payment_failed': {
        name: 'Payment Failed',
        description: 'Payment failed to process',
        channels: ['in_app', 'email'],
        priority: 'high',
        template: 'payment_failed_template'
      },

      // Insurance Events
      'claim_submitted': {
        name: 'Insurance Claim Submitted',
        description: 'Insurance claim has been submitted',
        channels: ['in_app', 'email'],
        priority: 'medium',
        template: 'claim_submitted_template'
      },
      'claim_processed': {
        name: 'Insurance Claim Processed',
        description: 'Insurance claim has been processed',
        channels: ['in_app', 'email'],
        priority: 'medium',
        template: 'claim_processed_template'
      },

      // System Events
      'security_alert': {
        name: 'Security Alert',
        description: 'Potential security issue detected',
        channels: ['in_app', 'email'],
        priority: 'high',
        template: 'security_alert_template'
      },
      'system_maintenance': {
        name: 'System Maintenance',
        description: 'Scheduled system maintenance',
        channels: ['in_app', 'email'],
        priority: 'low',
        template: 'system_maintenance_template'
      }
    };
  }

  /**
   * Send notification to user
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Send result
   */
  async sendNotification(notificationData) {
    try {
      // Validate notification data
      const validatedData = this.validateNotificationData(notificationData);
      
      // Get user preferences
      const userPreferences = await this.getUserPreferences(validatedData.userId);
      
      // Check if user wants this notification type
      if (!this.shouldSendNotification(validatedData.type, userPreferences)) {
        return {
          success: true,
          sent: false,
          reason: 'User preferences disabled',
          message: 'Notification not sent due to user preferences'
        };
      }

      // Create notification record
      const notification = {
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: validatedData.userId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        data: validatedData.data || {},
        channels: validatedData.channels || ['in_app'],
        priority: validatedData.priority || 'medium',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: validatedData.expiresAt || this.getDefaultExpiry(validatedData.priority)
      };

      // Store notification
      await db.collection(this.notificationsCollection).doc(notification.notificationId).set(notification);

      // Send to configured channels
      const sendResults = await this.sendToChannels(notification, userPreferences);

      // Log notification event
      logSecurityEvent('notification_sent', {
        notificationId: notification.notificationId,
        type: notification.type,
        userId: notification.userId,
        channels: notification.channels,
        sentChannels: sendResults.sentChannels
      });

      return {
        success: true,
        notificationId: notification.notificationId,
        sentChannels: sendResults.sentChannels,
        failedChannels: sendResults.failedChannels,
        message: 'Notification sent successfully'
      };

    } catch (error) {
      logSecurityEvent('notification_send_failed', {
        error: error.message,
        userId: notificationData.userId,
        type: notificationData.type
      });

      throw error;
    }
  }

  /**
   * Send notification to specific channels
   * @param {Object} notification - Notification object
   * @param {Object} userPreferences - User preferences
   * @returns {Promise<Object>} Send results
   */
  async sendToChannels(notification, userPreferences) {
    const sentChannels = [];
    const failedChannels = [];

    for (const channel of notification.channels) {
      try {
        if (!userPreferences.channels[channel]) {
          continue; // Skip disabled channel
        }

        switch (channel) {
          case 'in_app':
            await this.sendInAppNotification(notification);
            sentChannels.push(channel);
            break;

          case 'email':
            await this.sendEmailNotification(notification, userPreferences.email);
            sentChannels.push(channel);
            break;

          case 'sms':
            await this.sendSMSNotification(notification, userPreferences.phone);
            sentChannels.push(channel);
            break;

          default:
            failedChannels.push(channel);
        }

      } catch (error) {
        failedChannels.push(channel);
        logSecurityEvent('notification_channel_failed', {
          channel,
          notificationId: notification.notificationId,
          error: error.message
        });
      }
    }

    return { sentChannels, failedChannels };
  }

  /**
   * Send in-app notification
   * @param {Object} notification - Notification object
   */
  async sendInAppNotification(notification) {
    // In-app notifications are stored in Firestore and retrieved by frontend
    // This method can be extended to send push notifications via Firebase Cloud Messaging
    logSecurityEvent('in_app_notification_sent', {
      notificationId: notification.notificationId,
      userId: notification.userId
    });
  }

  /**
   * Send email notification
   * @param {Object} notification - Notification object
   * @param {string} email - User email address
   */
  async sendEmailNotification(notification, email) {
    // This would integrate with an email service (SendGrid, AWS SES, etc.)
    // For now, we'll log the email notification
    logSecurityEvent('email_notification_sent', {
      notificationId: notification.notificationId,
      userId: notification.userId,
      email: email
    });

    // TODO: Implement actual email sending logic
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // const msg = {
    //   to: email,
    //   from: 'noreply@vaidyachain.com',
    //   subject: notification.title,
    //   text: notification.message,
    //   html: this.renderEmailTemplate(notification)
    // };
    // await sgMail.send(msg);
  }

  /**
   * Send SMS notification
   * @param {Object} notification - Notification object
   * @param {string} phone - User phone number
   */
  async sendSMSNotification(notification, phone) {
    // This would integrate with an SMS service (Twilio, AWS SNS, etc.)
    // For now, we'll log the SMS notification
    logSecurityEvent('sms_notification_sent', {
      notificationId: notification.notificationId,
      userId: notification.userId,
      phone: phone
    });

    // TODO: Implement actual SMS sending logic
    // Example with Twilio:
    // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: notification.message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // });
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      let query = db.collection(this.notificationsCollection)
        .where('userId', '==', userId);

      // Apply filters
      if (options.read !== undefined) {
        query = query.where('read', '==', options.read);
      }

      if (options.type) {
        query = query.where('type', '==', options.type);
      }

      if (options.priority) {
        query = query.where('priority', '==', options.priority);
      }

      // Apply sorting
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);

      // Apply limit
      const limit = options.limit || 50;
      query = query.limit(limit);

      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

    } catch (error) {
      logSecurityEvent('get_notifications_failed', {
        error: error.message,
        userId
      });

      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Update result
   */
  async markAsRead(notificationId) {
    try {
      await db.collection(this.notificationsCollection).doc(notificationId).update({
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });

      logSecurityEvent('notification_marked_read', {
        notificationId
      });

      return {
        success: true,
        notificationId,
        message: 'Notification marked as read'
      };

    } catch (error) {
      logSecurityEvent('mark_read_failed', {
        error: error.message,
        notificationId
      });

      throw error;
    }
  }

  /**
   * Mark all user notifications as read
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId) {
    try {
      const batch = db.batch();
      const notificationsRef = db.collection(this.notificationsCollection)
        .where('userId', '==', userId)
        .where('read', '==', false);

      const snapshot = await notificationsRef.get();
      
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();

      logSecurityEvent('all_notifications_marked_read', {
        userId,
        count: snapshot.size
      });

      return {
        success: true,
        userId,
        count: snapshot.size,
        message: 'All notifications marked as read'
      };

    } catch (error) {
      logSecurityEvent('mark_all_read_failed', {
        error: error.message,
        userId
      });

      throw error;
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteNotification(notificationId) {
    try {
      await db.collection(this.notificationsCollection).doc(notificationId).delete();

      logSecurityEvent('notification_deleted', {
        notificationId
      });

      return {
        success: true,
        notificationId,
        message: 'Notification deleted successfully'
      };

    } catch (error) {
      logSecurityEvent('notification_delete_failed', {
        error: error.message,
        notificationId
      });

      throw error;
    }
  }

  /**
   * Get user notification preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences(userId) {
    try {
      const doc = await db.collection(this.userPreferencesCollection).doc(userId).get();
      
      if (!doc.exists) {
        // Return default preferences
        return this.getDefaultPreferences();
      }

      return doc.data();

    } catch (error) {
      logSecurityEvent('get_preferences_failed', {
        error: error.message,
        userId
      });

      throw error;
    }
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - New preferences
   * @returns {Promise<Object>} Update result
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const validatedPreferences = this.validatePreferences(preferences);
      
      await db.collection(this.userPreferencesCollection).doc(userId).set(validatedPreferences, { merge: true });

      logSecurityEvent('preferences_updated', {
        userId,
        channels: Object.keys(validatedPreferences.channels || {}),
        types: validatedPreferences.enabledTypes || []
      });

      return {
        success: true,
        userId,
        preferences: validatedPreferences,
        message: 'Notification preferences updated successfully'
      };

    } catch (error) {
      logSecurityEvent('preferences_update_failed', {
        error: error.message,
        userId
      });

      throw error;
    }
  }

  /**
   * Get default notification preferences
   * @returns {Object} Default preferences
   */
  getDefaultPreferences() {
    return {
      userId: null,
      channels: {
        in_app: true,
        email: true,
        sms: false
      },
      enabledTypes: [
        'transaction_completed',
        'batch_status_changed',
        'payment_completed',
        'security_alert'
      ],
      email: '',
      phone: '',
      language: 'en',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  /**
   * Validate notification data
   * @param {Object} notificationData - Notification data
   * @returns {Object} Validated data
   */
  validateNotificationData(notificationData) {
    const errors = [];

    if (!notificationData.userId || typeof notificationData.userId !== 'string') {
      errors.push('Invalid user ID');
    }

    if (!notificationData.type || !this.notificationTypes[notificationData.type]) {
      errors.push('Invalid notification type');
    }

    if (!notificationData.title || typeof notificationData.title !== 'string') {
      errors.push('Invalid title');
    }

    if (!notificationData.message || typeof notificationData.message !== 'string') {
      errors.push('Invalid message');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return notificationData;
  }

  /**
   * Validate user preferences
   * @param {Object} preferences - User preferences
   * @returns {Object} Validated preferences
   */
  validatePreferences(preferences) {
    const errors = [];

    if (preferences.channels) {
      const validChannels = ['in_app', 'email', 'sms'];
      for (const channel in preferences.channels) {
        if (!validChannels.includes(channel)) {
          errors.push(`Invalid channel: ${channel}`);
        }
      }
    }

    if (preferences.enabledTypes) {
      const validTypes = Object.keys(this.notificationTypes);
      for (const type of preferences.enabledTypes) {
        if (!validTypes.includes(type)) {
          errors.push(`Invalid notification type: ${type}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Preferences validation failed: ${errors.join(', ')}`);
    }

    return preferences;
  }

  /**
   * Check if notification should be sent based on user preferences
   * @param {string} notificationType - Type of notification
   * @param {Object} userPreferences - User preferences
   * @returns {boolean} Whether to send notification
   */
  shouldSendNotification(notificationType, userPreferences) {
    // Check if type is enabled
    if (userPreferences.enabledTypes && !userPreferences.enabledTypes.includes(notificationType)) {
      return false;
    }

    // Check if any channels are enabled
    const enabledChannels = Object.values(userPreferences.channels || {}).some(enabled => enabled);
    return enabledChannels;
  }

  /**
   * Get default expiry time based on priority
   * @param {string} priority - Notification priority
   * @returns {Date} Expiry date
   */
  getDefaultExpiry(priority) {
    const now = new Date();
    const days = priority === 'high' ? 7 : priority === 'medium' ? 14 : 30;
    return new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  }

  /**
   * Get notification statistics
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Statistics
   */
  async getNotificationStatistics(userId = null) {
    try {
      let query = db.collection(this.notificationsCollection);

      if (userId) {
        query = query.where('userId', '==', userId);
      }

      const snapshot = await query.get();
      
      const stats = {
        totalNotifications: snapshot.size,
        byType: {},
        byPriority: {},
        byChannel: {},
        readCount: 0,
        unreadCount: 0
      };

      snapshot.docs.forEach(doc => {
        const notification = doc.data();
        
        // Count by type
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        
        // Count by priority
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
        
        // Count by channel
        if (notification.channels) {
          notification.channels.forEach(channel => {
            stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
          });
        }

        // Count read/unread
        if (notification.read) {
          stats.readCount++;
        } else {
          stats.unreadCount++;
        }
      });

      return stats;

    } catch (error) {
      logSecurityEvent('notification_statistics_failed', {
        error: error.message,
        userId
      });

      throw error;
    }
  }

  /**
   * Clean up expired notifications
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpiredNotifications() {
    try {
      const now = new Date();
      const query = db.collection(this.notificationsCollection)
        .where('expiresAt', '<', now);

      const snapshot = await query.get();
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logSecurityEvent('expired_notifications_cleaned', {
        count: snapshot.size,
        cleanedAt: now.toISOString()
      });

      return {
        success: true,
        cleanedCount: snapshot.size,
        message: 'Expired notifications cleaned up successfully'
      };

    } catch (error) {
      logSecurityEvent('cleanup_expired_failed', {
        error: error.message
      });

      throw error;
    }
  }
}

// Export notification service instance
const notificationService = new NotificationService();

module.exports = {
  NotificationService,
  notificationService
};