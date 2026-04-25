// Holds the feature + creature catalogue loaded from DynamoDB via
// +page.server.js. Components import these stores instead of the old
// FEATURES/PRESETS exports from $lib/data.js.

import { writable } from 'svelte/store';

// Map keyed by display name → { t, cost, tx, meta }. Same shape components
// previously consumed from `data.js`, so existing rendering code keeps working.
export const featuresByName = writable({});

// Map keyed by display name → preset stat object. Identical shape to the
// previous PRESETS dict.
export const presetsByName  = writable({});
