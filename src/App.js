import { Amplify } from "aws-amplify";
import React, { useState, useEffect } from 'react';
import awsExports from "./aws-exports";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { fetchAuthSession } from '@aws-amplify/auth';
import Layout from "./layout";
import GolfScoreInput from "./GolfScoreInput";
import Insights from "./Insights";
import Settings from "./Settings";
import Coaching from "./coaching";
import Pricing from "./pricing";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

//Amplify.configure(awsExports);
Amplify.configure({
  ...awsExports,
  Auth: {
    Cognito: {
      // Clears tokens when the browser is closed
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
     },
  },
});


// testing checkins
// ✅ API Endpoint for fetching the logged-in user's profile
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
  const [loading, setLoading] = useState(true);          // 🔄 Show loading screen until profile is fetched
  const [isNewUser, setIsNewUser] = useState(null);      // 🚩 Flag to redirect new users to Settings
  const [userProfile, setUserProfile] = useState(null);  // 📦 Holds full user profile from DynamoDB

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();                 

        if (!token) {
          throw new Error("No auth token found");
        }

        const response = await fetch(getUserProfile, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        console.log("📦 User profile response:", response);

        if (response.status === 404) {
          // ➕ New user — profile not yet saved in DynamoDB
          setIsNewUser(true);
          setUserProfile(null);

        } else if (response.ok) {
          const json = await response.json();
          // Envelope should be: { status: "success"|"error", data: {...}, message?: "..." }
          if (json.status === "success" && json.data) {
            // Got a valid profile object
            setUserProfile(json.data);
            setIsNewUser(false);

          } else if (json.status === "error" && json.message === "User not found") {
            // Backend explicitly told us there’s no profile yet
            setIsNewUser(true);
            setUserProfile(null);

          } else {
            // Unexpected shape or status—treat as new user for safety
            console.warn("Unexpected profile response:", json);
            setIsNewUser(true);
            setUserProfile(null);
          }

        } else {
          throw new Error(`Unexpected response: ${response.status}`);
        }

      } catch (err) {
        console.error("❌ Error fetching user profile:", err);
        setIsNewUser(true);  // Default to "new user" if there's any issue
      } finally {
        setLoading(false);  // ✅ Done fetching profile, allow app to render
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  if (loading) return <div>Loading...</div>;

  // 🔐 Force redirect to Settings if user profile not found and not already there
  if (isNewUser && window.location.pathname !== "/settings") {
    return <Navigate to="/settings" replace />;
  }

  return (
    <Layout signOut={signOut} user={user} disableNav={isNewUser}>
      <Routes>
        <Route path="/" element={<GolfScoreInput user={user} userProfile={userProfile} />} />
        <Route path="/insights" element={<Insights user={user} userProfile={userProfile} />} />
        <Route path="/coaching" element={<Coaching user={user} userProfile={userProfile} />} />
        {/* <Route path="/settings" element={<Settings user={user} userProfile={userProfile} isNewUser={isNewUser} />} /> */}
        <Route
          path="/settings"
          element={
            <Settings
              user={user}
              userProfile={userProfile}
              isNewUser={isNewUser}
              // pass down the setter so Settings can update the parent
              onProfileUpdate={(updatedProfile) => {
                setUserProfile(updatedProfile);
                setIsNewUser(isNewUser);
              }}
            />
          }
        />
        <Route path="/pricing" element={<Pricing user={user} userProfile={userProfile} />} />
      </Routes>
    </Layout>
  );
}

export default App;
