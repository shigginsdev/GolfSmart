import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';

const Coaching = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseID, setSelectedCourseID] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourseName, setSelectedCourseName] = useState('');

  // ✅ API Endpoints
  const userCoursesApiEndpoint = "https://8ix76i3knc.execute-api.us-east-2.amazonaws.com/DEV";
  const analyzeCoursePerformance = "https://vucmlioeb2.execute-api.us-east-2.amazonaws.com/DEV";
  

  useEffect(() => {
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
        }
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading courses:', err);
        setError('Unable to load courses');
        setLoading(false);
      }
    };

    fetchUserCourses();
  }, []);

  const handleCourseChange = (e) => {
    // setSelectedCourseID(e.target.value);
    const selectedOption = courses.find(course => course.courseID === e.target.value);
    setSelectedCourseID(selectedOption.courseID);
    setSelectedCourseName(selectedOption.courseName);
  };

  const handleAnalyzeClick = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens?.idTokenToken?.toString();
  
    const payload = {
      courseID: selectedCourseID,
      courseName: selectedCourseName,
    };
    
  
    try {
      const response = await fetch(analyzeCoursePerformance, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        //   "Authorization": `Bearer ${token}`,
        body: JSON.stringify(payload),
        },        
      });

      console.log(response.stringify)
  
      if (!response.ok) {
        throw new Error('Failed to analyze course');
      }
  
      const data = await response.json();
      console.log("✅ AI Coaching Response:", data);
  
      // TODO: setState to show the AI response if you want
    } catch (err) {
      console.error('❌ Error analyzing course:', err);
      setError('Unable to analyze course');
    }
  };
  

  return (
    <div className="coaching-container">
      <h2>AI Coaching</h2>

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
    </div>
  );
};

export default Coaching;
