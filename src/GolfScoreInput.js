import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';
import debounce from 'lodash.debounce';
import "./GolfScoreInput.css";
import { useUserTier } from './hooks/useUserTier';
// import * as e from 'express';

const GolfScoreInput = ({ user }) => {
  const initialFormState = {
    scoreId: uuidv4(),
    courseID: "",
    courseName: '',
    Date: new Date().toISOString().split("T")[0],
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
  const [courseSuggestions, setCourseSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [firstName, setFirstName] = useState("Unknown");
  const { tier, uploadCount, isUploadLimitReached, loading: tierLoading } = useUserTier();


  // ✅ API Endpoints
  const saveScoreApiEndpoint = "https://weokdphpt7.execute-api.us-east-2.amazonaws.com/DEV/";
  const scanScorecardApiEndpoint = "https://r2obqlzcrj.execute-api.us-east-2.amazonaws.com/DEV";
  const fetchS3UploadCredentialsApiEndpoint = "https://fs1qgmv86f.execute-api.us-east-2.amazonaws.com/DEV";
  const courseSuggestionApi = "https://8ryxv7ybo4.execute-api.us-east-2.amazonaws.com/DEV"; // same as checkCreateCourse API

  const S3_BUCKET = "golf-scorecards-bucket";
  const REGION = "us-east-2";
  const userId = user?.userId;  


   // ✅ Handle Input Changes
   const handleChange = (e) => {
    console.log("Handle change called")
    const { name, value } = e.target;    

    if (name === 'courseName') {
      setFormData(prev => ({
        ...prev,
        courseName: value,
        courseID: '', // Clear this when typing
      }));            
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    debouncedSearch(value);

  };


  useEffect(() => {
    const fetchS3UploadCredentials = async () => {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) return;

      try {
        const response = await fetch(fetchS3UploadCredentialsApiEndpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        const data = await response.json();
        setCredentials(data);
      } catch (error) {
        console.error("❌ Error fetching credentials:", error);
      }
    };

    fetchS3UploadCredentials();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) return;

        const response = await fetch("https://exn14bxwk0.execute-api.us-east-2.amazonaws.com/DEV/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        if (result.status === "success") {
          setFirstName(result.data.firstName || "Unknown");

          if (result.data.homeCourseName && result.data.homeCourseID) {
            setFormData(prev => ({
              ...prev,
              courseName: result.data.homeCourseName,              
              courseID: result.data.homeCourseID,
            }));
          }
        }
      } catch (error) {
        console.error("❌ Error fetching profile in GolfScoreInput:", error);
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    console.log("📦 formData initialized:", formData);
    console.log("📦 tier loaded:", tier);
    console.log("📦 uploadCount loaded:", uploadCount);
  }, []);

  const handleCourseSelect = (course) => {
    // const courseName = `${course.courseName} (${course.course_data.location.city}, ${course.course_data.location.state})`;
    const courseName = `${course.courseName}`;
    setFormData(prev => ({
      ...prev,
      courseName,
      courseID: course.courseID,
    }));
    setCourseSuggestions([]);
    setShowSuggestions(false);
  };

  // ✅ Fetch course suggestions from DynamoDB
  const searchCourses = async (query) => {

    console.log('Searching for', query)
    if (!query || query.length < 2) return;

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) return;

      const response = await fetch(`${courseSuggestionApi}?search_query=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      console.log('🔍 Search results:', data);

      setCourseSuggestions(data.courses || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("❌ Error searching courses from DynamoDB:", error);
    }
  };

  const debouncedSearch = useCallback(debounce(searchCourses, 400), []);

  // ✅ Handle File Selection
  const handleFileChange = async (event) => {
    
    const file = event.target.files[0];
    setSelectedFile(file); // Save to state if needed elsewhere
  
    if (!file || !credentials) {
      alert("❌ No file selected or credentials missing.");
      return;
    }
  
    setUploading(true);
    let uploadedImageUrl = "";
    const fileName = `scorecards/${Date.now()}-${file.name}`;
  
    try {
      const s3Client = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: credentials["ACCESS-KEY"],
          secretAccessKey: credentials["SECRET-KEY"],
        },
      });
  
      const fileStream = await file.arrayBuffer();
  
      const params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: new Uint8Array(fileStream),
        ContentType: file.type,
      };
  
      await s3Client.send(new PutObjectCommand(params));
      uploadedImageUrl = `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${fileName}`;
      setImageUrl(uploadedImageUrl);
      alert("✅ Upload Successful!");
    } catch (error) {
      console.error("❌ Error uploading file:", error);
    } finally {
      setUploading(false);
    }    

    setLoading(true);

    //scan in to openAI api

    try {
      const response = await fetch(scanScorecardApiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fileUrl: uploadedImageUrl, firstName }),
      });

      const result = await response.json();
      setScanResult(result.message || "No scores detected.");

      const jsonMatch = result.message.match(/```json\n([\s\S]+?)\n```/);
      if (!jsonMatch) return;

      const parsedScores = JSON.parse(jsonMatch[1]);

      setFormData((prevData) => ({
        ...prevData,
        ...Object.entries(parsedScores).reduce((acc, [key, value]) => {
          acc[`Hole${key}Score`] = value.toString();
          return acc;
        }, {}),
      }));
    } catch (error) {
      console.error("❌ Error scanning:", error);
    } finally {
      setLoading(false);
    }
  };
  

  // ✅ Submit to DynamoDB
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId) return;

    const payload = {
      userId,
      scoreId: formData.scoreId,
      Date: formData.Date,
      courseID: formData.courseID,
      ...formData,
    };

    try {
      const response = await fetch(saveScoreApiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      alert("Data submitted successfully!");
    } catch (error) {
      console.error("❌ Error submitting data:", error);
    }
  };

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
        {isUploadLimitReached && <p>You’ve reached your upload limit.</p>}
        {uploading && <p>Uploading and scanning...</p>}
      </div>

      {/* ✅ Scan Button */}
      {/* <div className="top-button-group">
        <button type="button" className="submit-button top-submit" onClick={handleTopSubmit} disabled={loading}>
          {loading ? "Scanning..." : "Scan in my scorecard"}
        </button>
      </div> */}

      <form onSubmit={handleSubmit} className="scores-form">
        <label className="date-label">
          Date:
          <input type="date" name="Date" value={formData.Date} onChange={handleChange} required />
        </label>

        <div className="holes-row">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="hole">
              <label>Hole {i + 1}</label>
              <input type="number" name={`Hole${i + 1}Score`} value={formData[`Hole${i + 1}Score`]} onChange={handleChange} required />
            </div>
          ))}
        </div>

        <div className="holes-row">
          {[...Array(9)].map((_, i) => (
            <div key={i + 9} className="hole">
              <label>Hole {i + 10}</label>
              <input type="number" name={`Hole${i + 10}Score`} value={formData[`Hole${i + 10}Score`]} onChange={handleChange} required />
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