import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Common/Navbar';

const AdminDashboard: React.FC = () => {
  return (
    <div>
      <Navbar />
      <div className="page-container">
        <h1>Admin Dashboard</h1>

        <div className="admin-grid">
          <div className="admin-card">
            <h3>User Management</h3>
            <p>Manage company users and roles</p>
            <Link to="/admin/users" className="btn btn-primary">
              Manage Users
            </Link>
          </div>

          <div className="admin-card">
            <h3>Approval Rules</h3>
            <p>Configure approval workflows</p>
            <Link to="/admin/rules" className="btn btn-primary">
              Edit Rules
            </Link>
          </div>

          <div className="admin-card">
            <h3>Company Settings</h3>
            <p>Manage company information</p>
            <Link to="/admin/settings" className="btn btn-primary">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;