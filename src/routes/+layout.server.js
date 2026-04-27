import { listFeatures, listCreatures } from '$lib/server/content.js';
import { listCustomFeatures, listCustomCreatures } from '$lib/server/user.js';

// Load the catalogue (pre-made + user's custom items) at the layout level so
// every page — including /profile — gets it. Custom items shadow pre-made
// items on name collision, giving users an "override" path.
export async function load({ locals }) {
  const [features, creatures] = await Promise.all([listFeatures(), listCreatures()]);

  let customFeatures = [];
  let customCreatures = [];
  if (locals.user) {
    [customFeatures, customCreatures] = await Promise.all([
      listCustomFeatures(locals.user.sub),
      listCustomCreatures(locals.user.sub),
    ]);
  }

  // featuresByName: keyed by display name. Pre-made first, custom overrides.
  const featuresByName = {};
  for (const f of features) {
    featuresByName[f.name] = { t: f.type, cost: f.cost, tx: f.body, meta: f.meta };
  }
  for (const f of customFeatures) {
    featuresByName[f.name] = { t: f.type, cost: f.cost, tx: f.body, custom: true, slug: f.slug };
  }

  // presetsByName: pre-made + custom adversaries merged.
  const presetsByName = {};
  for (const c of creatures) {
    presetsByName[c.name] = {
      type: c.type,
      tier: c.tier,
      diff: c.diff,
      hp: c.hp,
      str: c.str,
      atk: c.atk,
      thresh: c.thresh,
      dmg: c.dmg,
      atkName: c.atkName,
      feats: c.feats,
    };
  }
  for (const c of customCreatures) {
    presetsByName[c.name] = {
      type: c.type,
      tier: c.tier,
      diff: c.diff,
      hp: c.maxHP ?? c.hp,
      str: c.maxStr ?? c.str,
      atk: c.atk,
      thresh: c.thresh,
      dmg: c.dmg,
      atkName: c.atkName,
      feats: c.feats ?? [],
      custom: true,
      slug: c.slug,
    };
  }

  return {
    user: locals.user ?? null,
    featuresByName,
    presetsByName,
  };
}
