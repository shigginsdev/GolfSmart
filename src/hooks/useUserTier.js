import { useState, useEffect } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';

/**
 * Custom hook to fetch and manage the user's subscription tier and upload count.
 * Expects the user profile endpoint to return a JSON envelope:
 * { status: 'success' | 'error', data: { tier, uploadCount, ... }, message? }
 */
export function useUserTier() {
  const [tier, setTier] = useState(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTier = async () => {
      try {
        // Fetch Cognito session token
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) throw new Error("No auth token found");

        // Call the same profile endpoint used by App.js
        const response = await fetch(
          "https://s3crwhjhf4.execute-api.us-east-2.amazonaws.com/DEV/",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Profile fetch failed: ${response.status}`);
        }

        const body = await response.json();
        console.log("🪵 Profile API response (envelope):", body);

        // Unwrap the envelope
        if (body.status === 'success' && body.data) {
          const user = body.data;
          setTier(user.tier || 'free');
          setUploadCount(user.uploadCount ?? 0);
        } else if (body.status === 'error') {
          throw new Error(body.message || 'Error fetching user profile');
        } else {
          throw new Error('Unexpected profile response format');
        }
      } catch (err) {
        console.error("Error fetching user tier:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTier();
  }, []);

  return {
    tier,
    uploadCount,
    isFreeTier: tier === 'free',
    isUploadLimitReached: tier === 'free' && uploadCount >= 3,
    loading,
    error,
  };
}
