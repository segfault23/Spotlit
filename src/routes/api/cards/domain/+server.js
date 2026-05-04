import { json } from '@sveltejs/kit';
import { listDomains } from '$lib/server/content';

export async function GET({ url }) {
  const domainsParam = url.searchParams.get('domains') ?? '';
  const maxLevel = Math.max(1, Math.min(10, parseInt(url.searchParams.get('maxLevel') ?? '10', 10)));

  const requestedDomains = domainsParam.split(',').map(s => s.trim()).filter(Boolean);
  const allCards = await listDomains();

  const filtered = allCards.filter(card =>
    card.level <= maxLevel &&
    (requestedDomains.length === 0 || requestedDomains.includes(card.domain))
  );

  return json(filtered);
}
