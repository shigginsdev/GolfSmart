import { useState, useEffect } from "react";

export function useFlags(env = "dev") {
  const [flags, setFlags] = useState(null);
  console.log("useFlags", env);

  useEffect(() => {

    try {
        const response = await fetch('https://yy8ulia107.execute-api.us-east-2.amazonaws.com/DEV/flags?env=${env}', {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        const data = await response.json();
      setFlags
    }
      catch (err) {
        console.error("Error fetching user tier:", err);
      }
  }, [env]);

  return flags;
}
