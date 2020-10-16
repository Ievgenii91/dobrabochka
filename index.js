const express = require('express')
const path = require('path')
const nconf = require('nconf');
const PORT = process.env.PORT || 5000
nconf.argv()
    .env()
    .file({ file: 'config.json' });

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/woo', (req, res) => {
    console.log('test2 GET', req.params, req.query)
    return res.status(200).send({ ok: true })
  })
  .post('/woo', (req, res) => {
    console.log('test2 POST', req.body)
    return res.status(200).send({ ok: true, post: true })
  })  
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
