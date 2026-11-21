# casinos

A map and timeline of American casinos: hotspots over the years and documented or alleged organised-crime ties.

Built by Solutions as Service with OpenRouter free models (data and page generation, a second model as fact checker). `tools/orbuild.py` is the driver; `tools/check_site.js` is the headless-browser gate every generated page must pass.

Facts are AI-drafted from public history and are labelled `documented`, `alleged` or `none`, and `verified` (checked by a second model) or `unchecked`. Treat them as leads to check, not as sources. Nothing here is a claim about living people.

Layout: `data/casinos.json`, `vendor/` (d3-geo, topojson-client, us-atlas states: no CDN and no map tile server needed), `index.html`.
