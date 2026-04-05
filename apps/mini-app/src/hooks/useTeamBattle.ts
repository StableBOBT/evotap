import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://evotap-api.andeanlabs-58f.workers.dev';

interface TeamScores {
  colla: number;
  camba: number;
  lastUpdated: number;
}

interface UseTeamBattleReturn {
  scores: TeamScores;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CACHE_TTL = 5000; // 5 seconds

/**
 * Hook to fetch and track team battle scores
 * Refreshes automatically every 5 seconds
 */
export function useTeamBattle(): UseTeamBattleReturn {
  // Fix: Use ref instead of module-level variable to avoid shared state between hook instances
  const cachedScoresRef = useRef<TeamScores>({ colla: 0, camba: 0, lastUpdated: 0 });
  const [scores, setScores] = useState<TeamScores>(cachedScoresRef.current);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    // Use cache if fresh enough
    const now = Date.now();
    if (now - cachedScoresRef.current.lastUpdated < CACHE_TTL) {
      console.log('[useTeamBattle] Using cached scores:', cachedScoresRef.current);
      setScores(cachedScoresRef.current);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use new seasons/battle endpoint (no names, just totals)
      const url = `${API_URL}/api/v1/seasons/battle`;
      console.log('[useTeamBattle] Fetching scores from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch team scores');
      }

      const data = await response.json();
      console.log('[useTeamBattle] Response:', data);

      if (data.success && data.data) {
        const newScores: TeamScores = {
          colla: data.data.colla || 0,
          camba: data.data.camba || 0,
          lastUpdated: now,
        };

        console.log('[useTeamBattle] Updated scores:', newScores);
        cachedScoresRef.current = newScores;
        setScores(newScores);
      } else {
        console.warn('[useTeamBattle] Invalid response format:', data);
      }
    } catch (err) {
      console.error('[useTeamBattle] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Keep last cached scores on error, don't use mocks
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps - stable function

  // Fetch on mount - removed fetchScores from deps to prevent loop
  useEffect(() => {
    fetchScores();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => fetchScores(), 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only mount/unmount - fetchScores is stable

  return {
    scores,
    isLoading,
    error,
    refresh: fetchScores,
  };
}

/**
 * Hook to detect user's region automatically
 * Uses IP geolocation API
 */
export function useRegionDetection() {
  const [region, setRegion] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectRegion = async () => {
      try {
        // Use a free geolocation API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch('https://ipapi.co/json/', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        // Set country
        setCountry(data.country_name || data.country || null);

        // Check if in Bolivia
        if (data.country_code === 'BO' || data.country === 'Bolivia') {
          // Map Bolivia regions to our departments
          const regionMap: Record<string, string> = {
            'La Paz': 'LA_PAZ',
            'La Paz Department': 'LA_PAZ',
            'Oruro': 'ORURO',
            'Oruro Department': 'ORURO',
            'Potosi': 'POTOSI',
            'Potosí': 'POTOSI',
            'Potosí Department': 'POTOSI',
            'Cochabamba': 'COCHABAMBA',
            'Cochabamba Department': 'COCHABAMBA',
            'Chuquisaca': 'CHUQUISACA',
            'Chuquisaca Department': 'CHUQUISACA',
            'Tarija': 'TARIJA',
            'Tarija Department': 'TARIJA',
            'Santa Cruz': 'SANTA_CRUZ',
            'Santa Cruz Department': 'SANTA_CRUZ',
            'Beni': 'BENI',
            'Beni Department': 'BENI',
            'El Beni': 'BENI',
            'Pando': 'PANDO',
            'Pando Department': 'PANDO',
          };

          const detectedDept = regionMap[data.region] || 'BOLIVIA';
          setRegion(detectedDept);
        } else {
          // Outside Bolivia
          setRegion('EXTRANJERO');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn('[useRegionDetection] Request timeout, using fallback');
        } else {
          console.error('[useRegionDetection] Error:', err);
        }
        setRegion('EXTRANJERO');
      } finally {
        setIsDetecting(false);
      }
    };

    detectRegion();
  }, []);

  return { region, country, isDetecting };
}
