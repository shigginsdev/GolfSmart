import React, { useState } from 'react';

const Settings = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    homeCourse: '',
    scoringType: '',
    leaguePreference: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Updated profile:', formData);
    alert('Profile updated successfully!');
    // Future: Send this data to your backend to update DynamoDB sg_users table
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Profile Settings</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
        <label>
          Full Name:
          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
        </label>
        <br />
        <label>
          Home Course:
          <input type="text" name="homeCourse" value={formData.homeCourse} onChange={handleChange} />
        </label>
        <br />
        <label>
          Scoring Type:
          <input type="text" name="scoringType" value={formData.scoringType} onChange={handleChange} />
        </label>
        <br />
        <label>
          League Preference:
          <input type="text" name="leaguePreference" value={formData.leaguePreference} onChange={handleChange} />
        </label>
        <br />
        <button type="submit">Save Profile</button>
      </form>
    </div>
  );
};

export default Settings;
