import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';
import { useFlags } from "./hooks/useFlags";
import { useUserTier } from "./hooks/useUserTier";
import { useNavigate } from 'react-router-dom';
import { awsRum } from './rumClient';
import "./coaching.css";

const Coaching = () => {

  const { tier, uploadCount } = useUserTier();
  const flags = useFlags();

  // free-tier limit comes from flags.uploadLimits.config.freeMaxUploads, fallback to 3
  const freeLimit = flags?.uploadLimits?.config?.freeMaxUploads ?? 3;
  const hasReachedUploadLimit = tier === 'free' && uploadCount >= freeLimit;
  const navigate = useNavigate();
  

  const [courses, setCourses] = useState([]);
  const [selectedCourseID, setSelectedCourseID] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [coachingTips, setCoachingTips] = useState('');
  const [showAlert, setShowAlert] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);      


  // ✅ API Endpoints
  const userCoursesApiEndpoint = "https://8ix76i3knc.execute-api.us-east-2.amazonaws.com/DEV";
  const analyzeCoursePerformance = "https://vucmlioeb2.execute-api.us-east-2.amazonaws.com/DEV";
  

  useEffect(() => {

    if (hasReachedUploadLimit) {
      // Skip loading courses if user is over free-tier limit
      setLoading(false);
      return;
    }

    const fetchUserCourses = async () => {
      setLoading(true);

      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      try {
        const response = await fetch(userCoursesApiEndpoint, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch course list');
        }

        const data = await response.json();

        // Map to unique courseID/courseName pairs
        const uniqueCoursesMap = {};
        data.forEach((item) => {
          uniqueCoursesMap[item.courseID] = item.courseName;
        });

        const uniqueCourses = Object.entries(uniqueCoursesMap).map(([courseID, courseName]) => ({
          courseID,
          courseName,
        }));

        setCourses(uniqueCourses);
        if (uniqueCourses.length > 0) {
          setSelectedCourseID(uniqueCourses[0].courseID);
          setSelectedCourseName(uniqueCourses[0].courseName);
        }
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading courses:', err);
        awsRum.recordError(err, { feature: 'error loading courses' });
        setError('Unable to load courses');
        setLoading(false);
      }
    };

    fetchUserCourses();
  }, [hasReachedUploadLimit]);

  const handleCourseChange = (e) => {
    // setSelectedCourseID(e.target.value);
    const selectedOption = courses.find(course => course.courseID === e.target.value);
    setSelectedCourseID(selectedOption.courseID);
    setSelectedCourseName(selectedOption.courseName);
  };

  const handleAnalyzeClick = async () => {

    setAnalyzing(true);

    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
  
    const payload = {
      courseID: selectedCourseID,
      courseName: selectedCourseName,
    };
    
  
    try {
      const response = await fetch(analyzeCoursePerformance, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log(response.stringify)
  
      if (!response.ok) {
        throw new Error('Failed to analyze course');
      }
  
      const data = await response.json();
      console.log("✅ AI Coaching Response:", data);

      
      const parsedBody = JSON.parse(data.body);  // parses the nested body

      setCoachingTips(parsedBody.message || 'No coaching tips received.');
        
    } catch (err) {
      console.error('❌ Error analyzing course:', err);
      // AWS RUM monitoring
      awsRum.recordError(err, { feature: 'analyze-course' });
      setError('Unable to analyze course');
    }
    finally {
      setAnalyzing(false);
    }
  };

  const hideAlert = () => setShowAlert(false);
  

  return (
    <>
     {analyzing && (
       <div className="loading-overlay">
         <div className="spinner" />
         <p>Analyzing your game…</p>
       </div>
     )}

    <div className="coaching-container">
      <h2>AI Coaching from your last 10 rounds</h2>      

      {hasReachedUploadLimit && showAlert ? (
          <div className="locked-coaching-message">
            <p>You've reached your limit of free AI coaching.</p>
            <div>
              <p><strong>Upgrade to Pro</strong> to unlock personalized coaching and unlimited uploads!</p>
              <button onClick={() => navigate('/pricing')}>Upgrade Now</button>
            </div>
            <button className="close-btn" onClick={hideAlert}>×</button>
          </div>
            ) : (
              <>       
      {loading && <p>Loading course options...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && courses.length > 0 && (
        <div className="form-group">
          <label>Select a Course:</label>
          <select value={selectedCourseID} onChange={handleCourseChange}>
            {courses.map((course) => (
              <option key={course.courseID} value={course.courseID}>
                {course.courseName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Placeholder for the future analysis trigger */}
      <button
        disabled={!selectedCourseID}
        onClick={handleAnalyzeClick}
        >
        Analyze My Game
        </button>
        {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Loading coaching tips…</p>
            </div>
          )}
        {coachingTips && (
          <div className="coaching-tips">
            <h3>Coaching tips from analysis of your last 10 rounds:</h3>
            <p>{coachingTips}</p>
          </div>
        )}
        </>
      )}
    </div>
    </>
  );
};

export default Coaching;
