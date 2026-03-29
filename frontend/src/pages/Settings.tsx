import React from 'react';
import Navbar from '../components/Common/Navbar';

const Settings: React.FC = () => {
  return (
    <div>
      <Navbar />
      <div className="page-container">
        <h1>Settings</h1>
        <p>User account settings</p>
        {/* Add settings UI here */}
      </div>
    </div>
  );
};

export default Settings;