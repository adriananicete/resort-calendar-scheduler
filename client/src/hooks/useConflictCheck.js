import { useState, useEffect, useRef } from 'react';
import { checkConflict } from '../services/api';

/**
 * Debounced conflict check hook.
 * Fires a GET /api/bookings/conflict-check whenever roomUnit, checkIn,
 * or checkOut changes. Returns { hasConflict, conflicts, checking }.
 */
export function useConflictCheck({ roomUnit, checkIn, checkOut, excludeId }) {
  const [hasConflict, setHasConflict] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!roomUnit || !checkIn || !checkOut) {
      setHasConflict(false);
      setConflicts([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        setChecking(true);
        const params = {
          roomUnit,
          checkIn: checkIn instanceof Date ? checkIn.toISOString() : checkIn,
          checkOut: checkOut instanceof Date ? checkOut.toISOString() : checkOut,
        };
        if (excludeId) params.excludeId = excludeId;

        const result = await checkConflict(params);
        setHasConflict(result.hasConflict);
        setConflicts(result.conflicts || []);
      } catch {
        // Silently fail — form submit will catch real errors
        setHasConflict(false);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timerRef.current);
  }, [roomUnit, checkIn, checkOut, excludeId]);

  return { hasConflict, conflicts, checking };
}
