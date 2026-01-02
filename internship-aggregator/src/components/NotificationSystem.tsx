'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRealtime, RealtimeNotification } from './RealtimeProvider';
import { Bell, X, Check, AlertCircle, Info, Clock, Sparkles } from 'lucide-react';

interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  toasts: ToastNotification[];
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error', options?: { duration?: number; action?: { label: string; onClick: () => void } }) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const { notifications, markAsRead } = useRealtime();

  const addToast = (
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    options: { duration?: number; action?: { label: string; onClick: () => void } } = {}
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { duration = 5000, action } = options;
    
    const toast: ToastNotification = {
      id,
      message,
      type,
      duration,
      action
    };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convert real-time notifications to toasts
  useEffect(() => {
    notifications.forEach(notification => {
      if (!notification.isRead) {
        let toastType: 'info' | 'success' | 'warning' | 'error' = 'info';
        let icon = Info;
        
        switch (notification.type) {
          case 'new_internship':
            toastType = 'success';
            icon = Sparkles;
            break;
          case 'updated_internship':
            toastType = 'info';
            icon = Info;
            break;
          case 'deadline_reminder':
            toastType = 'warning';
            icon = Clock;
            break;
          case 'discovery_update':
            toastType = 'success';
            icon = Sparkles;
            break;
        }

        addToast(notification.message, toastType, {
          duration: notification.type === 'deadline_reminder' ? 10000 : 5000,
          action: {
            label: 'View',
            onClick: () => {
              markAsRead(notification.id);
              // Navigate to internship or show details
              console.log('Navigate to:', notification.data);
            }
          }
        });
      }
    });
  }, [notifications, addToast, markAsRead]);

  return (
    <NotificationContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      clearAllToasts
    }}>
      {children}
      <NotificationToasts />
    </NotificationContext.Provider>
  );
}

// Toast notification component
function NotificationToasts() {
  const { toasts, removeToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <ToastNotification key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

// Individual toast component
function ToastNotification({ 
  toast, 
  onRemove 
}: { 
  toast: ToastNotification; 
  onRemove: (id: string) => void;
}) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`
      ${getBackgroundColor()}
      border rounded-lg p-4 shadow-lg
      animate-in slide-in-from-right-full duration-300
      flex items-start space-x-3
    `}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {toast.message}
        </p>
        
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Real-time notification panel component
export function RealtimeNotificationPanel() {
  const { notifications, markAsRead, clearAllNotifications } = useRealtime();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p>No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {unreadCount} new
            </span>
          )}
          <button
            onClick={clearAllNotifications}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>
      </div>
      
      <div className="divide-y">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 hover:bg-gray-50 cursor-pointer ${
              !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
            }`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {notification.type === 'new_internship' && <Sparkles className="h-4 w-4 text-green-600" />}
                {notification.type === 'updated_internship' && <Info className="h-4 w-4 text-blue-600" />}
                {notification.type === 'deadline_reminder' && <Clock className="h-4 w-4 text-yellow-600" />}
                {notification.type === 'discovery_update' && <Sparkles className="h-4 w-4 text-purple-600" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {notification.timestamp.toLocaleString()}
                </p>
              </div>
              
              {!notification.isRead && (
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}