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
    
    let originOptions = {
        origin: process.env.ALLOWED_CORS_ORIGIN,
    };
    app.options('/api/onAddOrder', cors(originOptions));

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
        .post('/api/onAddOrder', cors(originOptions), (req, res, next) => {            
            if(!req.body) {
                return next();
            }            
            const { customer_note, 
                order_comments, billing_first_name, billing_last_name, payment_method_title, 
                billing_phone, line_items, id, total, billing_city, billing_address_1, billing_state,
                wcus_np_shipping_area, wcus_np_shipping_city,  wcus_np_shipping_warehouse, wcus_np_shipping_custom_address

            } = req.body;            
            try {
                let items = JSON.parse(`{"line_items":${line_items}}`).line_items.map(v => {
                    return `\n${v.name}, ${v.price} грн`
                })
                items += `\nВсего: ${total} грн`;
                let message = `ЗАКАЗ #${id}\nФИО: ${billing_first_name + ' ' + billing_last_name}\nАдреса: ${billing_address_1} | ${billing_city} | ${billing_state} обл.\nemail: ${billing.email}\nТелефон: ${billing_phone}\nПлатежный метод: ${payment_method_title}\nЗаметка: ${customer_note || order_comments}\n${items}`;
                if(wcus_np_shipping_area || wcus_np_shipping_city) {
                    message += `\nНова Пошта: ${wcus_np_shipping_area}  ${wcus_np_shipping_city}  ${wcus_np_shipping_warehouse}  ${wcus_np_shipping_custom_address}`
                }
                bot.telegram.sendMessage(telegramChatId, message);
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
