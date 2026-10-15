const DISCOVERED_KEY = 'arcade_discovered';

export function hasDiscoveredArcade() {
  return (
    localStorage.getItem(DISCOVERED_KEY) === 'true' ||
    sessionStorage.getItem('arcade_unlocked') === 'true' ||
    Number(localStorage.getItem('arcade_attempts')) > 0
  );
}

export function discoverArcade() {
  localStorage.setItem(DISCOVERED_KEY, 'true');
}
