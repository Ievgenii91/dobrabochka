const TeleBot = require('telebot');
const bot = new TeleBot('1341340559:AAETahF_hzd7KqGmALhQEWZ-evOP8gcOY_0');

module.exports = (expressApp) => {
    let i = 0;
    bot.on(['/start'], (msg) => msg.reply.text(
        generate()
    ));

    bot.on('text', (msg) => {
        i++;
        if(i > 5 && i < 7) {
            bot.sendMessage(msg.from.id, 'Може хватить мучать бота ?? а ?\n\n');
        }
        return bot.sendMessage(msg.from.id, generate());
    });

    bot.on('/hello', (msg) => {
        return bot.sendMessage(msg.from.id, `Привіт, ${ msg.from.first_name }!`);
    });

    bot.start();
}

function generate() {
    //{{ Що ? (розробка, тестування, підтримка) }}
    var deeds2 = ['Розробка', 'Тестування', 'Підтримка', 'Розробка та підтримка', 'Діагностування', 'Консультативні роботи для', 'Маштабування', 'Інтеграція', 'Збір статистичних даних для'];
    var deeds = ['розробці', 'тестуванню', 'підтримці', 'розробці та підтримці', 'діагностуванню', 'аналізу', 'маштабуванню', 'інтеграції', 'збору статистичних даних для'];
    //Кого?
    var whoom = ['веб-додатку', 'сервісу', 'веб-сайту', 'додатку', 'програми', 'скрипту', 'програмного забезпечення', 'продукту', 'shell-скрипту', 'алгоритму', 'алгоритму оптимізації даних', 'плагіну', 'розширення', 'фреймворку', 'бібліотеки', 'мобільного додатку', 'графічного інтерфейсу', 'хеш-таблиці', 'чат-боту, як сервісу'];
    //дієслово
    var die = ['з використнням', 'на базі', 'на платформі', 'у середовищі', 'на', 'під']
    //
    var usingWhat = ['Microsoft .NET Framework',
        'C++', 'AngularJS', 'Java', 'DurandalJS', 'C#','Objective C', 'F#', 'TypeScript',
        'BabelJS', 'MVC ASP.net', 'AureliaJS', 'ReactJS', 'Angular2.0', 'Entity Framework', 'HANA',
        'Sharepoint Server', 'NodeJS', 'MongoDB', 'SQL Express', 'SQL data tools',
        'Postgress',
        'Azure web services',
        'React', 'React Native', 'Ionic', 'Cordova', 'Angular', 'Python', 'PHP', 'WP',
        'Visual Studio'];
    var system = ['Windows 8', 'MAC OS', 'Linux', 'Linux Ubuntu', 'Windows 7 x64', 'Windows 2003 Server', 'Windows XP', 'Android', 'OSX', 'WINDOWS 10 x64'];
    var mechanizms = ['механізму рефлексії', 'кінцевих автоматів', 'обфускації скриптів', 'маштабування ізоморфного середовища', 'криптографічних бібліотек'];
    function generate(arr) {
        return arr[Math.floor((Math.random() * arr.length))] + ' ';
    }

    function generateText(){
        //template 1
        var text = '- по ' + generate(deeds) + generate(whoom) + generate(die) + generate(usingWhat) + 'та ' + generate(usingWhat) + 'для ' +
            generate(usingWhat) + ' під операційною системою ' + generate(system) + '\n - по ';

        text += generate(deeds) + generate(whoom) + generate(die) + generate(usingWhat) + 'та ' + generate(usingWhat) + 'для ' +
            generate(usingWhat) + generate(die) + generate(mechanizms);

        return text;
    }
    return generateText();
}
