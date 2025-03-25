import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './layout.css';
import scoresIcon from './assets/img/scores-icon.png';
import leaguesIcon from './assets/img/leagues-icon.png';
import settingsIcon from './assets/img/settings-icon.png';
import insightsIcon from './assets/img/insights-icon.png';
import bannerImg from './assets/img/edwin-compton-Z8XlmAj65iM-unsplash.png';



const Layout = ({ user, signOut, children }) => {
  const location = useLocation();
  const currentPath = location.pathname.slice(1);

  return (    
    <div className="layout">

      {/* <header className="header">        
        <div className="banner" style={{ backgroundImage: `url(${bannerImg})` }}>
          <div className="banner-overlay">
            <h1>SWINGSTAT</h1>            
          </div>
        </div>
      </header> */}

      <div className="breadcrumb">
        <Link to="/">Home</Link>
        {currentPath && <> / <span>{currentPath.charAt(0).toUpperCase() + currentPath.slice(1)}</span></>}
      </div>

      <div className="main">
        <nav className="sidebar">
          <ul>
            <li>
              <Link to="/">Scores</Link>
            </li>
            <li>
              <Link to="/insights">Insights</Link>
            </li>
            <li>
              <Link to="/leagues">Leagues</Link>
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
