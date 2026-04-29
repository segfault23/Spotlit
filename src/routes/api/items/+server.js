import { error, json } from '@sveltejs/kit';
import { listItems } from '$lib/server/content.js';
import { listCustomItems, putCustomItem } from '$lib/server/user.js';

// GET /api/items?q=<search>&type=<type>
// Returns merged catalog + custom items, filtered by optional query/type
export async function GET({ locals, url }) {
  if (!locals.user) error(401, 'Unauthorized');
  const q = url.searchParams.get('q')?.toLowerCase() ?? '';
  const type = url.searchParams.get('type') ?? '';

  const [catalogItems, customItems] = await Promise.all([
    listItems(),
    listCustomItems(locals.user.sub),
  ]);

  const all = [
    ...catalogItems.map((i) => ({ ...i, custom: false })),
    ...customItems.map((i) => ({ ...i, custom: true })),
  ];

  const filtered = all.filter((i) => {
    if (type && i.type !== type) return false;
    if (q && !i.name.toLowerCase().includes(q) && !(i.description ?? '').toLowerCase().includes(q)) return false;
    return true;
  });

  filtered.sort((a, b) => a.name.localeCompare(b.name));
  return json({ items: filtered });
}

export async function POST({ locals, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const data = await request.json();
  if (!data.name) error(400, 'name required');
  const slug = await putCustomItem(locals.user.sub, data);
  return json({ slug }, { status: 201 });
}
