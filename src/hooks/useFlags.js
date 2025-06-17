import { useState, useEffect } from "react";
import { fetchAuthSession } from '@aws-amplify/auth';

export function useFlags(env = "dev") {
  const [flags, setFlags] = useState(null);

  useEffect(() => {
    // define an async fn so we can await inside
    async function fetchFlags() {
      try {

        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();        

        if (!token) return;

        const res = await fetch(        
        `https://yy8ulia107.execute-api.us-east-2.amazonaws.com/DEV/?env=${env}`,
          {
            method: "GET",            
            headers: {                
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,  
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to load flags (${res.status})`);
        }

        const data = await res.json();        
        setFlags(data);  // ← actually set your state
      } catch (err) {
        console.error("Error fetching flags:", err);
      }
    }

    fetchFlags();
  }, [env]);

  return flags;
}
