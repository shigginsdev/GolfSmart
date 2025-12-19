import React, { useState } from "react";

export default function UseGpsButton() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true, // important for golf distances
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div>
      <button onClick={getLocation} disabled={loading}>
        {loading ? "Getting location..." : "Mark current location"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {location && (
        <div style={{ marginTop: "10px" }}>
          <div>Lat: {location.latitude.toFixed(6)}</div>
          <div>Lng: {location.longitude.toFixed(6)}</div>
          <div>Accuracy: ±{Math.round(location.accuracy)} meters</div>
        </div>
      )}
    </div>
  );
}