const soap = require('strong-soap').soap;
const nconf = require('nconf');

const enums = {
    received: 'Сообщение доставлено получателю',
    authSuccess: 'Вы успешно авторизировались',
    fail: 'Вы не авторизированы',
    okSmsSent: 'Сообщения успешно отправлены'
};

const url =  process.env.SMS_URL || nconf.get('SMS_URL');
let SOAPClient = null;

async function createClient() {
    return new Promise((resolve, reject) => {
        soap.createClient(url, {}, function(err, client) {
            if(err) reject(err);
            resolve(client);
        });
    });
}

async function auth(login, password) {
    return new Promise((resolve, reject) => {
        console.log(login, password);
        SOAPClient.Auth({ login, password }, function(err, result) {
            console.log(result, 'AUTH');
            if(result.AuthResult === enums.authSuccess && SOAPClient.lastResponseHeaders) {
                resolve(SOAPClient.lastResponseHeaders['set-cookie'][0]);
            } else {
                reject(result.AuthResult);
            }
        });
    });
}

async function getAuthCookie(login, password) {
    try {
        SOAPClient = await createClient();
        const authCookie = await auth(login, password);
        return authCookie;
    } catch(e) {
        console.error(e);
        return null;
    }
}

async function getBalance(authCookie) {
    return new Promise((resolve, reject) => {
        SOAPClient.GetCreditBalance(null, function (err, result) {
            if(err) reject(err);
            if (result.GetCreditBalanceResult !== enums.fail && parseInt(result.GetCreditBalanceResult) > 0) {
                resolve(result.GetCreditBalanceResult);
            } else {
                reject(result.GetCreditBalanceResult);
            }
        }, {}, {
            'Cookie': authCookie
        });
    });
}

async function sendSMS({ sender, destination, text }, authCookie) {
    return new Promise((resolve, reject) => {
        console.log(sender,
            destination,
            text);
        SOAPClient.SendSMS({
            sender,
            destination,
            text
        }, function (err, result) {
            if(err) {
                console.log(err);
                reject({ status: err });
            }
            const resultArray = result.SendSMSResult.ResultArray;
            console.log(resultArray);
            if (resultArray.length && resultArray[0] === enums.okSmsSent) {
                resolve({ messageId: resultArray[1], status: resultArray[0]});
            } else {
                reject({ status: resultArray, messageId: null });
            }
        }, {}, {
            'Cookie': authCookie
        })
    });

}

async function getMessageStatus(MessageId, authCookie) {
    return new Promise((resolve) => {
        SOAPClient.GetMessageStatus({ MessageId }, function (err, result) {
            resolve(err || result.GetMessageStatusResult);
        }, {}, {
            'Cookie': authCookie
        })
    });
}

module.exports = {
    getAuthCookie,
    getBalance,
    sendSMS,
    getMessageStatus,
    enums
};
