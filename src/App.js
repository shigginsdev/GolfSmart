import React, { useState } from "react";

const GolfScoreInput = () => {
  const [formData, setFormData] = useState({
    ScoreID: "17",
    Date: "2/25/2025",
    ...Object.fromEntries(
      Array.from({ length: 18 }, (_, i) => [
        `Hole${i + 1}Par`, "",
        `Hole${i + 1}Score`, ""
      ])
    ),
  });

  //testing here
  const apiEndpoint = "https://weokdphpt7.execute-api.us-east-2.amazonaws.com/DEV/";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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
    <div style={{ maxWidth: "600px", margin: "auto" }}>
      <h2>Enter Golf Scores</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Score ID:
          <input type="text" name="ScoreID" value={formData.ScoreID} onChange={handleChange} required />
        </label>
        <br />
        <label>
          Date:
          <input type="date" name="Date" value={formData.Date} onChange={handleChange} required />
        </label>
        <br />

        {[...Array(18)].map((_, i) => (
          <div key={i}>
            <h4>Hole {i + 1}</h4>
            <label>
              Par:
              <input
                type="number"
                name={`Hole${i + 1}Par`}
                value={formData[`Hole${i + 1}Par`]}
                onChange={handleChange}
                required
              />
            </label>
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
