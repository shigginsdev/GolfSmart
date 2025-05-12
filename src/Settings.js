import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';
import debounce from 'lodash.debounce';
import './Settings.css';

const Settings = ({ user }) => {
  //const apiEndpoint = "https://s3crwhjhf4.execute-api.us-east-2.amazonaws.com/DEV";
  const apiEndpoint = "https://exn14bxwk0.execute-api.us-east-2.amazonaws.com/DEV/";
  const courseSearchApi = "https://c8h20trzmh.execute-api.us-east-2.amazonaws.com/DEV";
  const checkCreateCourseAPI = "https://8ryxv7ybo4.execute-api.us-east-2.amazonaws.com/DEV";

  // initialize the user profile data when the component loads to set the state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.attributes?.email || '',
    homeCourseName: '',
    homeCourseID: '',
    scoringType: 'Normal Scoring',
    teeBox: 'Championship Back',
  });

  const [courseSuggestions, setCourseSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  //gets the logged in user's profile information from the API that calls the DynamoDB and prepopulates the form. If the user doesn't exist, that is ok. 
  // The user should complete the form. The code runs every time there is a change to the Cognito user object which should only be one time.
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const email = session.tokens?.idToken?.payload?.email;
        console.log ("📧 User email:", email);

  
        if (!token) {
          console.warn("🔒 No token found. Probably signed out.");
          return;
        }
  
        const response = await fetch(apiEndpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json(); 
  
        if (response.status === 404) {
          // User not found in sg_users – just prefill email
          setFormData({
            firstName: '',
            lastName: '',
            email: email || '',
            homeCourseName: '',
            homeCourseID: '',
            scoringType: 'Normal Scoring',
            teeBox: 'Championship Back',
          });

          console.log("📧 Prepopulating with email:", user?.attributes?.email);

          return;
        }
  
        if (!response.ok) {
          throw new Error(`Failed to fetch user profile. Status: ${response.status}`);
        }
  
        // const userData = await response.json();  
        const profile = Array.isArray(result) ? result[0] : result;
        console.log(profile);

        if (profile) {
          setFormData({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            email: profile.email || user?.attributes?.email || '',
            homeCourseName: profile.homeCourseName || '',
            homeCourseID: profile.homeCourseID || '',
            scoringType: profile.scoringType || 'Normal Scoring',
            teeBox: profile.teeBox || 'Championship Back',
          });
          console.log("✅ User profile loaded and prepopulated.");
        } else {
          throw new Error("Profile data missing or in unexpected format.");
        }
  
      } catch (error) {

        if (error.name === "NotAuthorizedException") {
          console.warn("🔒 User is signed out. Skipping profile fetch.");
          return;
        }

        console.error("❌ Error loading user profile:", error);
        alert("Unable to load profile. Please try again or contact support.");
      }
    };
  
    if (user) {
      fetchUserProfile();
    }
  }, [user]);
    

  const handleCourseSelect = async (course) => {
    const courseName = `${course.club_name} (${course.location.city || ''}, ${course.location.state || ''})`;
    const uuid = await checkOrCreateCourse(course);

    if (!uuid) {
      alert("Unable to set course—please try again.");      
    }

    console.log("✅ Course selected:", courseName, "with UUID:", uuid);

    setFormData(prev => ({
      ...prev,
      homeCourseName: courseName,
      homeCourseID: uuid, // save ID too
    }));
    setCourseSuggestions([]);
    setShowSuggestions(false);

  };

  const checkOrCreateCourse = async (courseData) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
  
      if (!token) {
        console.error("❌ No token found for checkCreateCourse API.");;
      }
  
      // 🔁 Transform the incoming courseData from courseSearchAPI
      const payload = {
        externalCourseID: courseData.id.toString(), // DynamoDB requires string keys
        courseName: courseData.club_name
      };
  
      const response = await fetch(checkCreateCourseAPI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error(`❌ checkCreateCourse failed with status ${response.status}`);
      }
  
      const result = await response.json();
      console.log("✅ checkCreateCourse API response:", result);
      return result.uuid; // ✅ RETURN the UUID here

    } catch (error) {
      console.error("❌ Error calling checkCreateCourse:", error);
    }
  };
  
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'homeCourseName') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        homeCourseID: '', // clear when typing
      }));
      debouncedSearch(value);
    }
  };

  const searchCourses = async (query) => {
    if (!query || query.length < 2) return;

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        console.error("❌ No token found for authenticated request");
        return;
      }

      const response = await fetch(
        `${courseSearchApi}?search_query=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`❌ Search API failed with ${response.status}`);
      }

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
        homeCourseName: formData.homeCourseName,
        homeCourseID: formData.homeCourseID,
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
            name="homeCourseName"
            value={formData.homeCourseName}
            onChange={handleChange}
            autoComplete="off"
            onFocus={() => setShowSuggestions(courseSuggestions.length > 0)}
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
