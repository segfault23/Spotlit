// Static client-side data only. Feature and creature catalogues live in
// DynamoDB and are loaded via $lib/server/content.js + +page.server.js.

export const THEMES = {
  '':         { name: 'Drylands',        swatches: ['#c89830', '#1a1408', '#d64040', '#7a3080'] },
  'forest':   { name: 'Midnight Forest', swatches: ['#4a9fd8', '#0f1620', '#d64040', '#7a5ab0'] },
  'infernal': { name: 'Infernal',        swatches: ['#ff6b20', '#2a1008', '#ff6b6b', '#c85a7a'] },
  'frost':    { name: 'Frostborn',       swatches: ['#6ac8ff', '#0d1a28', '#d64040', '#8a7ab0'] },
  'royal':    { name: 'Royal Purple',    swatches: ['#b080ff', '#141025', '#d64040', '#a860d0'] },
  'light':    { name: 'Light Mode',      swatches: ['#c88830', '#ffffff', '#e04848', '#b070d8'] },
  'ocean':    { name: 'Ocean Deep',      swatches: ['#2abaff', '#0a1428', '#d64040', '#7a8ab0'] },
  'autumn':   { name: 'Autumn Rustic',   swatches: ['#d8880a', '#261608', '#d86050', '#9a6030'] },
  'cyber':    { name: 'Cyberpunk',       swatches: ['#ff00ff', '#141422', '#ff1a6a', '#9900ff'] },
  'eldritch': { name: 'Eldritch',        swatches: ['#aa66ff', '#12080f', '#d64444', '#8a40aa'] },
};
