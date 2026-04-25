// Static client-side data only. Feature and creature catalogues live in
// DynamoDB and are loaded via $lib/server/content.js + +page.server.js.

export const THEMES = {
  '':         { name: 'Drylands',        swatches: ['#e85f35', '#1f1614', '#ff7a5a', '#b8845a'] },
  'sunset':   { name: 'Sunset Over Dunes', swatches: ['#d97e3a', '#1a1410', '#ff6a4a', '#8a5a9a'] },
  'forest':   { name: 'Midnight Forest', swatches: ['#5aafdd', '#0f1518', '#d64040', '#8a8acc'] },
  'light':    { name: 'Light Desert',    swatches: ['#c94d2c', '#f9f3ea', '#d84a40', '#8a5a9a'] },
  'infernal': { name: 'Infernal',        swatches: ['#ff6b20', '#2a1008', '#ff6b6b', '#c85a7a'] },
  'frost':    { name: 'Frostborn',       swatches: ['#6ad0ff', '#0a1620', '#d64040', '#9a88cc'] },
  'royal':    { name: 'Royal Purple',    swatches: ['#b080ff', '#141025', '#d64040', '#a860d0'] },
  'ocean':    { name: 'Ocean Deep',      swatches: ['#2abaff', '#0a1428', '#d64040', '#7a8ab0'] },
  'autumn':   { name: 'Autumn Rustic',   swatches: ['#d8880a', '#261608', '#d86050', '#9a6030'] },
  'cyber':    { name: 'Cyberpunk',       swatches: ['#ff00ff', '#141422', '#ff1a6a', '#9900ff'] },
  'eldritch': { name: 'Eldritch',        swatches: ['#aa66ff', '#12080f', '#d64444', '#8a40aa'] },
};
