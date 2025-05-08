// src/hooks/useUserTier.js
import { useState, useEffect } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';

export function useUserTier() {
    const [tier, setTier] = useState(null);
    const [uploadCount, setUploadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      const fetchTier = async () => {
        try {
          const session = await fetchAuthSession();
          const token = session.tokens?.idToken?.toString();
          if (!token) throw new Error("No token found");
  
          const response = await fetch("https://s3crwhjhf4.execute-api.us-east-2.amazonaws.com/DEV", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
  
          const raw = await response.json(); 
          
          console.log("🪵 API Response from getUserProfile:", raw.Items[0]);

          // Safely access the user data
          const items = raw?.Items;
          if (!items || items.length === 0) {
            throw new Error("User profile not found in response");
          }

          const user = raw.Items[0];          
  
          setTier(user.tier || 'free');
          setUploadCount(user.uploadCount || 0);
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
      error
    };
  }
  