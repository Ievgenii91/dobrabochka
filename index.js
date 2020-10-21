const express = require('express')
const path = require('path')
const nconf = require('nconf');
const PORT = process.env.PORT || 5000
const bodyParser = require('body-parser')
nconf.argv()
    .env()
    .file({ file: 'config.json' });

express()
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: false }))
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .post('/woo', (req, res) => {
    console.log('POST body', JSON.stringify(req.body))
    console.log('POST headers', JSON.stringify(req.headers))
    // try {
    //     bot().sendMessage(-1001491303154, 'tst')
    // } catch (e) {
    //     console.error(e)
    // }

    return res.status(200).send({ ok: true, post: req.body })
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
