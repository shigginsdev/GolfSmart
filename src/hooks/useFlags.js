import { useState, useEffect } from "react";

export function useFlags(env = "dev") {
  const [flags, setFlags] = useState(null);

  useEffect(() => {
    fetch(`https://yy8ulia107.execute-api.us-east-2.amazonaws.com/DEV/flags?env=${env}`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(setFlags)
      .catch(err => {
        console.error("Failed to load flags", err);
      });
  }, [env]);

  return flags;
}
