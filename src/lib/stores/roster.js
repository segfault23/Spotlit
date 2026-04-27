import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { user } from './user.js';

const initial = browser ? JSON.parse(localStorage.getItem('dh_roster') || '[]') : [];
export const roster = writable(initial);

let syncTimer;

if (browser) {
  roster.subscribe((value) => {
    const currentUser = get(user);
    if (currentUser) {
      // Debounce server sync so rapid edits don't fire a request per keystroke
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        fetch('/api/roster', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characters: value }),
        });
      }, 800);
    } else {
      localStorage.setItem('dh_roster', JSON.stringify(value));
    }
  });
}

// Called by +layout.svelte when user logs in; replaces local roster with server copy.
export async function loadRosterFromServer() {
  const res = await fetch('/api/roster');
  if (!res.ok) return;
  const { characters } = await res.json();
  roster.set(characters);
}
