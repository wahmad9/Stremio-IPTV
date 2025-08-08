var env = process.env.NODE_ENV === 'production' ? 'production' : 'local';

var config = {}

switch (env) {
    case 'production': // for Railway
        config.port = process.env.PORT;
        config.local = "https://perceptive-healing.up.railway.app/manifest.json";
        break;

    case 'local':
        config.port = 63355;
        config.local = "http://127.0.0.1:" + config.port + "/manifest.json";
        break;
}

module.exports = config;
