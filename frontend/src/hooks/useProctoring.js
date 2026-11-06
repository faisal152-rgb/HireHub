import { useState, useEffect, useCallback } from 'react';

export function useProctoring({ onViolation, maxViolations = 3 } = {}) {
  const [violations, setViolations] = useState(0);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setViolations((prev) => {
        const updated = prev + 1;
        if (onViolation) onViolation('TAB_SWITCH', updated);
        return updated;
      });
    }
  }, [onViolation]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    violations,
    isDisqualified: violations >= maxViolations,
    resetViolations: () => setViolations(0),
  };
}

export default useProctoring;
