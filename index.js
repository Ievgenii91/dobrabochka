require('dotenv').config()
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const bodyParser = require('body-parser')
const cors = require('cors');
const initBot = require('./bot')

let app = express();
const telegramChatId = -1001491303154;

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
            const { customer_note, billing, payment_method_title, line_items, id } = req.body;
            try {
                let items = line_items.map(v => {
                    return `\n${v.name} К-во: ${v.quantity} шт., Цена: ${v.price} грн`
                })
                items += `\nВсего: ${line_items[0].total} грн`;
                bot.telegram.sendMessage(telegramChatId, `ЗАКАЗ #${id}\nФИО: ${billing.first_name + ' ' + billing.last_name}\nАдреса: ${billing.address_1} | ${billing.city} | ${billing.state} обл.\nemail: ${billing.email}\nТелефон: ${billing.phone}\nПлатежный метод: ${payment_method_title}\nЗаметка: ${customer_note}\n${items}`);
            } catch (e) {
                console.error(e)
            }

            return res.status(200).send({ok: true, post: req.body})
        })
        .post('/api/message', (req, res, next) => {
            if(!req.body) {
                return next();
            }
            const { name, phone, question, url } = req.body;
            try {
                bot.telegram.sendMessage(telegramChatId,
                    `CALLBACK!\nИмя: ${name || ''}\nТелефон: ${phone || ''}\nВопрос: ${question || ''}\nUrL:${url || ''}`)
            } catch (e) {
                console.error(e)
            }

            return res.status(200).send({ok: true, post: req.body})
        })
        .post('/api/woo-test', cors(), (req, res, next) => {
            if(!req.body) {
                return next();
            }
            console.log(req.body, 'body log /api/message-test');
            const { customer_note, billing, payment_method_title, line_items, id } = req.body;
            try {
                let items = line_items.map(v => {
                    return `\n${v.name} К-во: ${v.quantity} шт., Цена: ${v.price} грн`
                })
                items += `\nВсего: ${line_items[0].total} грн`;
                bot.telegram.sendMessage(telegramChatId, `ЗАКАЗ #${id}\nФИО: ${billing.first_name + ' ' + billing.last_name}\nАдреса: ${billing.address_1} | ${billing.city} | ${billing.state} обл.\nemail: ${billing.email}\nТелефон: ${billing.phone}\nПлатежный метод: ${payment_method_title}\nЗаметка: ${customer_note}\n${items}`);
            } catch (e) {
                console.error(e)
            }

            return res.status(200).send({ok: true, post: req.body});            
        })
        .post('/api/anyMessage', (req, res, next) => {
            try {
                bot.telegram.sendMessage(telegramChatId, JSON.stringify(req.body))
            } catch (e) {
                console.error(e)
                return next(e);
            }

            return res.status(200).send({ok: true, post: req.body})
        })
        .get('/test', (req, res) => {
            return res.json({ res: 'pong' })
        })
        .listen(PORT, () => console.log(`Listening on ${PORT}`))

}

init().then(() => {
    console.log('inited app')
})
