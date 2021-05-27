require('dotenv').config();
const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const bodyParser = require('body-parser');
const cors = require('cors');
const requestIp = require('request-ip');
const initBot = require('./bot');

let app = express();
const telegramChatId = parseInt(process.env.CHAT_ID);
const blockedIps = []; // TODO: add ips

async function init() {
	const bot = initBot();
	const info = await bot.telegram.getWebhookInfo();
	if (info && info.url) {
		await bot.telegram.deleteWebhook();
	}
	if (process.env.NODE_ENV === 'production') {
		app.use(bot.webhookCallback(`/bot${bot.telegram.token}`));
		await bot.telegram.setWebhook(
			`${process.env.SITE_URL}${bot.telegram.token}`
		);
	} else {
		await bot.launch();
	}

	app
		.use(bodyParser.json())
		.use(bodyParser.urlencoded({ extended: false }))
		.use(express.static(path.join(__dirname, 'public')))
		.set('views', path.join(__dirname, 'views'))
		.set('view engine', 'ejs');

	let originOptions = {
		origin: process.env.ALLOWED_CORS_ORIGIN,
	};
	app.options('/api/onAddOrder', cors(originOptions));

	app
		.get('/', (req, res) => res.render('pages/index'))
		.post('/woo', (req, res) => {
			const { customer_note, billing, payment_method_title, line_items, id } =
				req.body;
			try {
				let items = line_items.map((v) => {
					return `\n${v.name} К-во: ${v.quantity} шт., Цена: ${v.price} грн`;
				});
				items += `\nВсего: ${line_items[0].total} грн`;
				bot.telegram.sendMessage(
					telegramChatId,
					`ЗАКАЗ #${id}\nФИО: ${
						billing.first_name + ' ' + billing.last_name
					}\nАдреса: ${billing.address_1} | ${billing.city} | ${
						billing.state
					} обл.\nemail: ${billing.email}\nТелефон: ${
						billing.phone
					}\nПлатежный метод: ${payment_method_title}\nЗаметка: ${customer_note}\n${items}\nip: ${requestIp.getClientIp(req)}`
				);
			} catch (e) {
				console.error(e);
			}

			return res.status(200).send({ ok: true, post: req.body });
		})
		.post('/api/message', (req, res, next) => {
			if (!req.body) {
				return next();
			}
            const ip = requestIp.getClientIp(req);
            const agent = req.headers['user-agent'];
            if(blockedIps.includes(ip)) {
                return next();
            }
			const { name, phone, question, url } = req.body;
			if (!isFormDataValid(name, phone, question)) {
				console.warn('Not valid input', name, phone);
				return next();
			}
			function isFormDataValid(name = '', phone = '', question = '') {
				const exceptions = [
					'henry',
					'mike',
					'заработок',
					'http',
					'viagra',
					'helina',
				];
				return ![name, phone, question].filter(
					(v) =>
						exceptions.filter((data) => v.toLowerCase().indexOf(data) > -1)
							.length > 0
				).length;
			}
			try {
				bot.telegram.sendMessage(
					telegramChatId,
					`CALLBACK!\nИмя: ${name || ''}\nIP: ${ip}\nТелефон: ${phone || ''}\nВопрос: ${
						question || ''
					}\nUrL:${url || ''}\nagent: ${agent}`
				);
			} catch (e) {
				console.error(e);
			}

			return res.status(200).send({ ok: true, post: req.body });
		})
		.post('/api/onAddOrder', cors(originOptions), (req, res, next) => {
			if (!req.body) {
				return next();
			}
			const {
				order_comments,
				billing_first_name,
				billing_last_name,
				payment_method,
				billing_phone,
				line_items,
				total,
				billing_email,
				wcus_np_billing_area,
				wcus_np_billing_city,
				np_state,
				np_city,
				np_warehouse,
				np_custom,
			} = req.body;
			try {
				let items = JSON.parse(`{"line_items":${line_items}}`).line_items.map(
					(v) => {
						return `\n${v.name}, ${v.price} грн`;
					}
				);
				items += `\nВсего: ${total} грн`;
				let message = `ФИО: ${
					billing_first_name + ' ' + billing_last_name
				}\nemail: ${billing_email}\nТелефон: ${billing_phone}\nПлатежный метод: ${payment_method}\nЗаметка: ${order_comments}\n${items}`;
				if (wcus_np_billing_area || wcus_np_billing_city) {
					message += `\nНова Пошта: ${np_state}  ${np_city}  ${np_warehouse}  ${
						np_custom || ''
					}`;
				}
				bot.telegram.sendMessage(telegramChatId, message);
			} catch (e) {
				console.error(e);
			}

			return res.status(200).send({ ok: true, post: req.body });
		})
		.post('/api/anyMessage', (req, res, next) => {
			try {
				bot.telegram.sendMessage(telegramChatId, JSON.stringify(req.body));
			} catch (e) {
				console.error(e);
				return next(e);
			}

			return res.status(200).send({ ok: true, post: req.body });
		})
		.get('/test', (req, res) => {
			return res.json({ res: 'pong' });
		})
		.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

init().then(() => {
	console.log('inited app');
});
