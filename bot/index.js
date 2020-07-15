const TeleBot = require('telebot');
const config = require('nconf');
const TELEGRAM_BOT_TOKEN = config.get('TELEGRAM_BOT_TOKEN');
const bot = new TeleBot(TELEGRAM_BOT_TOKEN);
const soap = require('../services/soap')
const npService = require('../services/novaPoshta')
const InvoiceModel = require('../models/invoice')
const moment = require('moment');

module.exports = (expressApp) => {

    // bot.on('text', (msg) => msg.reply.text(msg.text));

    bot.on(['/start'], (msg) => msg.reply.text(
        `Привіт людинко! Я тут, щоб допомгти тобі відправити смс до твоїх замовників. \n
        Мої команди: \n
        /balance - баданс кредитів \n
        /go - сповістити замовників за сьогодні \n
        /info - отримати список декларацій за сьогодні \n`
    ));

    bot.on('edit', (msg) => {
        return msg.reply.text('Я все бачив, ти редагував повідомлення! Аяяй!', { asReply: true });
    });

    bot.on('/hello', (msg) => {
        return bot.sendMessage(msg.from.id, `Привіт, ${ msg.from.first_name }!`);
    });

    bot.on('/balance', async (msg) => {
        const cookie = await soap.getAuthCookie(config.get('SMS_LOGIN'), config.get('SMS_PASS'))
        try {
            const credits = await soap.getBalance(cookie)
            return bot.sendMessage(msg.from.id, `У вас ${credits} кредитів!`);
        } catch (e) {
            return bot.sendMessage(msg.from.id, `${e.message}`);
        }
    });

    bot.on('/info', async (msg) => {
        let invoices = '';
        try {
            let { data } = await npService.getInvoicesForToday()
            if(data.success) {
                const inv = data.data.map(v => new InvoiceModel(v));
                inv.forEach(v => {
                    invoices += `ТТН ${v.invoiceNumber} ${v.recipientContactPerson} ${v.recipientContactPhone || v.recipientsPhone} \n`;
                });
                invoices += `\n ${inv.length} штук, ${moment().format('DD.MM.YYYY')}`
                return bot.sendMessage(msg.from.id, invoices);
            } else {
                return bot.sendMessage(msg.from.id, ':(');
            }
        } catch (e) {
            return bot.sendMessage(msg.from.id, `${e.message}`);
        }
    });

    bot.on('/go', async (msg) => {
        const cookie = await soap.getAuthCookie(config.get('SMS_LOGIN'), config.get('SMS_PASS'))
        let invoices = [];
        let credits = 0;
        try {
            credits = await soap.getBalance(cookie)
            let { data } = await npService.getInvoicesForToday()

            if(data.success) {
                invoices = data.data.map(v => new InvoiceModel(v));
            } else {
                return bot.sendMessage(msg.from.id, `Упс...щось пішло не так, спробуйте пізніше.`);
            }
        } catch (e) {
            return bot.sendMessage(msg.from.id, `${e.message}`);
        }
        console.log(invoices)

        if(parseInt(credits) < invoices.length) {
            return bot.sendMessage(msg.from.id, `Недостатньо кредитів, поповніть баланс`);
        } else if(invoices.length === 0) {
            return bot.sendMessage(msg.from.id, `За сьогодні не створено жодної декларації`);
        }

        const promises = invoices.map((v) => {
            return soap.sendSMS({
                sender: config.get('SMS_SENDER_NAME'),
                text: config.get('SMS_TEMPLATE').replace('::invoiceNumber', v.invoiceNumber),
                destination: v.recipientContactPhone || v.recipientsPhone
            }, cookie)
        });
        try {
            await Promise.all(promises);
            return bot.sendMessage(msg.from.id, `СМС успішно відправлені`);
        } catch (e) {
            return bot.sendMessage(msg.from.id, `${e.message}`);
        }
    });

    bot.start();
}

//
// const bot = new TeleBot({
//     token: TELEGRAM_BOT_TOKEN, // Required. Telegram Bot API token.
//     polling: { // Optional. Use polling.
//         interval: 1000, // Optional. How often check updates (in ms).
//         timeout: 0, // Optional. Update polling timeout (0 - short polling).
//         limit: 100, // Optional. Limits the number of updates to be retrieved.
//         retryTimeout: 5000, // Optional. Reconnecting timeout (in ms).
//         proxy: 'http://username:password@yourproxy.com:8080' // Optional. An HTTP proxy to be used.
//     },
//     webhook: { // Optional. Use webhook instead of polling.
//         key: 'key.pem', // Optional. Private key for server.
//         cert: 'cert.pem', // Optional. Public key.
//         url: 'https://....', // HTTPS url to send updates to.
//         host: '0.0.0.0', // Webhook server host.
//         port: 443, // Server port.
//         maxConnections: 40 // Optional. Maximum allowed number of simultaneous HTTPS connections to the webhook for update delivery
//     },
//     allowedUpdates: [], // Optional. List the types of updates you want your bot to receive. Specify an empty list to receive all updates.
//     usePlugins: ['askUser'], // Optional. Use user plugins from pluginFolder.
//     pluginFolder: '../plugins/', // Optional. Plugin folder location.
//     plugiconfigig: { // Optional. Plugin configuration.
//         // myPluginName: {
//         //   data: 'my custom value'
//         // }
//     }
// });
