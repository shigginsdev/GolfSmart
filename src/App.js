import React from "react";
import { Amplify } from "aws-amplify";
import React, { useState, useEffect } from 'react';
import awsExports from "./aws-exports";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";
import Layout from "./layout";
import GolfScoreInput from "./GolfScoreInput";
import Insights from "./Insights";
import Settings from "./Settings";
import Coaching from "./coaching";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import * as e from 'express';


Amplify.configure(awsExports);


// ✅ API Endpoints
const getUserProfile = "https://s3crwhjhf4.execute-api.us-east-2.amazonaws.com/DEV/";

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Router>
          <AppRoutes user={user} signOut={signOut} />
        </Router>
      )}
    </Authenticator>
  );
}

function AppRoutes({ user, signOut }) {
  const [isNewUser, setIsNewUser] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch(getUserProfile, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        console.log("📦 User profile response:", response);

        if (response && response.email) {
          setIsNewUser(false);
        } else {
          setIsNewUser(true);
        }
      } catch (err) {
        console.error("Error checking user:", err);
        setIsNewUser(true); // treat as new if error
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [user]);

  if (loading) return <div>Loading...</div>;

  // Disable access to app features if user profile not complete
  if (isNewUser && window.location.pathname !== "/settings") {
    return <Navigate to="/settings" replace />;
  }

  return (
    <Layout signOut={signOut} user={user} disableNav={isNewUser}>
      <Routes>
        <Route path="/" element={<GolfScoreInput user={user} />} />
        <Route path="/insights" element={<Insights user={user} />} />
        <Route path="/coaching" element={<Coaching user={user} />} />
        <Route path="/settings" element={<Settings user={user} isNewUser={isNewUser} />} />
      </Routes>
    </Layout>
  );
}

export default App;