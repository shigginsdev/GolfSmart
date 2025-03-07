import React, { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';
import '@aws-amplify/ui-react/styles.css';

Amplify.configure(awsExports);

const GolfScoreInput = () => {
  const [formData, setFormData] = useState({
    scoreId: uuidv4(),
    Date: "2/25/2025",
    ...Object.fromEntries(
      Array.from({ length: 18 }, (_, i) => [
        `Hole${i + 1}Score`, ""
      ])
    ),
  });

  const apiEndpoint = "https://weokdphpt7.execute-api.us-east-2.amazonaws.com/DEV/";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <Authenticator>
      {({ signOut, user }) => {
        const userId = user?.attributes?.sub;
        console.log("🔍 Auth Status:", authStatus);
        console.log("🔍 User:", user);

        const handleSubmit = async (e) => {
          e.preventDefault();

          if (!userId) {
            alert("User not authenticated.");
            return;
          }

          const payload = {
            userId,
            scoreId: formData.scoreId,
            Date: formData.Date,
            ...formData,
          };

          try {
            const response = await fetch(apiEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            const result = await response.json();
            alert("Data submitted successfully! Check console for response.");
            console.log("API Response:", result);
          } catch (error) {
            console.error("Error submitting data:", error);
            alert("Failed to submit data.");
          }
        };

        return (
          <main style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Welcome, {user?.username}!</h1>
            <p>You are now logged in to Golf Smart.</p>

            <div style={{ maxWidth: "600px", margin: "auto" }}>
              <h2>Enter Golf Scores</h2>

              <form onSubmit={handleSubmit}>
                <label>
                  Date:
                  <input type="date" name="Date" value={formData.Date} onChange={handleChange} required />
                </label>
                <br />

                {[...Array(18)].map((_, i) => (
                  <div key={i}>
                    <h4>Hole {i + 1}</h4>
                    <label>
                      Score:
                      <input
                        type="number"
                        name={`Hole${i + 1}Score`}
                        value={formData[`Hole${i + 1}Score`]}
                        onChange={handleChange}
                        required
                      />
                    </label>
                  </div>
                ))}

                <button type="submit">Submit</button>
              </form>
            </div>
            <button onClick={signOut}>Sign out</button>
          </main>
        );
      }}
    </Authenticator>
  );
};

export default GolfScoreInput;
