import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'Loading...', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full animate-spin`}></div>
        {/* Inner ring */}
        <div className={`absolute inset-0 ${sizeClasses[size]} border-4 border-transparent border-t-blue-600 rounded-full animate-spin`}></div>
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {text && (
        <div className={`text-gray-600 font-medium ${textSizeClasses[size]} animate-pulse`}>
          {text}
        </div>
      )}
    </div>
  );
};

export const LoadingDots: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  );
};

export const LoadingPulse: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-2 ${className}`}>
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
};

export const LoadingBars: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 items-end ${className}`}>
      <div className="w-2 h-4 bg-blue-600 animate-pulse"></div>
      <div className="w-2 h-6 bg-blue-600 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-3 bg-blue-600 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-5 bg-blue-600 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
    </div>
  );
}; 