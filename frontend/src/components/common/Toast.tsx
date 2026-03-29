/**
 * Toast Notification Component
 */

import React, { useEffect } from "react";
import { Notification } from "../../types";
import "../styles/Toast.css";

interface ToastProps extends Notification {
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 5000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button onClick={() => onClose(id)}>×</button>
    </div>
  );
};