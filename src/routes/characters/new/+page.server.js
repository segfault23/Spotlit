import { listAncestries, listCommunities, listSubclasses, listDomains } from '$lib/server/content';

export const prerender = false;

export async function load() {
  const [ancestries, communities, subclasses, domains] = await Promise.all([
    listAncestries(),
    listCommunities(),
    listSubclasses(),
    listDomains(),
  ]);
  return { ancestries, communities, subclasses, domains };
}