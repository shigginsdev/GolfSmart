import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';
import debounce from 'lodash.debounce';
import "./GolfScoreInput.css";
import { useUserTier } from './hooks/useUserTier';

const GolfScoreInput = ({ user }) => {
  // 📦 Initial form state constant (no hooks here)
  const initialFormState = {
    scoreId: uuidv4(),
    courseID: "",
    courseName: '',
    Date: new Date().toISOString().split("T")[0],
    ...Object.fromEntries(
      Array.from({ length: 18 }, (_, i) => [`Hole${i + 1}Score`, ""])
    ),
  };

  // 🔥 Hooks must always be called in the same order:
  // 1) subscription hook
  const { tier, uploadCount, isUploadLimitReached, loading: tierLoading } = useUserTier();

  // 2) form + UI state
  const [formData, setFormData]           = useState(initialFormState);
  const [scanResult, setScanResult]       = useState(null);
  const [loading, setLoading]             = useState(false);
  const [selectedFile, setSelectedFile]   = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [imageUrl, setImageUrl]           = useState("");
  const [credentials, setCredentials]     = useState(null);
  const [courseSuggestions, setCourseSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [firstName, setFirstName]         = useState("Unknown");

  // 3) any callbacks
  const debouncedSearch = useCallback(debounce(searchCourses, 400), []);

  // 4) effects
  useEffect(fetchS3UploadCredentials, []);
  useEffect(fetchUserProfile, []);
  useEffect(() => {
    console.log("📦 formData initialized:", formData);
    console.log("📦 tier loaded:", tier);
    console.log("📦 uploadCount loaded:", uploadCount);
  }, []);

  // --- EARLY RENDER GUARDS (now safe) ---
  if (tierLoading) {
    return <div className="tier-loading">Loading subscription details...</div>;
  }
  if (isUploadLimitReached) {
    return (
      <div className="tier-limit-container">
        <h2>Upload Limit Reached</h2>
        <p>
          You are on the free tier and have already uploaded {uploadCount} scorecards.
          <br />
          Please upgrade to Pro to continue uploading.
        </p>
      </div>
    );
  }

  // ✅ API Endpoints
  const saveScoreApiEndpoint           = "https://weokdphpt7.execute-api.us-east-2.amazonaws.com/DEV/";
  const scanScorecardApiEndpoint       = "https://r2obqlzcrj.execute-api.us-east-2.amazonaws.com/DEV";
  const fetchS3UploadCredentialsApi    = "https://fs1qgmv86f.execute-api.us-east-2.amazonaws.com/DEV";
  const courseSuggestionApi            = "https://8ryxv7ybo4.execute-api.us-east-2.amazonaws.com/DEV";
  const S3_BUCKET                      = "golf-scorecards-bucket";
  const REGION                         = "us-east-2";
  const userId                         = user?.userId;

  // ✅ Handle Input Changes
  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "courseName") {
      setFormData((prev) => ({
        ...prev,
        courseName: value,
        courseID: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    debouncedSearch(value);
  }

  // --- EFFECT FUNCTIONS ---

  async function fetchS3UploadCredentials() {
    const session = await fetchAuthSession();
    const token   = session.tokens?.idToken?.toString();
    if (!token) return;
    try {
      const res  = await fetch(fetchS3UploadCredentialsApi, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCredentials(data);
    } catch (err) {
      console.error("❌ Error fetching credentials:", err);
    }
  }

  async function fetchUserProfile() {
    try {
      const session = await fetchAuthSession();
      const token   = session.tokens?.idToken?.toString();
      if (!token) return;
      const res    = await fetch("https://exn14bxwk0.execute-api.us-east-2.amazonaws.com/DEV/", {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.status === "success") {
        setFirstName(result.data.firstName || "Unknown");
        if (result.data.homeCourseName && result.data.homeCourseID) {
          setFormData((prev) => ({
            ...prev,
            courseName: result.data.homeCourseName,
            courseID:   result.data.homeCourseID,
          }));
        }
      }
    } catch (err) {
      console.error("❌ Error fetching profile in GolfScoreInput:", err);
    }
  }

  // --- SEARCH & AUTOCOMPLETE ---

  async function searchCourses(query) {
    if (!query || query.length < 2) return;
    try {
      const session = await fetchAuthSession();
      const token   = session.tokens?.idToken?.toString();
      if (!token) return;
      const res = await fetch(`${courseSuggestionApi}?search_query=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCourseSuggestions(data.courses || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error("❌ Error searching courses from DynamoDB:", err);
    }
  }

  function handleCourseSelect(course) {
    setFormData((prev) => ({
      ...prev,
      courseName: course.courseName,
      courseID:   course.courseID,
    }));
    setCourseSuggestions([]);
    setShowSuggestions(false);
  }

  // --- FILE UPLOAD & OCR ---

  async function handleFileChange(e) {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (!file || !credentials) {
      alert("❌ No file selected or credentials missing.");
      return;
    }
    setUploading(true);
    let uploadedImageUrl = "";
    const fileName       = `scorecards/${Date.now()}-${file.name}`;
    try {
      const s3Client = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId:     credentials["ACCESS-KEY"],
          secretAccessKey: credentials["SECRET-KEY"],
        },
      });
      const buffer = await file.arrayBuffer();
      await s3Client.send(
        new PutObjectCommand({
          Bucket:      S3_BUCKET,
          Key:         fileName,
          Body:        new Uint8Array(buffer),
          ContentType: file.type,
        })
      );
      uploadedImageUrl = `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${fileName}`;
      setImageUrl(uploadedImageUrl);
      alert("✅ Upload Successful!");
    } catch (err) {
      console.error("❌ Error uploading file:", err);
    } finally {
      setUploading(false);
    }

    // OCR
    setLoading(true);
    try {
      const res = await fetch(scanScorecardApiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fileUrl: uploadedImageUrl, firstName }),
      });
      const result = await res.json();
      setScanResult(result.message || "No scores detected.");
      const match = result.message.match(/```json\n([\s\S]+?)\n```/);
      if (!match) return;
      const parsed = JSON.parse(match[1]);
      setFormData((prev) => ({
        ...prev,
        ...Object.entries(parsed).reduce((acc, [hole, val]) => {
          acc[`Hole${hole}Score`] = val.toString();
          return acc;
        }, {}),
      }));
    } catch (err) {
      console.error("❌ Error scanning:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- SUBMIT ---

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userId) return;
    const payload = {
      userId,
      scoreId:  formData.scoreId,
      Date:     formData.Date,
      courseID: formData.courseID,
      ...formData,
    };
    try {
      const res = await fetch(saveScoreApiEndpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      await res.json();
      alert("Data submitted successfully!");
    } catch (err) {
      console.error("❌ Error submitting data:", err);
    }
  }

  // --- RENDER FORM ---

  return (
    <div className="score-input-container">
      <h2>Enter Golf Scores</h2>

      <div className="upload-section">
        <label htmlFor="file-upload">Upload Scorecard:</label>
        <input
          id="file-upload"
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          disabled={uploading || isUploadLimitReached}
        />
        {isUploadLimitReached && <p>You have reached your upload limit.</p>}
        {uploading && <p>Uploading and scanning...</p>}
      </div>

      <form onSubmit={handleSubmit} className="scores-form">
        <label className="date-label">
          Date:
          <input type="date" name="Date" value={formData.Date} onChange={handleChange} required />
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

        <div className="form-group" style={{ position: 'relative' }}>
          <label>Course Played:</label>
          <input
            type="text"
            name="courseName"
            value={formData.courseName}
            onChange={handleChange}
            onFocus={() => setShowSuggestions(courseSuggestions.length > 0)}
            autoComplete="off"
            placeholder="Enter course name"
          />
          {showSuggestions && courseSuggestions.length > 0 && (
            <ul className="autocomplete-dropdown">
              {courseSuggestions.map((course) => (
                <li key={course.courseID} onClick={() => handleCourseSelect(course)}>
                  {course.courseName}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="button-group">
          <button type="submit" className="submit-button">Submit</button>
        </div>
      </form>
    </div>
  );
};

export default GolfScoreInput;
