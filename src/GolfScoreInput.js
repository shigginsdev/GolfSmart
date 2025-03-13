import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import "./GolfScoreInput.css";
import OpenAI from "openai";

const openai = new OpenAI();

const GolfScoreInput = ({ user }) => {
  const initialFormState = {
    scoreId: uuidv4(),
    Date: "2/25/2025",
    ...Object.fromEntries(
      Array.from({ length: 18 }, (_, i) => [`Hole${i + 1}Score`, ""])
    ),
  };

  const [formData, setFormData] = useState(initialFormState);

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

  // ✅ New function to clear the form
  const handleClearForm = () => {
    setFormData(initialFormState);
  };

  // ✅ New function to handle the top submit button
  const handleTopSubmit = () => {
    console.log("🔼 Top Submit Button Clicked! Add logic here.");
    // Add your custom submit logic here

    client = OpenAI(
      api_key="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"
    );

    response = client.chat.completions.create(
      model="gpt-4o-mini",
      messages=[{
          "role": "user",
          "content": [
              {"type": "text", "text": "Provide a list of all scores, holes 1 - 18, for Connor from the attached scorecard. Provide the output as json key value pairs with the hold number and Bobby's score for that hole. If you are unsure on a particular hole, respond with Unk."},
              {
                  "type": "image_url",
                  "image_url": {
                      "url": "https://live.staticflickr.com/65535/54384461051_d070850925.jpg",
                  },
              },
          ],
      }],
    )
    
    console.log(response.choices[0].message.content);
  };

  return (
    <div className="score-input-container">
      <h2>Enter Golf Scores</h2>

      {/* ✅ New Submit Button at the Top */}
      <div className="top-button-group">
        <button type="button" className="submit-button top-submit" onClick={handleTopSubmit}>
          Submit Scores
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
