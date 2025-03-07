import React from 'react';
import './layout.css';
import { Link } from 'react-router-dom';

const Layout = ({ user, signOut, children }) => {
  return (
    <div className="layout">

      <header className="header">
        <div className="logo">Logo</div>
        <div className="banner">
          <span>Banner Header</span>
          <div className="header-buttons">
            <button>Pricing</button>
            <button onClick={signOut}>Logout</button>
          </div>
        </div>
      </header>

      <div className="main">
        <nav className="sidebar">
          <ul>
            <li><Link to="/">Scores</Link></li>
            <li><Link to="/insights">Insights</Link></li>
            <li><Link to="/leagues">Leagues</Link></li>
            <li><Link to="/settings">Settings</Link></li>
          </ul>
        </nav>

        <section className="content">
          {children}
        </section>
      </div>

    </div>
  );
};

export default Layout;
