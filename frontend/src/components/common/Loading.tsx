/**
 * Loading Component
 */

import React from "react";
import "../styles/Loading.css";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ message = "Loading...", fullScreen = false }) => {
  return (
    <div className={`loading-container ${fullScreen ? "fullscreen" : ""}`}>
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
};