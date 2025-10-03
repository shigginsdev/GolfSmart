import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './layout.css';
import bannerImg from './assets/img/edwin-compton-Z8XlmAj65iM-unsplash.png';

const Layout = ({ user, signOut, children, disableNav }) => {
  const location = useLocation();
  const currentPath = location.pathname.slice(1);

  return (
    <div className="layout">

      <header className="header">        
        <div className="banner">
          <h1>SWINGSTAT</h1>                      
        </div>
      </header>

      <div className="breadcrumb">
        <Link to="/">Home</Link>
        {currentPath && (
          <> / <span>{currentPath.charAt(0).toUpperCase() + currentPath.slice(1)}</span></>
        )}
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <Link to="/release_notes">Release Notes</Link>
      </div>
      <div className="main">
        <nav className="sidebar">
          <ul>
            <li>
              {disableNav ? (
                <span className="disabled" title="Complete your profile to unlock Scores">
                  Scores
                </span>
              ) : (
              <Link to="/">Scores</Link>
              )}
            </li>
            <li>
              {disableNav ? (
                <span className="disabled" title="Complete your profile to unlock Insights">
                  Insights
                </span>
              ) : (
                <Link to="/insights">Insights</Link>
              )}
            </li>
            <li>
              {disableNav ? (
                <span className="disabled" title="Complete your profile to unlock Coaching">
                  Coaching
                </span>
              ) : (
                <Link to="/coaching">Coaching</Link>
              )}
            </li>
            <li>
              <Link to="/settings">Settings</Link>
            </li>
            <li>
              <button onClick={signOut}>Logout</button>
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
