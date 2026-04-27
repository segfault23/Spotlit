import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { THEMES } from '$lib/data.js';

const initial = browser ? localStorage.getItem('dh_theme') || '' : '';
export const theme = writable(initial);

if (browser) {
  theme.subscribe((value) => {
    localStorage.setItem('dh_theme', value);
    document.body.className = value ? `theme-${value}` : '';
  });
}

export { THEMES };
