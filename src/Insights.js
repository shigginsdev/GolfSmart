import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';
import { useFlags } from "./hooks/useFlags";
import { useUserTier } from "./hooks/useUserTier";
import "./insights.css";

const Insights = ({ user }) => {  

  const { tier, uploadCount, loading: tierLoading, error: tierError } = useUserTier();
  const flags = useFlags();

   // 2) Derive free-tier limit
  const freeLimit = flags?.uploadLimits?.config?.freeMaxUploads ?? 3;
  const hasReachedUploadLimit = tier === 'free' && uploadCount >= freeLimit;

  const [averageScores, setAverageScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roundTotals, setRoundTotals] = useState([]);

  const insightsApiEndpoint = "https://n0l87dnv8j.execute-api.us-east-2.amazonaws.com/DEV"; // Replace with your deployed Lambda API

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

        // Aggregate all scores where the user shot above zero to create an average
        rounds.forEach(round => {
          for (let i = 0; i < 18; i++) {
            const score = parseInt(round[`Hole${i + 1}Score`], 10);
            if (!isNaN(score) && score>0) {
              totals[i] += score;
              counts[i]++;
            }
          }
        });

        const averages = totals.map((sum, i) =>
          counts[i] > 0 ? (sum / counts[i]).toFixed(1) : "-"
        );

        setAverageScores(averages);

        // Calculate total score per round
        const roundSummaries = rounds.map(round => {
          let total = 0;
          for (let i = 1; i <= 18; i++) {
            const score = parseInt(round[`Hole${i}Score`], 10);
            if (!isNaN(score)) {
              total += score;
            }
          }
          return { date: round.Date, total };
        });

        // Sort by most recent
        roundSummaries.sort((a, b) => new Date(b.date) - new Date(a.date));

        setRoundTotals(roundSummaries);

      } catch (err) {
        console.error("❌ Error fetching insights:", err);        
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [user]);

    if (tierLoading || !flags) {
      return <p>Loading subscription details…</p>;
    }
    if (tierError) {
      return <p>Error loading subscription: {tierError.message}</p>;
    }

  return (
    <div className="insights-container">
       {hasReachedUploadLimit && (
        <div className="tier-limit-banner">
          You’ve used {uploadCount}/{freeLimit} free uploads this month. 
          <strong> Upgrade to Pro</strong> to upload more scorecards!
        </div>
      )}      
      <div className="score-input-container">
        <h2>Average score per hole (last 10 rounds)</h2>      

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="insights-table-wrapper">
            <table className="insights-table">
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
          </div>
        )}
      </div>

      <div className="score-input-container">
      <h2>Score per round</h2>      

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total Score</th>
            </tr>
          </thead>
          <tbody>
            {roundTotals.map((round, i) => (
              <tr key={i}>
                <td>{round.date}</td>
                <td>{round.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>

      <div className="score-input-container">
      <h2>Over/Under per hole for the last round</h2>      

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>
          <thead>
            <tr>
              <th>TBD</th>
              <th>Total Score</th>
            </tr>
          </thead>
          <tbody>
            TBD
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
};

export default Insights;
