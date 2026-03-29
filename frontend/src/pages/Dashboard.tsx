import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Common/Navbar';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-container">
        <h1>Welcome, {user?.name}!</h1>
        <p>You are logged in as: <strong>{user?.role.toUpperCase()}</strong></p>

        {user?.role === 'employee' && (
          <div className="dashboard-content">
            <h2>Employee Dashboard</h2>
            <p>Submit and track your expenses</p>
          </div>
        )}

        {user?.role === 'manager' && (
          <div className="dashboard-content">
            <h2>Manager Dashboard</h2>
            <p>Review and approve expenses</p>
          </div>
        )}

        {user?.role === 'admin' && (
          <div className="dashboard-content">
            <h2>Admin Dashboard</h2>
            <p>Manage users and approval rules</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;