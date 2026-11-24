// One vocabulary for every format: the four label levels, their colour, and a SHAPE so colour is never the only cue.
export const LEVELS = ['documented', 'alleged', 'none', 'unsupported'];
export const COLOR = { documented: '#d8402a', alleged: '#e8a33a', none: '#3fb6a8', unsupported: '#8a7f70' };
export const WORDS = {
  documented: 'Documented ties',
  alleged: 'Alleged ties',
  none: 'Nothing found',
  unsupported: 'Sources could not settle it',
};
export const SHAPE = { documented: 'diamond', alleged: 'triangle', none: 'circle', unsupported: 'square' };
/** SVG path for a level's marker, centred on 0,0 and sized by radius r. */
export function symbolPath(level, r) {
  const s = SHAPE[level] || 'circle';
  if (s === 'diamond') return `M0 ${-r * 1.25}L${r * 1.25} 0L0 ${r * 1.25}L${-r * 1.25} 0Z`;
  if (s === 'triangle') return `M0 ${-r * 1.2}L${r * 1.15} ${r * .85}L${-r * 1.15} ${r * .85}Z`;
  if (s === 'square') return `M${-r * .95} ${-r * .95}H${r * .95}V${r * .95}H${-r * .95}Z`;
  return `M${-r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}
export const statusText = c => (c.closed == null ? `since ${c.opened}` : `${c.opened} to ${c.closed}`);
export const isOpen = (c, y) => c.opened <= y && (c.closed == null || c.closed > y);
