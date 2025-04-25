import React from "react";
import { Amplify } from "aws-amplify";
import awsExports from "./aws-exports";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";
import Layout from "./layout";
import GolfScoreInput from "./GolfScoreInput";
import Insights from "./Insights";
import Leagues from "./Leagues";
import Settings from "./Settings";
import Coaching from "./Coaching";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

Amplify.configure(awsExports);

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Router>
          <Layout signOut={signOut} user={user}>
            <Routes>
              <Route path="/" element={<GolfScoreInput user={user} />} />
              <Route path="/insights" element={<Insights user={user} />} />
              <Route path="/coaching" element={<Coaching user={user} />} />
              <Route path="/settings" element={<Settings user={user} />} />
            </Routes>
          </Layout>
        </Router>
      )}
    </Authenticator>
  );
}

export default App;