import { useState, useEffect } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';

/**
 * Custom hook to fetch and manage the user's subscription tier and upload count.
 * Expects the user profile endpoint to return:
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
        // 1) Get Cognito token
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) throw new Error("No auth token found");

        // 2) Call your profile endpoint
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

        let user = null;
        if (body.status === 'success' && body.data) {
          user = body.data;
        } else if (Array.isArray(body.Items) && body.Items.length > 0) {
          user = body.Items[0];
        }

        if (!user) {
          throw new Error('Unexpected profile response structure');
        }

        // 5) Pull out tier & uploadCount
        setTier(user.tier || 'free');
        setUploadCount(user.uploadCount ?? 0);
      
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
    loading,
    error,
  };
}
