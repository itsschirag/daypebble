export const GAMES = { 'sumtrail': 'time', 'even-split': 'time', 'hue-match': 'percent' };
export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...extra } });

// Accept only today's puzzle (+/- 1 day for time zones) so the board stays fair.
export function dayIsOpen(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const t = Date.parse(`${day}T12:00:00Z`);
  return Math.abs(Date.now() - t) <= 38 * 3600 * 1000;
}
