import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

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

// Cache for team scores
let cachedScores: TeamScores = { colla: 0, camba: 0, lastUpdated: 0 };
const CACHE_TTL = 5000; // 5 seconds

/**
 * Hook to fetch and track team battle scores
 * Refreshes automatically every 5 seconds
 */
export function useTeamBattle(): UseTeamBattleReturn {
  const [scores, setScores] = useState<TeamScores>(cachedScores);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    // Use cache if fresh enough
    const now = Date.now();
    if (now - cachedScores.lastUpdated < CACHE_TTL) {
      setScores(cachedScores);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/v1/leaderboard/teams`);

      if (!response.ok) {
        throw new Error('Failed to fetch team scores');
      }

      const data = await response.json();

      if (data.success && data.data?.teams) {
        const teams = data.data.teams as Array<{
          team: string;
          totalScore: number;
          playerCount: number;
        }>;

        const collaTeam = teams.find(t => t.team === 'colla');
        const cambaTeam = teams.find(t => t.team === 'camba');

        const newScores: TeamScores = {
          colla: collaTeam?.totalScore || 0,
          camba: cambaTeam?.totalScore || 0,
          lastUpdated: now,
        };

        cachedScores = newScores;
        setScores(newScores);
      }
    } catch (err) {
      console.error('[useTeamBattle] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Keep last cached scores on error, don't use mocks
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchScores();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchScores, 5000);

    return () => clearInterval(interval);
  }, [fetchScores]);

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
        // Use a free geolocation API
        const response = await fetch('https://ipapi.co/json/');
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
        console.error('[useRegionDetection] Error:', err);
        setRegion('EXTRANJERO');
      } finally {
        setIsDetecting(false);
      }
    };

    detectRegion();
  }, []);

  return { region, country, isDetecting };
}
