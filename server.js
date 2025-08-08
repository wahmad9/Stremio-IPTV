#!/usr/bin/env node
const app = require('./index.js')
const { serveHTTP, publishToCentral } = require("stremio-addon-sdk");
const config = require('./config.js');

// create local server
app.listen(config.port, function () {
    console.log(`Addon active on port ${config.port}`);
    console.log(`HTTP addon accessible at: ${config.local.replace('/manifest.json','')}/configure`);
    console.log(`Manifest URL: ${config.local}`);
});

if (process.env.NODE_ENV) {
    publishToCentral(config.local)
}
