import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import "./GolfScoreInput.css";

const GolfScoreInput = ({ user }) => {
  const initialFormState = {
    scoreId: uuidv4(),
    Date: new Date().toISOString().split("T")[0], // ✅ Default to today's date
    ...Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`Hole${i + 1}Score`, ""])),
  };

  // ✅ State Hooks
  const [formData, setFormData] = useState(initialFormState);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [credentials, setCredentials] = useState(null);

  // ✅ API Endpoints
  const saveScoreApiEndpoint = "https://weokdphpt7.execute-api.us-east-2.amazonaws.com/DEV/"; // Save form data
  const scanScorecardApiEndpoint = "https://r2obqlzcrj.execute-api.us-east-2.amazonaws.com/DEV"; // Scan image with OpenAI
  const fetchS3UploadCredentialsApiEndpoint = "https://fs1qgmv86f.execute-api.us-east-2.amazonaws.com/DEV"; // Get AWS credentials

  const S3_BUCKET = "golf-scorecards-bucket";
  const REGION = "us-east-2";
  const userId = user?.userId;

  // ✅ Fetch AWS Credentials on Load
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const response = await fetch(fetchS3UploadCredentialsApiEndpoint);
        const data = await response.json();
        setCredentials(data);
      } catch (error) {
        console.error("❌ Error fetching credentials:", error);
      }
    };
    fetchCredentials();
  }, []);

  // ✅ Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ✅ Handle File Selection
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // ✅ Upload File to S3
  const handleUpload = async () => {
    if (!selectedFile || !credentials) {
      alert("❌ No file selected or credentials missing.");
      return;
    }

    setUploading(true);
    const fileName = `scorecards/${Date.now()}-${selectedFile.name}`;

    try {
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

  // ✅ Scan Image & Prepopulate Scores
  const handleTopSubmit = async () => {
    console.log("🔼 Scan in my scorecard clicked!");

    if (!userId) {
      alert("User not authenticated.");
      return;
    }

    if (!imageUrl) {
      alert("Please upload an image before scanning.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(scanScorecardApiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fileUrl: imageUrl }),
      });

      const result = await response.json();
      console.log("✅ Scan API Response:", result);
      setScanResult(result.message || "No scores detected.");

      // ✅ Extract JSON from response
      const jsonMatch = result.message.match(/```json\n([\s\S]+?)\n```/);
      if (!jsonMatch) {
        setScanResult("❌ Failed to extract JSON.");
        return;
      }

      // ✅ Convert extracted string to JSON
      let parsedScores;
      try {
        parsedScores = JSON.parse(jsonMatch[1]);
      } catch (error) {
        console.error("❌ Error parsing JSON:", error);
        setScanResult("❌ Failed to parse JSON.");
        return;
      }

      // ✅ Prepopulate Form Fields
      setFormData((prevData) => ({
        ...prevData,
        ...Object.fromEntries(
          Object.entries(parsedScores).map(([key, value]) => [
            `Hole${key}Score`,
            value.toString(),
          ])
        ),
      }));
    } catch (error) {
      console.error("❌ Error scanning scorecard:", error);
      setScanResult("❌ Failed to scan scorecard.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Submit Form to DynamoDB
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

  return (
    <div className="score-input-container">
      <h2>Enter Golf Scores</h2>

      {/* ✅ Upload Section */}
      <div className="upload-section">
        <label>Upload Scorecard:</label>
        <input type="file" accept="image/jpeg,image/png" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={uploading || !credentials}>
          {uploading ? "Uploading..." : "Upload to S3"}
        </button>
      </div>

      {/* ✅ Scan Button */}
      <div className="top-button-group">
        <button type="button" className="submit-button top-submit" onClick={handleTopSubmit} disabled={loading}>
          {loading ? "Scanning..." : "Scan in my scorecard"}
        </button>
      </div>

      {/* ✅ Display Scan Result */}
      {scanResult && (
        <div className="scan-result">
          <h3>Scan Result:</h3>
          <pre>{JSON.stringify(scanResult, null, 2)}</pre>
        </div>
      )}

      <form onSubmit={handleSubmit} className="scores-form">
        <label className="date-label">
          Date:
          <input type="date" name="Date" value={formData.Date} onChange={handleChange} required />
        </label>

        <div className="holes-row">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="hole">
              <label>Hole {i + 1}</label>
              <input type="number" name={`Hole${i + 1}Score`} value={formData[`Hole${i + 1}Score`]} onChange={handleChange} required />
            </div>
          ))}
        </div>

        <div className="button-group">
          <button type="submit" className="submit-button">Submit</button>
        </div>
      </form>
    </div>
  );
};

export default GolfScoreInput;
