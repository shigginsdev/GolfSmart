import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import "./GolfScoreInput.css";

const GolfScoreInput = ({ user }) => {
  const initialFormState = {
    scoreId: uuidv4(),
    Date: "2/25/2025",
    ...Object.fromEntries(
      Array.from({ length: 18 }, (_, i) => [`Hole${i + 1}Score`, ""])
    ),
  };

  const [formData, setFormData] = useState(initialFormState);
  const [scanResult, setScanResult] = useState(null); // ✅ Holds API response for display
  const [loading, setLoading] = useState(false); // ✅ Tracks API request status

  const saveScoreApiEndpoint =
    "https://weokdphpt7.execute-api.us-east-2.amazonaws.com/DEV/";
  const scanScorecardApiEndpoint =
    "https://r2obqlzcrj.execute-api.us-east-2.amazonaws.com/DEV"; // ✅ New API

  const userId = user?.userId;  
  const firstName = user?.attributes?.given_name || "";

  console.log("👤 User ID:", userId);
  console.log("👤 First Name:", firstName);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId) {
      console.error("❌ User not authenticated. Cannot submit.");
      alert("User not authenticated.");
      return;
    }

    const payload = {
      userId,
      scoreId: formData.scoreId,
      Date: formData.Date,
      ...formData,
    };

    console.log("📤 Submitting payload:", payload);

    try {
      const response = await fetch(saveScoreApiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("✅ API Response:", result);
      alert("Data submitted successfully!");
    } catch (error) {
      console.error("❌ Error submitting data:", error);
      alert("Failed to submit data.");
    }
  };

  // ✅ New function to clear the form
  const handleClearForm = () => {
    setFormData(initialFormState);
    setScanResult(null); // Clear scanned results
  };

  // ✅ New function to handle the top submit button
  const handleTopSubmit = async () => {
    console.log("🔼 Scan in my scorecard clicked!");
  
    if (!userId) {
      alert("User not authenticated.");
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await fetch(scanScorecardApiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });
  
      const result = await response.json();
      console.log("Returned scanned response:", result);
  
      // ✅ Store full result in state for debugging
      setScanResult(result.message || "No scores detected.");
  
      // ✅ Extract JSON from response (remove extra text)
      let jsonString;
      const jsonMatch = result.message.match(/```json\n([\s\S]+?)\n```/);

      console.log("🔍 JSON Match:", jsonMatch);
      
      if (jsonMatch) {
        jsonString = jsonMatch[1]; // Extract JSON part
      } else {
        console.error("❌ JSON not found in API response.");
        setScanResult("❌ Failed to extract JSON.");
        return;
      }
  
      console.log("📜 Extracted JSON String:", jsonString);
  
      // ✅ Convert extracted string to JSON
      let parsedScores;
      try {
        parsedScores = JSON.parse(jsonString);
        console.log("✅ Parsed Scores:", parsedScores);
      } catch (error) {
        console.error("❌ Error parsing JSON:", error);
        setScanResult("❌ Failed to parse JSON.");
        return;
      }
  
      // ✅ Ensure extracted data is in correct format
      if (parsedScores && typeof parsedScores === "object") {
        const updatedScores = { ...formData };
  
        Object.entries(parsedScores).forEach(([key, value]) => {
          const holeKey = `Hole${key}Score`;
          if (updatedScores.hasOwnProperty(holeKey)) {
            updatedScores[holeKey] = value.toString(); // Convert to string for input fields
          }
        });
  
        console.log("📋 Updated Form Data:", updatedScores);
  
        // ✅ Update form with extracted scores
        setFormData(updatedScores);
      } else {
        console.error("❌ Invalid API response format");
        setScanResult("❌ Invalid API response format.");
      }
    } catch (error) {
      console.error("❌ Error scanning scorecard:", error);
      setScanResult("❌ Failed to scan scorecard.");
    } finally {
      setLoading(false);
    }
  };
  

  

  return (
    <div className="score-input-container">
      <h2>Enter Golf Scores</h2>

      {/* ✅ New Submit Button at the Top */}
      <div className="top-button-group">
        <button
          type="button"
          className="submit-button top-submit"
          onClick={handleTopSubmit}
          disabled={loading} // Disable button while loading
        >
          {loading ? "Scanning..." : "Scan in my scorecard"}
        </button>
      </div>  

      <form onSubmit={handleSubmit} className="scores-form">
        <label className="date-label">
          Date:
          <input
            type="date"
            name="Date"
            value={formData.Date}
            onChange={handleChange}
            required
          />
        </label>

        <div className="holes-row">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="hole">
              <label>Hole {i + 1}</label>
              <input
                type="number"
                name={`Hole${i + 1}Score`}
                value={formData[`Hole${i + 1}Score`]}
                onChange={handleChange}
                required
              />
            </div>
          ))}
        </div>

        <div className="holes-row">
          {[...Array(9)].map((_, i) => (
            <div key={i + 9} className="hole">
              <label>Hole {i + 10}</label>
              <input
                type="number"
                name={`Hole${i + 10}Score`}
                value={formData[`Hole${i + 10}Score`]}
                onChange={handleChange}
                required
              />
            </div>
          ))}
        </div>

        <div className="button-group">
          <button type="submit" className="submit-button">Submit</button>
          <button type="button" className="clear-button" onClick={handleClearForm}>
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
};

export default GolfScoreInput;
