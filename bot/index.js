const TeleBot = require('telebot');
const config = require('nconf');
const TELEGRAM_BOT_TOKEN = config.get('TELEGRAM_BOT_TOKEN');
const soap = require('../services/soap')
const npService = require('../services/novaPoshta')
const InvoiceModel = require('../models/invoice')
const moment = require('moment');
let bot = null
module.exports = (expressApp) => {
    if(bot) {
        return bot
    }
    bot = new TeleBot(TELEGRAM_BOT_TOKEN);

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
