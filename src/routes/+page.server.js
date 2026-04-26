// The catalogue (features, presets, custom items) is loaded by +layout.server.js.
// This route still has to opt out of prerendering — Lambda runs SSR for every request.
export const prerender = false;
