import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const initial = browser ? JSON.parse(localStorage.getItem('dh_roster') || '[]') : [];
export const roster = writable(initial);

if (browser) {
  roster.subscribe(value => {
    localStorage.setItem('dh_roster', JSON.stringify(value));
  });
}
