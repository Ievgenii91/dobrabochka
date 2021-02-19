const axios = require('axios');
const moment = require('moment');

const NP_API = 'https://api.novaposhta.ua/v2.0/json/getDocumentList'
const headers = {
    'Content-Type': 'application/json'
};

class NovaPoshta {

    async getInvoices(from, to, key) {
        const apiKey = key || process.env.NP_API_KEY
        const methodProperties = {
            GetFullList: 1
        };

        if(from && to) {
            methodProperties.DateTimeFrom = moment(from).format('DD.MM.YYYY');
            methodProperties.DateTimeTo = moment(to).format('DD.MM.YYYY');
        }

        return axios({
            url: NP_API,
            method: 'post',
            data: {
                modelName: 'InternetDocument',
                calledMethod: 'getDocumentList',
                apiKey,
                methodProperties
            },
            headers
        });
    }

    async getInvoicesForToday(from = new Date(), to = new Date(), key) {
        return this.getInvoices(from, to, key)
    }
}

module.exports = new NovaPoshta();
