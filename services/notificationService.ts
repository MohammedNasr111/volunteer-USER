import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../app/firebase/config';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: string;
  seen: boolean;
  timestamp: any;
  organizerEmail?: string;
  causeId?: string;
  causeName?: string;
}

class NotificationService {
  private async createNotification(data: NotificationData) {
    try {
      const timestamp = Timestamp.now();
      await addDoc(collection(db, 'notifications'), {
        ...data,
        timestamp,
        seen: false
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // 1. New Cause Created
  async notifyNewCause(userId: string, causeName: string, causeId: string) {
    await this.createNotification({
      userId,
      title: 'New Cause Available',
      message: `A new cause "${causeName}" matching your preferences is now available.`,
      type: 'new_cause',
      causeId,
      causeName,
      seen: false,
      timestamp: null
    });
  }

  // 2. Successful Cause Registration
  async notifySuccessfulRegistration(userId: string, causeName: string, causeId: string) {
    await this.createNotification({
      userId,
      title: 'Registration Successful',
      message: `You have successfully registered for "${causeName}".`,
      type: 'registration',
      causeId,
      causeName,
      seen: false,
      timestamp: null
    });
  }

  // 3. Profile Updates
  async notifyProfileUpdate(userId: string, field: string) {
    await this.createNotification({
      userId,
      title: 'Profile Updated',
      message: `Your ${field} has been successfully updated.`,
      type: 'profile_update',
      seen: false,
      timestamp: null
    });
  }

  // 4. Cancelled Cause Registration
  async notifyCancelledRegistration(userId: string, causeName: string, date: string) {
    await this.createNotification({
      userId,
      title: 'Registration Cancelled',
      message: `You have cancelled your registration for "${causeName}" scheduled on ${date}.`,
      type: 'cancellation',
      causeName,
      seen: false,
      timestamp: null
    });
  }

  // 5. Removed from Cause
  async notifyRemovedFromCause(
    userId: string, 
    causeName: string, 
    organizationName: string, 
    reason: string,
    organizerEmail: string
  ) {
    await this.createNotification({
      userId,
      title: 'Removed from Cause',
      message: `You have been removed from "${causeName}" by ${organizationName} due to ${reason}. Please contact the organizer for more information.`,
      type: 'removal',
      causeName,
      organizerEmail,
      seen: false,
      timestamp: null
    });
  }

  // 6. Sign In
  async notifySignIn(userId: string) {
    await this.createNotification({
      userId,
      title: 'Sign In Successful',
      message: 'You have successfully signed in to your account.',
      type: 'auth',
      seen: false,
      timestamp: null
    });
  }

  // 6. Sign Out
  async notifySignOut(userId: string) {
    await this.createNotification({
      userId,
      title: 'Sign Out Successful',
      message: 'You have successfully signed out of your account.',
      type: 'auth',
      seen: false,
      timestamp: null
    });
  }

  // 7. Cause Preference Changes
  async notifyPreferenceUpdate(userId: string, preferences: string[]) {
    await this.createNotification({
      userId,
      title: 'Preferences Updated',
      message: `Your cause preferences have been updated to: ${preferences.join(', ')}.`,
      type: 'preferences',
      seen: false,
      timestamp: null
    });
  }

  // 8. New Account Creation
  async notifyAccountCreation(userId: string) {
    await this.createNotification({
      userId,
      title: 'Welcome to Volunteer Connect',
      message: 'Your account has been successfully created. Start exploring volunteer opportunities!',
      type: 'account_creation',
      seen: false,
      timestamp: null
    });
  }
}

export const notificationService = new NotificationService(); 