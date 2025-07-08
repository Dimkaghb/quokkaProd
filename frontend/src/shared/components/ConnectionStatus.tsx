import React, { useState, useEffect } from 'react';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health', { method: 'HEAD' });
        setIsConnected(response.ok);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const status = isOnline && isConnected ? 'connected' : 'disconnected';
  const statusColor = status === 'connected' ? 'bg-green-500' : 'bg-red-500';
  const statusText = status === 'connected' ? 'Connected' : 'Disconnected';

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
      <span className="text-xs text-gray-500">{statusText}</span>
    </div>
  );
}; 