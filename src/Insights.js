import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';

const Insights = ({ user }) => {
  const [averageScores, setAverageScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const insightsApiEndpoint = "https://uvcdb20nw5.execute-api.us-east-2.amazonaws.com/DEV"; // Replace with your deployed Lambda API

  useEffect(() => {
    const fetchInsights  = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if (!token || !user?.userId) {
          console.error("Missing token or userId");
          return;
        }

        const response = await fetch(insightsApiEndpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },          
        });

        if (!response.ok) {
          throw new Error(`❌ Failed to fetch insights: ${response.status}`);
        }

        const rounds = await response.json();
        console.log("✅ Insights data:", rounds);

        if (!Array.isArray(rounds)) return;

        const totals = Array(18).fill(0);
        const counts = Array(18).fill(0);

        rounds.forEach(round => {
          for (let i = 0; i < 18; i++) {
            const score = parseInt(round[`Hole${i + 1}Score`], 10);
            if (!isNaN(score)) {
              totals[i] += score;
              counts[i]++;
            }
          }
        });

        const averages = totals.map((sum, i) =>
          counts[i] > 0 ? (sum / counts[i]).toFixed(1) : "-"
        );

        setAverageScores(averages);
      } catch (err) {
        console.error("❌ Error fetching insights:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [user]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Insights</h2>
      <p>Average score per hole (last 10 rounds)</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>
          <thead>
            <tr>
              {Array.from({ length: 18 }, (_, i) => (
                <th key={i}>Hole {i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {averageScores.map((score, i) => (
                <td key={i}>{score}</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Insights;
