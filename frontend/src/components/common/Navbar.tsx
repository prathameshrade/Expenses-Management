import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          💰 ExpenseTrack
        </Link>

        <div className="navbar-menu">
          <div className="navbar-links">
            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>
            {user?.role === 'employee' && (
              <>
                <Link to="/expenses/new" className="nav-link">
                  New Expense
                </Link>
                <Link to="/expenses" className="nav-link">
                  My Expenses
                </Link>
              </>
            )}
            {user?.role === 'manager' && (
              <Link to="/approvals" className="nav-link">
                Approvals
              </Link>
            )}
            {user?.role === 'admin' && (
              <>
                <Link to="/admin" className="nav-link">
                  Admin
                </Link>
                <Link to="/admin/rules" className="nav-link">
                  Rules
                </Link>
              </>
            )}
          </div>

          <div className="navbar-user">
            <span className="user-email">{user?.name}</span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;