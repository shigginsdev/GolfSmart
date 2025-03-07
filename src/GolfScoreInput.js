import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";

const GolfScoreInput = ({ user }) => {
  const [formData, setFormData] = useState({
    scoreId: uuidv4(),
    Date: "2/25/2025",
    ...Object.fromEntries(
      Array.from({ length: 18 }, (_, i) => [`Hole${i + 1}Score`, ""])
    ),
  });

  const apiEndpoint =
    "https://weokdphpt7.execute-api.us-east-2.amazonaws.com/DEV/";

  const userId = user?.userId;

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
      const response = await fetch(apiEndpoint, {
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

  return (
    <div style={{ maxWidth: "600px", margin: "auto" }}>
      <h2>Enter Golf Scores</h2>

      <form onSubmit={handleSubmit}>
        <label>
          Date:
          <input
            type="date"
            name="Date"
            value={formData.Date}
            onChange={handleChange}
            required
          />
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
  );
};

export default GolfScoreInput;
