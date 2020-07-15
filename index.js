const express = require('express')
const path = require('path')
const nconf = require('nconf');
const PORT = process.env.PORT || 5000
nconf.argv()
    .env()
    .file({ file: 'config.json' });
const runBot = require('./bot')

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

// BOT for sms
runBot();
