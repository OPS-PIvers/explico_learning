import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  className = ''
}) => {
  return (
    <div className={`error-message ${className}`}>
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <h3>Error</h3>
        <p>{message}</p>
        {onRetry && (
          <button className="btn btn-secondary" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};