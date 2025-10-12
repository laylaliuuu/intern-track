'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface RealtimeContextType {
  isConnected: boolean;
  newInternshipsCount: number;
  markAsRead: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [newInternshipsCount, setNewInternshipsCount] = useState(0);

  useEffect(() => {
    // Simulate connection
    const timer = setTimeout(() => setIsConnected(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const markAsRead = () => {
    setNewInternshipsCount(0);
  };

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      newInternshipsCount,
      markAsRead
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