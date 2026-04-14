const STORAGE_KEY = "limitless_edge_profiles_v1_3";

export function loadProfiles() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [
      {
        id: "default",
        name: "Default Player",
        snapshot: null
      }
    ];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length
      ? parsed
      : [{ id: "default", name: "Default Player", snapshot: null }];
  } catch (err) {
    console.error("Profile load failed:", err);
    return [{ id: "default", name: "Default Player", snapshot: null }];
  }
}

export function saveProfiles(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function createProfile(name) {
  return {
    id: "profile_" + Date.now(),
    name,
    snapshot: null
  };
}

export function cloneStateSnapshot(state) {
  return JSON.parse(JSON.stringify(state));
}