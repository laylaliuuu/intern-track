'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';

export interface RealtimeNotification {
  id: string;
  type: 'new_internship' | 'updated_internship' | 'deadline_reminder' | 'discovery_update' | 'similar_company' | 'skill_match' | 'quality_alert';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

interface RealtimeContextType {
  isConnected: boolean;
  notifications: RealtimeNotification[];
  newInternshipsCount: number;
  markAsRead: (notificationId?: string) => void;
  clearAllNotifications: () => void;
  subscribeToInternships: (filters?: any) => void;
  unsubscribeFromInternships: () => void;
  subscribeToDeadlines: () => void;
  unsubscribeFromDeadlines: () => void;
  subscribeToSimilarCompanies: (companyId: string) => void;
  subscribeToSkillMatches: (skills: string[]) => void;
  showBrowserNotification: (notification: RealtimeNotification) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [newInternshipsCount, setNewInternshipsCount] = useState(0);
  const [subscriptions, setSubscriptions] = useState<Map<string, any>>(new Map());

  const queryClient = useQueryClient();

  // Connection status monitoring
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('internships')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
        logger.error('Real-time connection failed');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Add notification helper
  const addNotification = useCallback((notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isRead: false
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50 notifications
    
    if (notification.type === 'new_internship') {
      setNewInternshipsCount(prev => prev + 1);
    }

    logger.info('Real-time notification added');
  }, []);

  // Subscribe to new internships
  const subscribeToInternships = useCallback((filters?: any) => {
    const subscriptionKey = 'internships';
    
    if (subscriptions.has(subscriptionKey)) {
      return; // Already subscribed
    }

    const subscription = supabase
      .channel('internships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'internships'
        },
        (payload) => {
          console.log('Internship change detected:', payload);
          
          // Invalidate all internship queries to refresh the data
          queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
          
          // Add notification for new internships
          if (payload.eventType === 'INSERT') {
            const newInternship = payload.new;
            addNotification({
              type: 'new_internship',
              title: 'New Internship Available',
              message: `${newInternship.company} - ${newInternship.title}`,
              data: newInternship,
              priority: 'medium'
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedInternship = payload.new;
            addNotification({
              type: 'updated_internship',
              title: 'Internship Updated',
              message: `${updatedInternship.company} - ${updatedInternship.title}`,
              data: updatedInternship,
              priority: 'low'
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Subscribed to internships real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Failed to subscribe to internships');
        }
      });

    setSubscriptions(prev => new Map(prev.set(subscriptionKey, subscription)));
  }, [queryClient, addNotification, subscriptions]);

  // Unsubscribe from internships
  const unsubscribeFromInternships = useCallback(() => {
    const subscriptionKey = 'internships';
    const subscription = subscriptions.get(subscriptionKey);
    
    if (subscription) {
      supabase.removeChannel(subscription);
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(subscriptionKey);
        return newMap;
      });
      
      logger.info('Unsubscribed from internships real-time updates');
    }
  }, [subscriptions]);

  // Subscribe to deadline reminders
  const subscribeToDeadlines = useCallback(() => {
    const subscriptionKey = 'deadlines';
    
    if (subscriptions.has(subscriptionKey)) {
      return; // Already subscribed
    }

    // Check for deadlines approaching (within 7 days)
    const checkDeadlines = async () => {
      try {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        
        const { data: upcomingDeadlines, error } = await supabase
          .from('internships')
          .select('id, title, company, application_deadline')
          .not('application_deadline', 'is', null)
          .lte('application_deadline', sevenDaysFromNow.toISOString())
          .gte('application_deadline', new Date().toISOString());

        if (error) throw error;

        upcomingDeadlines?.forEach(internship => {
          const deadline = new Date(internship.application_deadline);
          const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDeadline <= 3) { // Only notify for deadlines within 3 days
            addNotification({
              type: 'deadline_reminder',
              title: 'Application Deadline Approaching',
              message: `${internship.company} - ${internship.title} (${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} left)`,
              data: internship,
              priority: 'high'
            });
          }
        });
      } catch (error) {
        logger.error('Failed to check deadlines');
      }
    };

    // Check deadlines immediately and then every hour
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60 * 60 * 1000); // Every hour

    const subscription = {
      interval,
      unsubscribe: () => clearInterval(interval)
    };

    setSubscriptions(prev => new Map(prev.set(subscriptionKey, subscription)));
  }, [addNotification, subscriptions]);

  // Unsubscribe from deadlines
  const unsubscribeFromDeadlines = useCallback(() => {
    const subscriptionKey = 'deadlines';
    const subscription = subscriptions.get(subscriptionKey);
    
    if (subscription) {
      subscription.unsubscribe();
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(subscriptionKey);
        return newMap;
      });
      
      logger.info('Unsubscribed from deadline reminders');
    }
  }, [subscriptions]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId?: string) => {
    if (notificationId) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } else {
      // Mark all as read
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setNewInternshipsCount(0);
    }
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setNewInternshipsCount(0);
  }, []);

  // Subscribe to similar companies
  const subscribeToSimilarCompanies = useCallback((companyId: string) => {
    const subscriptionKey = `similar-companies-${companyId}`;
    
    if (subscriptions.has(subscriptionKey)) {
      return; // Already subscribed
    }

    const subscription = supabase
      .channel(`similar-companies-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internships',
          filter: `company_id=in.(${companyId})`
        },
        (payload) => {
          const newNotification: RealtimeNotification = {
            id: `similar-${Date.now()}`,
            type: 'similar_company',
            title: 'New Opportunity at Similar Company',
            message: `A new internship was posted at a company similar to your saved companies`,
            data: payload.new,
            timestamp: new Date(),
            isRead: false,
            priority: 'medium',
            actionUrl: `/internships/${payload.new.id}`
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          showBrowserNotification(newNotification);
        }
      )
      .subscribe();

    setSubscriptions(prev => new Map(prev).set(subscriptionKey, subscription));
  }, [subscriptions]);

  // Subscribe to skill matches
  const subscribeToSkillMatches = useCallback((skills: string[]) => {
    const subscriptionKey = `skill-matches-${skills.join('-')}`;
    
    if (subscriptions.has(subscriptionKey)) {
      return; // Already subscribed
    }

    // This would need to be implemented with a more sophisticated query
    // For now, we'll subscribe to all new internships and filter by skills
    const subscription = supabase
      .channel(`skill-matches-${skills.join('-')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internships'
        },
        (payload) => {
          // Check if the new internship matches user's skills
          const internship = payload.new;
          const internshipSkills = internship.skills || [];
          
          const hasMatchingSkills = skills.some(skill => 
            internshipSkills.some((internshipSkill: string) => 
              internshipSkill.toLowerCase().includes(skill.toLowerCase())
            )
          );

          if (hasMatchingSkills) {
            const newNotification: RealtimeNotification = {
              id: `skill-match-${Date.now()}`,
              type: 'skill_match',
              title: 'Skill Match Found!',
              message: `A new internship matches your skills: ${skills.join(', ')}`,
              data: payload.new,
              timestamp: new Date(),
              isRead: false,
              priority: 'high',
              actionUrl: `/internships/${payload.new.id}`
            };
            
            setNotifications(prev => [newNotification, ...prev]);
            showBrowserNotification(newNotification);
          }
        }
      )
      .subscribe();

    setSubscriptions(prev => new Map(prev).set(subscriptionKey, subscription));
  }, [subscriptions]);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: RealtimeNotification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'high'
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };

      // Auto-close after 5 seconds for low priority
      if (notification.priority === 'low') {
        setTimeout(() => browserNotification.close(), 5000);
      }
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptions.forEach(subscription => {
        if (subscription.unsubscribe) {
          subscription.unsubscribe();
        } else {
          supabase.removeChannel(subscription);
        }
      });
    };
  }, [subscriptions]);

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      notifications,
      newInternshipsCount,
      markAsRead,
      clearAllNotifications,
      subscribeToInternships,
      unsubscribeFromInternships,
      subscribeToDeadlines,
      unsubscribeFromDeadlines,
      subscribeToSimilarCompanies,
      subscribeToSkillMatches,
      showBrowserNotification,
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}