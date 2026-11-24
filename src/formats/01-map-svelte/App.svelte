<script>
  import { onMount } from 'svelte';
  import { loadAll } from '../../shared/data.js';
  import { layout, W, H } from '../../shared/geo.js';
  import { LEVELS, COLOR, WORDS, symbolPath, statusText, isOpen } from '../../shared/levels.js';

  let st = $state(null), err = $state(''), year = $state(1990), playing = $state(false);
  let on = $state({ documented: true, alleged: true, none: true, unsupported: true });
  let showDir = $state(false), selId = $state(null);
  let minY = $state(1920), maxY = $state(2025);

  onMount(async () => {
    try {
      const a = await loadAll('../../');
      const dirVenues = a.directory.venues.map(v => ({ ...v, id: 'q-' + v.qid, level: 'directory' }));
      const lay = layout(a.us, [...a.data.casinos, ...dirVenues]);
      st = { ...a, dirVenues, lay };
      const ys = a.data.casinos.map(c => c.opened).filter(Number.isFinite);
      minY = Math.min(...ys); maxY = new Date().getFullYear(); year = Math.min(maxY, Math.max(minY, 1990));
    } catch (e) { err = String(e.message || e); }
  });

  let timer;
  $effect(() => {
    if (!playing) return;
    timer = setInterval(() => { year = year >= maxY ? (playing = false, maxY) : year + 1; }, 140);
    return () => clearInterval(timer);
  });

  const visible = $derived(st ? st.data.casinos.filter(c => on[c.level] && isOpen(c, year) && st.lay.pos[c.id]) : []);
  const dirVisible = $derived(st && showDir ? st.dirVenues.filter(v => st.lay.pos[v.id] && (v.opened == null || v.opened <= year) && (v.closed == null || v.closed > year)) : []);
  const counts = $derived(Object.fromEntries(LEVELS.map(l => [l, visible.filter(c => c.level === l).length])));
  const sel = $derived(st && selId ? (st.data.casinos.find(c => c.id === selId) || st.dirVenues.find(v => v.id === selId)) : null);
  const events = $derived(st ? st.data.timeline.filter(e => e.year <= year).slice(-3).reverse() : []);
  const cites = $derived(sel && sel.ledger && sel.ledger.label && sel.ledger.label.sources ? sel.ledger.label.sources.map(id => st.S[id]).filter(Boolean) : []);

  function key(e, list, i) {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!k) return;
    e.preventDefault();
    const n = list[(i + k + list.length) % list.length];
    document.getElementById('m-' + n.id)?.focus();
  }
</script>

<header class="site-header" style="padding:10px 0">
  <a class="brand" href="../../index.html">Ledger of the House</a>
</header>
<main class="wrap">
  <p class="edition"><b>Format 1 of 17</b><span>Map and timeline</span><span>Svelte 5</span><a href="../../formats.html">All formats</a><a href="../../index.html">Plain HTML edition</a></p>
  {#if err}<p role="alert">Could not load the data: {err}</p>
  {:else if !st}<p>Loading the ledger…</p>
  {:else}
  <h1 style="margin:.2em 0">Where the money was, year by year</h1>
  <p class="lede">Drag the year. Each marker is a casino open in that year; shape and colour both carry the label the sources support, never a claim about a living person.</p>

  <div class="legend2" role="group" aria-label="Filter by label">
    {#each LEVELS as l}
      <label><input type="checkbox" bind:checked={on[l]}>
        <span><svg class="glyph" viewBox="-8 -8 16 16" aria-hidden="true"><path d={symbolPath(l, 6)} fill={COLOR[l]}/></svg>{WORDS[l]} ({counts[l]})</span></label>
    {/each}
    <label><input type="checkbox" bind:checked={showDir}> <span><svg class="glyph" viewBox="-8 -8 16 16" aria-hidden="true"><path d={symbolPath('none', 5)} class="x" fill="none" stroke="#8a7f70" stroke-width="1.5"/></svg>Unassessed directory ({st.dirVenues.length}, Wikidata)</span></label>
  </div>

  <div class="controls" style="display:flex;gap:12px;align-items:center;margin:0 0 8px">
    <button class="chip" onclick={() => { if (year >= maxY) year = minY; playing = !playing; }} aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button>
    <input type="range" min={minY} max={maxY} bind:value={year} aria-label="Year" style="flex:1">
    <output style="font:700 28px var(--font);min-width:3.2em">{year}</output>
  </div>

  <div class="mapwrap" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,320px);gap:16px" >
    <svg viewBox="0 0 {W} {H}" role="group" aria-label="Map of {visible.length} casinos open in {year}" style="width:100%;height:auto;background:var(--panel);border:1px solid var(--line)">
      {#each st.lay.states as d}<path {d} fill="#201a16" stroke="#3a312a" stroke-width=".7"/>{/each}
      {#each dirVisible as v (v.id)}
        <g class="marker dir" class:sel={selId === v.id} transform="translate({st.lay.pos[v.id].x},{st.lay.pos[v.id].y})" role="button" tabindex="-1" aria-label="{v.name}, unassessed directory entry" onclick={() => selId = v.id} onkeydown={e => e.key === 'Enter' && (selId = v.id)}>
          <path d={symbolPath('none', 3.4)}/></g>
      {/each}
      {#each visible as c, i (c.id)}
        <g id={'m-' + c.id} class="marker" class:sel={selId === c.id} transform="translate({st.lay.pos[c.id].x},{st.lay.pos[c.id].y})" role="button" tabindex={i === 0 ? 0 : -1}
           aria-label="{c.name}, {c.city} {c.state}, {WORDS[c.level]}, {statusText(c)}" onclick={() => selId = c.id}
           onkeydown={e => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), selId = c.id) : key(e, visible, i)}>
          <path d={symbolPath(c.level, 6.2)} fill={COLOR[c.level]}/></g>
      {/each}
    </svg>

    <aside class="panel" aria-live="polite" style="background:var(--panel);border:1px solid var(--line);padding:14px">
      {#if sel}
        <h2 style="margin:0">{sel.name}</h2>
        <p>{sel.city ? sel.city + ', ' : ''}{sel.state || ''} · {sel.level === 'directory' ? 'Unassessed' : WORDS[sel.level]} · {statusText(sel.opened != null ? sel : { ...sel, opened: '?' })}</p>
        {#if sel.level === 'directory'}
          <p>From Wikidata (CC0). Not assessed for organised-crime ties and carries no label.</p>
          {#if sel.operators?.length}<p>Operator: {sel.operators.map(o => o.name).join(', ')}</p>{/if}
          <div class="panel-actions">{#if sel.site}<a href={sel.site} rel="noopener">Official site</a>{/if}<a href={'https://www.wikidata.org/wiki/' + sel.qid} rel="noopener">Wikidata</a></div>
        {:else}
          <p>{sel.mob.summary}</p>
          {#if cites.length}<h3>Sources</h3><ol style="padding-left:18px">{#each cites as s}<li><a href={s.url} rel="noopener">{s.title || s.url}</a></li>{/each}</ol>
          {:else}<p><em>No source in the ledger supports a label beyond “{WORDS[sel.level]}”.</em></p>{/if}
          <div class="panel-actions"><a href={'../../venues.html#' + sel.id}>Full record</a></div>
        {/if}
        <button class="chip" onclick={() => selId = null}>Close</button>
      {:else}
        <h2 style="margin:0">In {year}</h2>
        <p>{visible.length} venues open. Select a marker, or use the arrow keys once the map has focus.</p>
        {#if events.length}<ul style="padding-left:18px">{#each events as e}<li><b>{e.year}</b> {e.text}</li>{/each}</ul>{/if}
      {/if}
    </aside>
  </div>
  {/if}
</main>
<style>
  @media (max-width:760px){ .mapwrap{grid-template-columns:1fr !important} }
  label{display:inline-flex;gap:6px;align-items:center}
</style>
