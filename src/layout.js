import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './layout.css';
import scoresIcon from './assets/img/scores-icon.png';
import leaguesIcon from './assets/img/leagues-icon.png';
import settingsIcon from './assets/img/settings-icon.png';

const Layout = ({ user, signOut, children }) => {
  const location = useLocation();
  const currentPath = location.pathname.slice(1);

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

      <div className="breadcrumb">
        <Link to="/">Home</Link>
        {currentPath && <> / <span>{currentPath.charAt(0).toUpperCase() + currentPath.slice(1)}</span></>}
      </div>

      <div className="main">
        <nav className="sidebar">
          <ul>
            <li>
              <img src={scoresIcon} alt="Scores" />
              <Link to="/">Scores</Link>
            </li>
            <li>
              <img src={leaguesIcon} alt="Leagues" />
              <Link to="/leagues">Leagues</Link>
            </li>
            <li>
              <img src={settingsIcon} alt="Settings" />
              <Link to="/settings">Settings</Link>
            </li>
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
