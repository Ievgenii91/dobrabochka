const { Telegraf  } = require('telegraf');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const soap = require('../services/soap')
const npService = require('../services/novaPoshta')
const InvoiceModel = require('../models/invoice')
const moment = require('moment');

module.exports = () => {

    const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

    bot.command('start', ({ reply }) => reply(
        `Привіт людинко! Я тут, щоб допомгти тобі відправити смс до твоїх замовників. \n
        Мої команди: \n
        /balance - баданс кредитів \n
        /go - сповістити замовників за сьогодні \n
        /info - отримати список декларацій за сьогодні \n`
    ));

    // bot.on('edit', (msg) => {
    //     return msg.reply.text('Я все бачив, ти редагував повідомлення! Аяяй!', { asReply: true });
    // });

    bot.command('hello', ({ reply, update }) => {
        return reply(`Привіт, ${ update.message.from.first_name }!`);
    });

    bot.command('balance', async ({ reply }) => {
        const cookie = await soap.getAuthCookie(process.env.SMS_LOGIN, process.env.SMS_PASS)
        try {
            const credits = await soap.getBalance(cookie)
            return reply(`У вас ${credits} кредитів!`);
        } catch (e) {
            return reply(`${e.message}`);
        }
    });

    bot.command('info', async ({ reply }) => {
        let invoices = '';
        try {
            let { data } = await npService.getInvoicesForToday()
            if(data.success) {
                const inv = data.data.map(v => new InvoiceModel(v));
                inv.forEach(v => {
                    invoices += `ТТН ${v.invoiceNumber} ${v.recipientContactPerson} ${v.recipientContactPhone || v.recipientsPhone} \n`;
                });
                invoices += `\n ${inv.length} штук, ${moment().format('DD.MM.YYYY')}`
                return reply(invoices);
            } else {
                return reply(':(');
            }
        } catch (e) {
            return reply(`${e.message}`);
        }
    });

    bot.command('go', async ({ reply }) => {
        const cookie = await soap.getAuthCookie(process.env.SMS_LOGIN, process.env.SMS_PASS)
        let invoices = [];
        let credits = 0;
        try {
            credits = await soap.getBalance(cookie)
            let { data } = await npService.getInvoicesForToday()

            if(data.success) {
                invoices = data.data.map(v => new InvoiceModel(v));
            } else {
                return reply(`Упс...щось пішло не так, спробуйте пізніше.`);
            }
        } catch (e) {
            return reply(`${e.message}`);
        }
        console.log(invoices)

        if(parseInt(credits) < invoices.length) {
            return reply(`Недостатньо кредитів, поповніть баланс`);
        } else if(invoices.length === 0) {
            return reply(`За сьогодні не створено жодної декларації`);
        }

        const promises = invoices.map((v) => {
            // return soap.sendSMS({
            //     sender: process.env.SMS_SENDER_NAME,
            //     text: process.env.SMS_TEMPLATE.replace('::invoiceNumber', v.invoiceNumber),
            //     destination: v.recipientContactPhone || v.recipientsPhone
            // }, cookie)
            return new Promise((resolve) => {
                resolve(v.invoiceNumber)
            })
        });
        try {
            const invs = await Promise.all(promises);
            return reply(`СМС успішно відправлені ${invs.join(', ')}`);
        } catch (e) {
            return reply(`${e.message}`);
        }
    });

    return bot;
}
