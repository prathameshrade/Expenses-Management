import React from 'react';
import Navbar from '../components/Common/Navbar';

const ApprovalRules: React.FC = () => {
  return (
    <div>
      <Navbar />
      <div className="page-container">
        <h1>Approval Rules Configuration</h1>
        <p>Configure approval workflows for different expense categories and amounts</p>
        {/* Add rule management UI here */}
      </div>
    </div>
  );
};

export default ApprovalRules;