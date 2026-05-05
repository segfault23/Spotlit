import { error } from '@sveltejs/kit';
import { getCharacter } from '$lib/server/user.js';
import { listDomains, listAncestries, listCommunities, listSubclasses } from '$lib/server/content.js';

export const prerender = false;

export async function load({ locals, params }) {
  const charSk = Buffer.from(params.id, 'base64url').toString('utf8');
  const character = await getCharacter(locals.user.sub, charSk);
  if (!character) error(404, 'Character not found');

  // Load card catalogue data in parallel; return empty arrays gracefully if not yet seeded
  const [allDomains, allAncestries, allCommunities, allSubclasses] = await Promise.all([
    listDomains().catch(() => []),
    listAncestries().catch(() => []),
    listCommunities().catch(() => []),
    listSubclasses().catch(() => []),
  ]);

  const loadoutNames = new Set(character.domainLoadout ?? []);
  const loadoutCards = allDomains.filter(c => loadoutNames.has(c.name));

  const ancestryData  = allAncestries.find(a => a.name === character.ancestry)  ?? null;
  const ancestry2Data = allAncestries.find(a => a.name === character.ancestry2) ?? null;
  const communityData = allCommunities.find(c => c.name === character.community) ?? null;

  const subclassTiers = allSubclasses.filter(
    s => s.class === character.class && s.subclass === character.subclass
  );

  return { character, loadoutCards, ancestryData, ancestry2Data, communityData, subclassTiers };
}
