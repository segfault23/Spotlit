import { writable } from 'svelte/store';

// Populated from +layout.server.js after hydration.
// Shape: { sub, email, name } | null
export const user = writable(null);
