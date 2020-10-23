const express = require('express')
const path = require('path')
const nconf = require('nconf');
const PORT = process.env.PORT || 5000
const bodyParser = require('body-parser')
const initBot = require('./bot')
nconf.argv()
    .env()
    .file({ file: 'config.json' });
let app = express();

async function init() {
    app.use(bodyParser.json())
        .use(bodyParser.urlencoded({extended: false}))
        .use(express.static(path.join(__dirname, 'public')))
        .set('views', path.join(__dirname, 'views'))
        .set('view engine', 'ejs')

    const bot = initBot()
    const info = await bot.telegram.getWebhookInfo()
    if (info && info.url) {
        await bot.telegram.deleteWebhook()
    }
    if (process.env.NODE_ENV === 'production') {
        app.use(bot.webhookCallback(`/bot${bot.telegram.token}`))
        await bot.telegram.setWebhook(`${process.env.SITE_URL}${bot.telegram.token}`)
    } else {
        await bot.launch()
    }

    app.get('/', (req, res) => res.render('pages/index'))
        .post('/woo', (req, res) => {
            console.log('POST body', JSON.stringify(req.body))
            console.log('POST headers', JSON.stringify(req.headers))
            // try {
            //     bot().sendMessage(-1001491303154, 'tst')
            // } catch (e) {
            //     console.error(e)
            // }

            return res.status(200).send({ok: true, post: req.body})
        })
        .get('/test', () => {
            return res.json({ res: 'pong' })
        })
        .listen(PORT, () => console.log(`Listening on ${PORT}`))

}

init().then(() => {
    console.log('inited app')
})
