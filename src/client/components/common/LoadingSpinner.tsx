import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'medium',
  className = ''
}) => {
  return (
    <div className={`loading-spinner ${size} ${className}`}>
      <div className="spinner" />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};