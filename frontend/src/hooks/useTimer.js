import { useState, useEffect } from 'react';

export function useTimer(initialSeconds = 0, onExpire = null) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      if (onExpire) onExpire();
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft, onExpire]);

  const start = (seconds) => {
    if (seconds !== undefined) setSecondsLeft(seconds);
    setIsActive(true);
  };

  const pause = () => setIsActive(false);
  const reset = (seconds = initialSeconds) => {
    setIsActive(false);
    setSecondsLeft(seconds);
  };

  return {
    secondsLeft,
    isActive,
    start,
    pause,
    reset,
  };
}

export default useTimer;
