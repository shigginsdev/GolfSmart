import React from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import './layout.css';
import bannerImg from './assets/img/edwin-compton-Z8XlmAj65iM-unsplash.png';



// const Layout = ({ user, signOut, children }) => {
  const location = useLocation();
  const currentPath = location.pathname.slice(1);

  export default function Layout({ disableNav, signOut, user, children }) {

    return (    
      <div className="layout">

        {<header className="header">        
          <div className="banner">
            <h1>SWINGSTAT</h1>                      
          </div>
        </header>}

        <div className="breadcrumb">
          <Link to="/">Home</Link>
          {currentPath && <> / <span>{currentPath.charAt(0).toUpperCase() + currentPath.slice(1)}</span></>}
        </div>

        <div className="main">
          <nav className="sidebar">
            <ul>
              <li>
                <Link to="/">Scores</Link>
                {disableNav ? (
              <span className="nav-item disabled-link" title="Complete your profile to upload scores from a round">
                Scores
              </span>
            ) : (
              <NavLink to="/coaching" className="nav-item">
                Scores
              </NavLink>
            )}
              </li>
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

// export default Layout;

// import React from 'react';
// import { NavLink } from 'react-router-dom';
// import './layout.css';

// export default function Layout({ disableNav, signOut, user, children }) {
//   return (
//     <div className="app-container">
//       <header className="app-header">
//         <nav className="app-nav">
//           <NavLink to="/" className="nav-item">
//             Home
//           </NavLink>

//           console.log("disableNav", disableNav.toString());

//           {disableNav ? (
//             <span className="nav-item disabled-link" title="Complete your profile to unlock Insights">
//               Insights
//             </span>
//           ) : (
//             <NavLink to="/insights" className="nav-item">
//               Insights
//             </NavLink>
//           )}

//           {disableNav ? (
//             <span className="nav-item disabled-link" title="Complete your profile to unlock Coaching">
//               Coaching
//             </span>
//           ) : (
//             <NavLink to="/coaching" className="nav-item">
//               Coaching
//             </NavLink>
//           )}

//           <NavLink to="/settings" className="nav-item">
//             Settings
//           </NavLink>

//           <NavLink to="/pricing" className="nav-item">
//             Pricing
//           </NavLink>

//           <button onClick={signOut} className="nav-item signout-button">
//             Sign Out
//           </button>
//         </nav>
//       </header>

//       <main className="app-content">
//         {children}
//       </main>
//     </div>
//   );
// }
