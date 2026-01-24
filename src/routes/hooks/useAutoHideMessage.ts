/**
 * Auto-Hide Message Hook
 *
 * Manages messages that automatically hide after a duration.
 */

import { useState, useEffect } from "react";

const MESSAGE_TIMEOUT_MS = 3000;

export function useAutoHideMessage(duration: number = MESSAGE_TIMEOUT_MS) {
  const [message, setMessageInternal] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessageInternal(undefined);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration]);

  const setMessage = (msg: string | undefined) => {
    setMessageInternal(msg ?? undefined);
  };

  return { message, setMessage };
}
