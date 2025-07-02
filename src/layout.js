import React from 'react';
import { NavLink } from 'react-router-dom';
import './Layout.css';

export default function Layout({ disableNav, signOut, user, children }) {
  return (
    <div className="app-container">
      <header className="app-header">
        <nav className="app-nav">
          <NavLink to="/" className="nav-item">
            Home
          </NavLink>

          {disableNav ? (
            <span className="nav-item disabled-link" title="Complete your profile to unlock Insights">
              Insights
            </span>
          ) : (
            <NavLink to="/insights" className="nav-item">
              Insights
            </NavLink>
          )}

          {disableNav ? (
            <span className="nav-item disabled-link" title="Complete your profile to unlock Coaching">
              Coaching
            </span>
          ) : (
            <NavLink to="/coaching" className="nav-item">
              Coaching
            </NavLink>
          )}

          <NavLink to="/settings" className="nav-item">
            Settings
          </NavLink>

          <NavLink to="/pricing" className="nav-item">
            Pricing
          </NavLink>

          <button onClick={signOut} className="nav-item signout-button">
            Sign Out
          </button>
        </nav>
      </header>

      <main className="app-content">
        {children}
      </main>
    </div>
  );
}
