import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';
import debounce from 'lodash.debounce';
import './Settings.css';

const Settings = ({ user }) => {
  const apiEndpoint = "https://exn14bxwk0.execute-api.us-east-2.amazonaws.com/DEV/";
  const courseSearchApi = "https://c8h20trzmh.execute-api.us-east-2.amazonaws.com/DEV";

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.attributes?.email || '',
    homeCourse: '',
    scoringType: 'Normal Scoring',
    teeBox: 'Championship Back',
  });

  const [courseSuggestions, setCourseSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) return;

        const response = await fetch(apiEndpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch user profile");
        const userData = await response.json();

        if (userData.status === "success") {
          setFormData({
            firstName: userData.data.firstName || '',
            lastName: userData.data.lastName || '',
            email: userData.data?.email || user?.attributes?.email || '',
            homeCourse: userData.data.homeCourse || '',
            scoringType: userData.data.scoringType || 'Normal Scoring',
            teeBox: userData.data.teeBox || 'Championship Back',
          });
        }
      } catch (error) {
        console.error("❌ Error fetching profile:", error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'homeCourse') {
      debouncedSearch(value);
    }
  };

  const handleCourseSelect = (course) => {
    setFormData(prev => ({
      ...prev,
      homeCourse: `${course.club_name} (${course.location.city}, ${course.location.state})`
    }));
    setCourseSuggestions([]);
    setShowSuggestions(false);
  };

  const searchCourses = async (query) => {
    if (!query || query.length < 2) return;
    try {
      const response = await fetch(`${courseSearchApi}?search_query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setCourseSuggestions(data.courses || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("❌ Error searching courses:", error);
    }
  };

  const debouncedSearch = useCallback(debounce(searchCourses, 500), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) {
        alert("User not authenticated.");
        return;
      }

      const payload = {
        userID: user?.userId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        homeCourse: formData.homeCourse,
        scoringType: formData.scoringType,
        teeBox: formData.teeBox,
      };

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("✅ Profile Update Response:", result);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      alert("Failed to update profile.");
    }
  };

  return (
    <div className="settings-container">
      <h2>Profile Settings</h2>
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>First Name:</label>
          <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Last Name:</label>
          <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Email Address:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} disabled />
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label>Home Course:</label>
          <input
            type="text"
            name="homeCourse"
            value={formData.homeCourse}
            onChange={handleChange}
            autoComplete="off"
            onFocus={() => formData.homeCourse && setShowSuggestions(true)}
          />
          {showSuggestions && courseSuggestions.length > 0 && (
            <ul className="autocomplete-dropdown">
              {courseSuggestions.map((course) => (
                <li key={course.id} onClick={() => handleCourseSelect(course)}>
                  {course.club_name} – {course.location.city}, {course.location.state}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-group">
          <label>Scoring Type:</label>
          <select name="scoringType" value={formData.scoringType} onChange={handleChange}>
            <option value="Normal Scoring">Normal Scoring</option>
            <option value="Over/Under Scoring">Over/Under Scoring</option>
            <option value="Aggregate Over/Under Scoring">Aggregate Over/Under Scoring</option>
          </select>
        </div>

        <div className="form-group">
          <label>Tee Box:</label>
          <select name="teeBox" value={formData.teeBox} onChange={handleChange}>
            <option value="Championship Back">Championship Back</option>
            <option value="Amateur Back">Amateur Back</option>
            <option value="Front">Front</option>
            <option value="Junior">Junior</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit">Save Profile</button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
