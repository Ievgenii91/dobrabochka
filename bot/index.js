
const {Telegraf} = require('telegraf')
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const soap = require('../services/soap')
const npService = require('../services/novaPoshta')
const InvoiceModel = require('../models/invoice')
const moment = require('moment')
const { enums } = require('../services/soap')
const MongoClient = require('mongodb').MongoClient

// Database Name
const dbName = 'dobrabochka'
let db = null
// Use connect method to connect to the server
MongoClient.connect(process.env.DB_URI, function (err, client) {
    console.log('Connected successfully to server')

    db = client.db(dbName)

})

let prevMessageId = null

module.exports = () => {    
    const bot = new Telegraf(TELEGRAM_BOT_TOKEN)

    bot.command('start', ({reply}) => reply(
        `Привіт людинко! Я тут, щоб допомгти тобі відправити смс до твоїх замовників. \n
        Мої команди: \n
        /balance - баданс кредитів \n
        /go - сповістити замовників за сьогодні \n
        /info - отримати список декларацій за сьогодні \n`
    ))

    bot.command('hello', ({reply, update}) => {
        return reply(`Привіт, ${update.message.from.first_name}!`)
    })

    bot.command('balance', async ({reply}) => {
        const cookie = await soap.getAuthCookie(process.env.SMS_LOGIN, process.env.SMS_PASS)
        try {
            const credits = await soap.getBalance(cookie)
            return reply(`У вас ${credits} кредитів!`)
        } catch (e) {
            return reply(`${e.message}`)
        }
    })

    bot.command('info', async ({reply}) => {
        let invoices = ''
        try {
            let {data} = await npService.getInvoicesForToday()
            if (data.success) {
                const inv = data.data.map(v => new InvoiceModel(v))
                inv.forEach(v => {
                    invoices += `ТТН ${v.invoiceNumber} ${v.recipientContactPerson} ${v.recipientContactPhone || v.recipientsPhone} \n`
                })
                invoices += `\n ${inv.length} штук, ${moment().format('DD.MM.YYYY')}`
                return reply(invoices)
            } else {
                return reply(':(')
            }
        } catch (e) {
            return reply(`${e.message}`)
        }
    })

    bot.command('go', async ({reply, update}) => {
        try {
            if(update.message.message_id - 1 === prevMessageId) {
                return reply('Не треба так часто кляцати');            
            }
            if(new Date(update.message.date * 1000).getDate() !== new Date().getDate()) {
                return reply('Здається це не свіжа команда');  
            }
            prevMessageId = update.message.message_id;
        } catch(e) {
            console.error(e);
        }

        const cookie = await soap.getAuthCookie(process.env.SMS_LOGIN, process.env.SMS_PASS)
        let invoices = []
        let credits = 0
        try {
            credits = await soap.getBalance(cookie)
            let {data} = await npService.getInvoicesForToday()

            if (data.success) {
                invoices = data.data.map(v => new InvoiceModel(v))
            } else {
                return reply(`Упс...щось пішло не так, спробуйте пізніше.`)
            }
        } catch (e) {
            return reply(`${e.message}`)
        }
                
        let date = new Date();
        date.setDate(date.getDate() - 1);
        
        const todaysInvoices = await db.collection('invoices').find({
            date: { $lt: new Date().toISOString(), $gt: date.toISOString() }
        }).toArray()
        
        if(todaysInvoices.length) {
            const numbers = todaysInvoices.map(v => v.invoice);
            await reply(`Сьогодні вже були відправлені декларації з наступними номерами ${numbers.join(',')}`)         
            invoices = invoices.filter(v => !numbers.includes(v.invoiceNumber));
            
            if(!invoices.length) {
                return reply('Немає неопрацьованих декларацій за сьогодні')
            }
            await reply(`Свіжі декларації ${invoices.map(v => v.invoiceNumber).join(',')} \n Відправляємо...`)
        }

        if (parseInt(credits) < invoices.length) {
            return reply(`Недостатньо кредитів, поповніть баланс`)
        } else if (invoices.length === 0) {
            return reply(`За сьогодні не створено жодної декларації`)
        }

        try {
            await db.collection('invoices').insertMany(invoices.map(v => ({
                date: new Date(v.createdTime).toISOString(),
                invoice: v.invoiceNumber,                
                phone: v.recipientContactPhone || v.recipientsPhone,
                sender: process.env.SMS_SENDER_NAME,
                text: process.env.SMS_TEMPLATE.replace('::invoiceNumber', v.invoiceNumber)
            })))
        } catch (e) {
            console.log('error', e)
        }
        
        try {
            let messages = [];
            async function processSMS(invoices) {
                for(let v of invoices) {
                    const { status, messageId } = await soap.sendSMS({
                        sender: process.env.SMS_SENDER_NAME,
                        text: process.env.SMS_TEMPLATE.replace('::invoiceNumber', v.invoiceNumber),
                        destination: v.recipientContactPhone || v.recipientsPhone 
                    }, cookie);
                    messages.push({ status, messageId });
                    await db.collection('invoices').updateMany({
                        invoice: v.invoiceNumber
                    }, { $set: { status, messageId }});
                }                
            }

            await processSMS(invoices);                     
            console.log(messages, 'messages')

            let messagesCopy = [];

            await new Promise((resolve) => {                
                let timer = setTimeout(async () => {

                    for(let { messageId } of messages) {
                        let status = await soap.getMessageStatus(messageId, cookie);
                        await db.collection('invoices').updateMany({
                            messageId
                        }, { $set: { status, messageId }});
                        messagesCopy.push({ status, messageId })
                        console.log(status, messageId, 'timeouted');
                    }
                                     
                    console.log('resolved');
                    resolve(true);
                    clearTimeout(timer);
                }, 5000);

            })
            messages = messagesCopy; // temp hack
            if(messages.filter(v => v.status === enums.received).length === messages.length) {
                console.log('all messages delivered sucessfully');
            } else {
                console.log(messages, 'not all');
            }            
            return reply(`${invoices.length} СМС успішно відправлені`)
        } catch (e) {
            return reply(`${e.message}`)
        }
    })

    bot.catch((e) => {
        console.error(e)
    })

    return bot
}
