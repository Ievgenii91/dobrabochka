const nconf = require('nconf');
nconf.argv()
    .env()
    .file({ file: 'config.json' });

const runBot = require('./bot')
const runSPDBot = require('./spd_bot')
// BOT for sms
runBot();
runSPDBot();
