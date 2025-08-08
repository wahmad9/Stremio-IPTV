const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');

const iptv = require("./iptv");
const manifest = require("./manifest.json");
const regions = require('./regions.json');

app.set('trust proxy', true);

app.use('/configure', express.static(path.join(__dirname, 'vue', 'dist')));
app.use('/assets', express.static(path.join(__dirname, 'vue', 'dist', 'assets')));

app.use(cors());

// Root: redirect to /configure
app.get('/', (_, res) => {
    res.redirect('/configure');
});

// Configure page
app.get('/:configuration?/configure', (_, res) => {
    res.setHeader('Cache-Control', 'max-age=86400,staleRevalidate=stale-while-revalidate, staleError=stale-if-error, public');
    res.setHeader('content-type', 'text/html');
    res.sendFile(path.join(__dirname, 'vue', 'dist', 'index.html'));
});

// Manifest (no configuration)
app.get('/manifest.json', (_, res) => {
    res.setHeader('Cache-Control', 'max-age=86400, public');
    res.setHeader('Content-Type', 'application/json');
    const manifestClone = JSON.parse(JSON.stringify(manifest));
    manifestClone.catalogs = [];
    manifestClone.behaviorHints = manifestClone.behaviorHints || {};
    manifestClone.behaviorHints.configurationRequired = true;
    res.json(manifestClone);
});

// Manifest (with configuration)
app.get('/:configuration/manifest.json', (req, res) => {
    const manifestClone = JSON.parse(JSON.stringify(manifest));
    manifestClone.catalogs = [];
    const configuration = atob(req.params.configuration);
    const { providors, costume, costumeLists } = iptv.ConfigCache(req.params.configuration);

    if (costume) {
        for (let i = 0; i < costume.length; i++) {
            let [id, name, url] = costume[i].split(":");
            manifestClone.catalogs.push({
                "type": "tv",
                "id": "stremio_iptv_id:" + id,
                "name": name,
                "extra": [{ "name": "search", "isRequired": false }]
            });
        }
    }
    if (providors) {
        for (let i = 0; i < providors.length; i++) {
            manifestClone.catalogs.push({
                "type": "tv",
                "id": "stremio_iptv_id:" + providors[i],
                "name": regions[providors[i]].name,
                "extra": [{ "name": "search", "isRequired": false }]
            });
        }
    }
    manifestClone.behaviorHints = manifestClone.behaviorHints || {};
    manifestClone.behaviorHints.configurationRequired = false;
    res.setHeader('Cache-Control', 'max-age=86400,staleRevalidate=stale-while-revalidate, staleError=stale-if-error, public');
    res.setHeader('Content-Type', 'application/json');
    res.json(manifestClone);
});

// Main Stremio API endpoint
app.get('/:configuration?/:resource(catalog|meta|stream)/:type/:id/:extra?.json', async (req, res) => {
    res.setHeader('Cache-Control', 'max-age=86400,staleRevalidate=stale-while-revalidate, staleError=stale-if-error, public');
    res.setHeader('Content-Type', 'application/json');

    const { configuration, resource, type, id } = req.params;
    const extra = req.params.extra ? Object.fromEntries(new URLSearchParams(req.params.extra)) : {};
    const { providors, costume, costumeLists } = iptv.ConfigCache(configuration);

    let region = id.split(":")[1];
    let costumeList = costumeLists && costumeLists[region] ? atob(costumeLists[region].url) : '';

    try {
        if (resource === "catalog" && type === "tv") {
            if (extra && extra.search) {
                const metas = await iptv.search(region, costumeList, extra.search);
                res.json({ metas });
            } else {
                const metas = await iptv.catalog(region, costumeList);
                res.json({ metas });
            }
        } else if (resource === "meta" && type === "tv") {
            const meta = await iptv.meta(id, costumeList);
            res.json({ meta });
        } else if (resource === "stream" && type === "tv") {
            const streams = await iptv.stream(id, costumeList);
            res.json({ streams });
        } else {
            res.status(404).end();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = app;
