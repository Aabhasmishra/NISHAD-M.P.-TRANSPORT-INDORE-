import React, { useEffect, useState } from 'react';
import './PopupAlert.css';

const PopupAlert = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose, 
  position = 'top-right',
  isLightMode = true 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`popup-alert-container ${position} ${isLightMode ? 'popup-light-mode' : 'popup-dark-mode'}`}>
      <div className={`popup-alert ${type} ${isVisible ? 'show' : 'hide'}`}>
        <div className="popup-alert-content">
          <span className="popup-alert-icon">{getIcon()}</span>
          <span className="popup-alert-message">{message}</span>
        </div>
        <button 
          className="popup-alert-close" 
          onClick={handleClose}
          aria-label="Close alert"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default PopupAlert;