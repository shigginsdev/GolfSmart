import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import "./GolfScoreInput.css";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const GolfScoreInput = ({ user }) => {
  const initialFormState = {
    scoreId: uuidv4(),
    Date: "2/25/2025",
    ...Object.fromEntries(
      Array.from({ length: 18 }, (_, i) => [`Hole${i + 1}Score`, ""])
    ),
  };

  const UploadToS3 = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [credentials, setCredentials] = useState(null);
  

  const [formData, setFormData] = useState(initialFormState);
  const [scanResult, setScanResult] = useState(null); // ✅ Holds API response for display
  const [loading, setLoading] = useState(false); // ✅ Tracks API request status

  const saveScoreApiEndpoint =
    "https://weokdphpt7.execute-api.us-east-2.amazonaws.com/DEV/"; //Save the scorecard form to DynamoDB
  const scanScorecardApiEndpoint =
    "https://r2obqlzcrj.execute-api.us-east-2.amazonaws.com/DEV"; //If the user uploads a scorecard, send it to OpenAI to pull the scores and prepopulate the form
  const API_GET_CREDENTIALS = "https://fs1qgmv86f.execute-api.us-east-2.amazonaws.com/DEV"; //Endpoint for the S3 bucket API

  const S3_BUCKET = "golf-scorecards-bucket";
  const REGION = "us-east-2";

  const userId = user?.userId;  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Submit the scorecard form to DynamoDB
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

  // Upload the scorecard jpeg and send to openAI to pull the scores and prepopulate the form
  const handleTopSubmit = async () => {
    console.log("🔼 Scan in my scorecard clicked!");
  
    if (!userId) {
      alert("User not authenticated.");
      return;
    }
  
    setLoading(true);

    //Upload the scorecard image to S3
    useEffect(() => {
      const fetchCredentials = async () => {
        try {
          const response = await fetch(API_GET_CREDENTIALS);
          const data = await response.json();
          setCredentials(data);
        } catch (error) {
          console.error("❌ Error fetching credentials:", error);
        }
      };
      fetchCredentials();
    }, []);
  
    const handleFileChange = (event) => {
      setSelectedFile(event.target.files[0]);
    };
  
    const handleUpload = async () => {
      if (!selectedFile || !credentials) {
        alert("❌ No file selected or credentials missing.");
        return;
      }
  
      setUploading(true);
  
      const fileName = `scorecards/${Date.now()}-${selectedFile.name}`;
  
      const s3Client = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: credentials.ACCESS_KEY,
          secretAccessKey: credentials.SECRET_KEY,
        },
      });
  
      const params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: selectedFile,
        ContentType: selectedFile.type,
      };
  
      try {
        await s3Client.send(new PutObjectCommand(params));
        const uploadedImageUrl = `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${fileName}`;
        setImageUrl(uploadedImageUrl);
        alert("✅ Upload Successful!");
      } catch (error) {
        console.error("❌ Error uploading file:", error);
        alert("Upload failed!");
      } finally {
        setUploading(false);
      }
    };
    
    //Get the link to the scorecard image in S3
  
    //Call the openAI integration to scan the scorecard image
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
      <div>
      <h2>Upload Scorecard</h2>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      <button onClick={handleUpload} disabled={uploading || !credentials}>
        {uploading ? "Uploading..." : "Upload to S3"}
      </button>
      {imageUrl && (
        <div>
          <h3>Uploaded Image:</h3>
          <img src={imageUrl} alt="Uploaded Scorecard" style={{ maxWidth: "300px" }} />
        </div>
      )}
    </div>

      {/* <div className="top-button-group">
        <button
          type="button"
          className="submit-button top-submit"
          onClick={handleTopSubmit}
          disabled={loading} // Disable button while loading
        >
          {loading ? "Scanning..." : "Scan in my scorecard"}
        </button>
      </div>*/}  

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
