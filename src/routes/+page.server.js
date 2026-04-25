import { listFeatures, listCreatures } from '$lib/server/content.js';

// Catalogue lives in DynamoDB, so this route can't be prerendered at build
// time — it must run in Lambda.
export const prerender = false;

// Server-side load: runs in Lambda for the initial SSR render and on client
// navigations (as a /__data.json fetch). Pulls the catalogue from DynamoDB.
export async function load() {
  const [features, creatures] = await Promise.all([
    listFeatures(),
    listCreatures(),
  ]);

  // Reshape into the lookup forms the existing components expect:
  //   featuresByName  — same role as the old FEATURES dict (keyed by display name)
  //   presetsByName   — same role as the old PRESETS dict (keyed by display name)
  // Components keep working with minimal changes; they just receive these
  // via page data instead of importing from $lib/data.js.
  const featuresByName = Object.fromEntries(
    features.map(f => [f.name, { t: f.type, cost: f.cost, tx: f.body, meta: f.meta }])
  );
  const presetsByName = Object.fromEntries(
    creatures.map(c => [c.name, {
      type: c.type, tier: c.tier, diff: c.diff, hp: c.hp, str: c.str,
      atk: c.atk, thresh: c.thresh, dmg: c.dmg, atkName: c.atkName,
      feats: c.feats,
    }])
  );

  return { featuresByName, presetsByName };
}
