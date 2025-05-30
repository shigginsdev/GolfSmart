import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';
import debounce from 'lodash.debounce';
import "./GolfScoreInput.css";
import { useUserTier } from './hooks/useUserTier';

const GolfScoreInput = ({ user }) => {
  //
  // ——— 1) Declare all hooks at top ——————————————————————————
  //

  // 1a) Subscription/tier info
  const {
    tier,
    uploadCount,
    isUploadLimitReached,
    loading: tierLoading
  } = useUserTier();

  // 1b) Form & UI state
  const initialFormState = {
    scoreId:   uuidv4(),
    courseID:  "",
    courseName: "",
    Date:      new Date().toISOString().split("T")[0],
    ...Object.fromEntries(
      Array.from({ length: 18 }, (_, i) => [`Hole${i + 1}Score`, ""])
    ),
  };
  const [formData, setFormData]         = useState(initialFormState);
  const [scanResult, setScanResult]     = useState(null);
  const [loading, setLoading]           = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [credentials, setCredentials]   = useState(null);
  const [courseSuggestions, setCourseSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [firstName, setFirstName]       = useState("Unknown");

    // 1d) Constants
  const saveScoreApiEndpoint            = "https://weokdphpt7.execute-api.us-east-2.amazonaws.com/DEV/";
  const scanScorecardApiEndpoint        = "https://r2obqlzcrj.execute-api.us-east-2.amazonaws.com/DEV";
  const fetchS3UploadCredentialsApi     = "https://fs1qgmv86f.execute-api.us-east-2.amazonaws.com/DEV";
  const courseSuggestionApi             = "https://8ryxv7ybo4.execute-api.us-east-2.amazonaws.com/DEV";
  const S3_BUCKET                       = "golf-scorecards-bucket";
  const REGION                          = "us-east-2";
  const userId                          = user?.userId;

  // 1e) Effects that run unconditionally
  useEffect(fetchS3UploadCredentials, []);
  useEffect(fetchUserProfile, []);
  useEffect(() => {
    console.log("📦 formData:", formData);
    console.log("📦 tier:", tier, "uploads:", uploadCount);
  }, [formData, tier, uploadCount]);


  //
  // ——— 2) Early returns (no hooks here!) ——————————————————————
  //
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


  //
  // ——— 3) Helper functions (in scope for JSX) ——————————————————
  //

  async function fetchS3UploadCredentials() {
    try {
      const session = await fetchAuthSession();
      const token   = session.tokens?.idToken?.toString();
      if (!token) return;
      const res  = await fetch(fetchS3UploadCredentialsApi, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`
        }
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
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`
        }
      });
      const result = await res.json();
      if (result.status === "success") {
        const { firstName: fn, homeCourseName, homeCourseID } = result.data;
        setFirstName(fn || "Unknown");
        if (homeCourseName && homeCourseID) {
          setFormData(fd => ({
            ...fd,
            courseName: homeCourseName,
            courseID:   homeCourseID
          }));
        }
      }
    } catch (err) {
      console.error("❌ Error fetching profile in GolfScoreInput:", err);
    }
  }

  async function searchCourses(query) {
    if (!query || query.length < 2) return;
    try {
      const session = await fetchAuthSession();
      const token   = session.tokens?.idToken?.toString();
      if (!token) return;
      const res  = await fetch(
        `${courseSuggestionApi}?search_query=${encodeURIComponent(query)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${token}`
          }
        }
      );
      const data = await res.json();
      setCourseSuggestions(data.courses || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error("❌ Error searching courses:", err);
    }
  }

  // 1c) Stable callback for search debounce
  const debouncedSearch = useCallback(debounce(searchCourses, 400), []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(fd => ({
      ...fd,
      [name]: value,
      // if they're typing courseName, clear the ID so they re-pick
      ...(name === "courseName" ? { courseID: "" } : {})
    }));
    debouncedSearch(value);
  }

  function handleCourseSelect(course) {
    setFormData(fd => ({
      ...fd,
      courseName: course.courseName,
      courseID:   course.courseID
    }));
    setCourseSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (!file || !credentials) {
      alert("❌ No file selected or credentials missing.");
      return;
    }
    setUploading(true);
    let uploadedImageUrl = "";
    const fileName = `scorecards/${Date.now()}-${file.name}`;
    try {
      const s3 = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId:     credentials["ACCESS-KEY"],
          secretAccessKey: credentials["SECRET-KEY"]
        }
      });
      const buf = await file.arrayBuffer();
      await s3.send(new PutObjectCommand({
        Bucket:      S3_BUCKET,
        Key:         fileName,
        Body:        new Uint8Array(buf),
        ContentType: file.type
      }));
      uploadedImageUrl = `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${fileName}`;
      setImageUrl(uploadedImageUrl);
      alert("✅ Upload Successful!");
    } catch (err) {
      console.error("❌ Error uploading file:", err);
    } finally {
      setUploading(false);
    }

    // now scan with OpenAI
    setLoading(true);
    try {
      const res    = await fetch(scanScorecardApiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fileUrl: uploadedImageUrl, firstName })
      });
      const result = await res.json();
      setScanResult(result.message || "No scores detected.");
      const m = result.message.match(/```json\n([\s\S]+?)\n```/);
      if (m) {
        const parsed = JSON.parse(m[1]);
        setFormData(fd => ({
          ...fd,
          ...Object.fromEntries(
            Object.entries(parsed).map(
              ([hole, val]) => [`Hole${hole}Score`, val.toString()]
            )
          )
        }));
      }
    } catch (err) {
      console.error("❌ Error scanning:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userId) return;
    const payload = {
      userId,
      scoreId:  formData.scoreId,
      Date:     formData.Date,
      courseID: formData.courseID,
      ...formData
    };
    try {
      await fetch(saveScoreApiEndpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
      });
      alert("Data submitted successfully!");
    } catch (err) {
      console.error("❌ Error submitting data:", err);
    }
  }


  //
  // ——— 4) The JSX return —————————————————————————————————————
  //
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
              {courseSuggestions.map(c => (
                <li key={c.courseID} onClick={() => handleCourseSelect(c)}>
                  {c.courseName}
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
