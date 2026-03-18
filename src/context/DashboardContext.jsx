import { createContext, useCallback, useContext, useMemo, useRef } from 'react'; // HUTTLE AI: cache fix
import { safeReadJson, safeWriteJson } from '../utils/storageHelpers'; // HUTTLE AI: cache fix
import { getDashboardGeneratedDate } from '../services/dashboardCacheService'; // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
export const DashboardContext = createContext(null); // HUTTLE AI: cache fix
const DASHBOARD_SESSION_VERSION = 'v1'; // HUTTLE AI: cache fix
const DASHBOARD_SESSION_PREFIX = `dashboard-cache:${DASHBOARD_SESSION_VERSION}`; // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
function buildDashboardStorageKey(userId) { // HUTTLE AI: cache fix
  return `${DASHBOARD_SESSION_PREFIX}:${userId}`; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
function normalizeDashboardSnapshot(snapshot, generatedDate) { // HUTTLE AI: cache fix
  if (!snapshot || typeof snapshot !== 'object') return null; // HUTTLE AI: cache fix
  if (snapshot.generatedDate !== generatedDate) return null; // HUTTLE AI: cache fix
  if (!snapshot.data || typeof snapshot.data !== 'object') return null; // HUTTLE AI: cache fix
  return snapshot; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
export function DashboardProvider({ children }) { // HUTTLE AI: cache fix
  const dashboardSnapshotsRef = useRef({}); // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
  const getDashboardSnapshot = useCallback((userId, generatedDate = getDashboardGeneratedDate()) => { // HUTTLE AI: cache fix
    if (!userId) return null; // HUTTLE AI: cache fix
    return normalizeDashboardSnapshot(dashboardSnapshotsRef.current[userId], generatedDate); // HUTTLE AI: cache fix
  }, []); // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
  const loadSessionDashboardSnapshot = useCallback((userId, generatedDate = getDashboardGeneratedDate()) => { // HUTTLE AI: cache fix
    if (!userId) return null; // HUTTLE AI: cache fix
    const snapshot = safeReadJson(sessionStorage, buildDashboardStorageKey(userId), null); // HUTTLE AI: cache fix
    return normalizeDashboardSnapshot(snapshot, generatedDate); // HUTTLE AI: cache fix
  }, []); // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
  const setDashboardSnapshot = useCallback((userId, snapshot) => { // HUTTLE AI: cache fix
    if (!userId || !snapshot?.generatedDate || !snapshot?.data) return false; // HUTTLE AI: cache fix
    dashboardSnapshotsRef.current[userId] = snapshot; // HUTTLE AI: cache fix
    return safeWriteJson(sessionStorage, buildDashboardStorageKey(userId), snapshot, { maxBytes: 500_000 }); // HUTTLE AI: cache fix
  }, []); // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
  const clearDashboardSnapshot = useCallback((userId) => { // HUTTLE AI: cache fix
    if (!userId) return; // HUTTLE AI: cache fix
    delete dashboardSnapshotsRef.current[userId]; // HUTTLE AI: cache fix
    try { // HUTTLE AI: cache fix
      sessionStorage.removeItem(buildDashboardStorageKey(userId)); // HUTTLE AI: cache fix
    } catch (error) { // HUTTLE AI: cache fix
      console.warn('[DashboardContext] Failed to clear session snapshot:', error); // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix
  }, []); // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
  const value = useMemo(() => ({ // HUTTLE AI: cache fix
    getDashboardSnapshot, // HUTTLE AI: cache fix
    loadSessionDashboardSnapshot, // HUTTLE AI: cache fix
    setDashboardSnapshot, // HUTTLE AI: cache fix
    clearDashboardSnapshot, // HUTTLE AI: cache fix
  }), [clearDashboardSnapshot, getDashboardSnapshot, loadSessionDashboardSnapshot, setDashboardSnapshot]); // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix
 // HUTTLE AI: cache fix
export function useDashboardCache() { // HUTTLE AI: cache fix
  const context = useContext(DashboardContext); // HUTTLE AI: cache fix
  if (!context) { // HUTTLE AI: cache fix
    throw new Error('useDashboardCache must be used within a DashboardProvider'); // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix
  return context; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix
