import TelegramBot from 'node-telegram-bot-api';
import client from "./db.js";

// токен от BotFather
const TOKEN = '7502069553:AAEmY4Y8NxyNusowJimPGCmg-3jFyDEa-zQ';

// чат админа (сейчас Даша, потом исправить )
const ADMIN_CHAT_ID = '98150327';

// создаем экземпляр бота
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('polling_error', (error) => {
    console.error('Ошибка опроса:', error);
});

const firstMessage = `
Привет! Это бот для учета сикдеев (sick days), он поможет тебе взять сикдей и узнать актуальное количество оставшихся за год. 

Sick day — это день, который ты можешь провести дома по болезни, не оформляя при этом официальный больничный. Заработная плата за этот день выплачивается в полном объеме.
Единовременно ты можешь использовать любое количество Sick day подряд, всего их может быть 5 за текущий календарный год. Неиспользованные дни не суммируются и не переходят из года в год.

Чтобы взять сикдей, тебе нужно предупредить об этом лида/ментора и команду. Твой эйчар получит уведомление о взятом сикдее через этого же бота.
`;

const secondMessage = `
    Для регистрации напиши свои ФИО согласно паспорту, например Иванов Петр Васильевич. 
Если у тебя паспорт другой страны, всё равно напиши своё отчество. Это нужно, чтобы мы не перепутали сотрудников-тёзок.
`;

const takeSickDayMessage = `
Укажи дату, на которую ты берешь сикдей в формате “число.месяц.год”, например 08.09.2025
`

const confirmSickDayMessage = `
Если тебе нужен ещё один сикдей, нажми команду “взять сикдей”.
Если ты оформил сикдей по ошибке, нажми команду “отменить сикдей”. Отменить сикдей можно в течение 2х часов. `


const healthWishes = [
    "Поправляйся скорее! Любим <3",
    "Береги себя, ты чудо!",
    "Желаю тебе быстрее поправиться, мы тебя любим!",
    "Не забывай о себе заботиться, здоровья тебе! ",
    "Сил тебе и быстрого восстановления! Мы будем скучать даже этот день!",
    "Ты справишься, держись! Все обязательно будет хорошо!",
    "Восстанавливайся, мы будем рядом!",
    "Заботься о себе, мы очень за тебя переживаем!",
    "Скоро всё наладится, не переживай!",
    "Желаем здоровья и скорейшего выздоровления!",
    "Ты заслуживаешь только лучшего, поправляйся!",
    "Заботься о себе, твое здоровье — главное!",
    "Всё будет хорошо, поправляйся и не забывай отдыхать!",
    "Искренне желаем тебе быстрого и простого выздоровления! Пусть каждый день приносит тебе больше сил и здоровья)",
    "Восстанавливайся, и возвращайся с новой энергией и радостью к жизни)",
    "Нам очень жаль слышать, что так вышло. Надеемся, что ты скоро встанешь на ноги и вернешь свою улыбку)",
    "Желаем тебе быстрого выздоровления и надеемся, что ты воспользуешься этим временем для полного восстановления и расслабления)",
    "Дай себе время, чтобы поправиться. Твое здоровье на первом месте, и мы надеемся, что ты скоро поправишься)",
    "Пусть твое выздоровление будет как можно скорее и безболезненным. Посылаем тебе много любви и позитивной энергии)",
    "Выздоравливай скорее, нам не хватает твоей улыбки!",
    "Бонусное пожелание от создательницы бота: Даже если сейчас тяжело, помни, что обязательно станет лучше. Посылаю тебе лучи добра и блага! Мурк! <3"
];

let funnyLoading = [
    "собираем информацию от коллег (¬‿¬ )",
    "смотрим твои фото (* ^ ω ^)",
    "проверяем доминантные гены (⊙_⊙)",
    "оцениваем влияние ретроградного Меркурия (づ◡﹏◡)づ",
    "ракладываем на таро \\(★ω★)/",
    "акцио зелье восстановления! (づ￣ ³￣)づ",
    "вжух! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    "тащимся от твоей красоты o(>ω<)o",
    "изучаем медицинскую карту ╰(*´︶`*)╯♡",
    "Даша продумывает алгоритмы (＃￣ω￣)",
    "что-то программируется ┐(￣ヘ￣)┌",
    "ощущается тяжесть бытия ლ(ಠ_ಠ ლ)",
    "успокаиваем тревожников (－ω－) zzZ",
    "спрашиваем местных котов ଲ(ⓛ ω ⓛ)ଲ",
    "слушаем слухи ʕ ᵔᴥᵔ ʔ",
    "поем серенады ٩(ˊ〇ˋ*)و",
    "переворачиваем столы (╯°益°)╯彡┻━┻",
    "спрашиваем не пропадал ли кто из ангелов ଘ(੭ˊ꒳​ˋ)੭✧",
    "немножко подглядываем ∠( ᐛ 」∠)＿"
]

// список юзеров
let sickDayUsers = [
    {
        id: 1,
        name: 'Хребтова Дарья Алексеевна',
        username: '@nyasha_dasha',
        chatId: '',
        sickDayCount: 5
    }
]

// логирование для теста в консоли
console.log('Бот запущен и ожидает команды...');

getUsers(); // Загружаем пользователей из базы данных

// Приветственное сообщение при добавлении в чат
bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const username = user.username;
    // const sickDayUser = [
    //     {
    //         sick_day_id: null,
    //         userId: chatId,
    //         date: null,
    //         create: null
    //     }
    // ]

    bot.sendMessage(chatId, firstMessage);
    bot.sendMessage(chatId, secondMessage);

    bot.once('message', async (response) => {

        const newUser = {
            user_id: chatId,
            name: response.text,
            username: `@${username}`,
            chat_id: user.id,
        }

        await addUser(newUser)
        await bot.sendMessage(chatId, `Спасибо! Ты теперь можешь пользоваться всеми функциями бота.`);
    });

});

bot.onText('/start', (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const username = user.username;

    bot.sendMessage(chatId, firstMessage);
    bot.sendMessage(chatId, secondMessage);

    bot.once('message', async (response) => {

        const newUser = {
            user_id: chatId,
            name: response.text,
            username: `@${username}`,
            chat_id: user.id,
        }

        await addUser(newUser)

        await bot.sendMessage(chatId, `Спасибо! Ты теперь можешь пользоваться всеми функциями бота.`);
    });

});

// узнать остаток сик деев
bot.onText(/\/getmysickdaycount/, async (msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const username = msg.from.username;
    let count = 5

    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (error) {
        console.error("Ошибка при удалении сообщения:", error);
    }

    const isRegistered = sickDayUsers.some(u => u.username === `@${username}`);

    if (!isRegistered) {
        bot.sendMessage(chatId, `Ты еще не зарегистрирован(а).`);
    } else {
        const query = `
        SELECT count(*)
        FROM SickDay
        WHERE user_id = (
            SELECT user_id FROM users WHERE user_id = $1
        )
    `;

        try {
            const result = await client.query(query, [chatId]);
            count = 5 - parseInt(result.rows[0].count);
            console.log('Сикдеи:', count); // Выводим пользователей
        } catch (err) {
            console.error('Ошибка выполнения запроса:', err);
        }

        bot.sendMessage(chatId, `${sickDayWord(count)}.`);

    }
});

bot.onText(/\/takemysickdaycount/, async (msg) => {
    const chatId = msg.chat.id;
    const isRegistered = true;
    const messageId = msg.message_id;

    removeMessage(chatId, messageId);

    // TODO: отправить запрос на проверку зарегистрирован ли юзер

    // TODO: запрос больничных дней
    // получить список больничнх дней и отфильтровать
    // создать константу количества дней
    const sickDayCount = 4

    // await sendAndDelete(chatId, 'Пожалуйста, подожди пока я не вернусь с ответом. Не стоит меня ломать новыми командами.', 2000);

    if (!isRegistered) {
        bot.sendMessage(chatId, `Ты еще не зарегистрирован(а).`);
    } else if (sickDayCount > 4) {
        bot.sendMessage(chatId, `У тебя не осталось сикдеев в этом году. Оформи больничный и поправляйся скорее!`);
    } else {
        // взять сик дей
        takeSickDay(chatId)
    }
});

bot.onText(/\/cancelmysickday/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.user;
    const messageId = msg.message_id;

    removeMessage(chatId, messageId);

    // TODO: отправить запрос на проверку зарегистрирован ли юзер
    const isRegistered = sickDayUsers.some(u => u.username === `@${user.username}`);

    // TODO: запрос больничных дней

    // TODO: получить сегодняшнее число
    // TODO:получить список больничнх дней и отфильтровать по человеку
    // TODO:посмотреть есть ли сик дей, с которым разница между текущим временем <2 часов
    // TODO:если да, то отправить запрос на удаление

    if (!isRegistered) {
        bot.sendMessage(chatId, `Ты еще не зарегистрирован(а).`);
    } else if (sickDayCount > 4) { // TODO: заменить условие
        bot.sendMessage(chatId, `У тебя нет подходящих под условие взятых сикдеев.`);
    } else {
        // взять сик дей
        takeSickDay(chatId)
    }
});

// команды для админов

bot.onText(/\/clearall/, async (msg) => {
    const chatId = msg.chat.id;

    if (ADMIN_CHAT_ID == chatId) {
        try {

            // TODO: очистить таблицу сикдеев

            bot.sendMessage(chatId, "Все записи успешно обновлены. Теперь у всех sickDayCount = 5! (*・ω・)ﾉ");
        } catch (error) {
            console.error("Ошибка при обновлении данных:", error);
            bot.sendMessage(chatId, "Произошла ошибка при обновлении данных. Попробуйте снова позже.");
        }
    } else {
        const photoUrl = './image/not-power.png';
        bot.sendPhoto(chatId, photoUrl,{
            caption: "У вас недостаточно прав! ヾ(=`ω´=)ノ”"
        });
    }
});

bot.onText(/\/showall/, async (msg) => {
    const chatId = msg.chat.id;

    if (ADMIN_CHAT_ID == chatId) {
        // TODO: получить список всех пользователей

        const updatedSickDayUsers = sickDayUsers.map(u => `${u.name} (${u.username}) sick day: ${u.sickDayCount}`).join('\n');
        bot.sendMessage(ADMIN_CHAT_ID, `📋 Вот список зарегистрированных участников:\n${updatedSickDayUsers}`);
    } else {
        const photoUrl = './image/big-city.png';
        bot.sendPhoto(chatId, photoUrl,{
            caption: "У вас недостаточно прав! ヾ(=`ω´=)ノ”"
        });
    }
});

bot.onText(/\/healthwishes/, async (msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userName = msg.from.first_name;
    const targetUsername = msg.from.username

    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (error) {
        console.error("Ошибка при удалении сообщения:", error);
    }

    // Пошаговое отображение сообщений

    for (let i = 0; i < 3; i++) {
        await sendAndDelete( chatId, funnyLoading[Math.floor(Math.random() * funnyLoading.length)], 1000);
    }

    // Выбираем случайный комплимент и отправляем его
    const praise = healthWishes[Math.floor(Math.random() * healthWishes.length)];
    bot.sendMessage(chatId, praise);
});

bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const message = `
    Привет, я ассистент по больничным денечкам в HH.
    Для тебя доступны команды:
    /start - для того, чтобы зарегистрироваться в системе.
    /getmysickdaycount - для того, чтобы увидеть, сколько sick day у тебя осталось.
    /takemysickdaycount - для того, чтобы брать sick day через меня.
    /healthwishes - для того, чтобы получить пожелания выздоровления.
    /help - для того, чтобы увидеть это сообщение.
    
    Пользуйся на здоровье! ╰(*´︶\`*)╯♡

    И еще:
    п1: Если тебе кажется, что что-то можно улучшить и ты знаешь, как это сделать, напиши @nyasha_dasha, она даст тебе код проекта и ты сможешь осуществить свои фантазии.
    п2: Если тебе кажется, что что-то можно улучшить, но ты не знаешь, как это сделать, то пиши кому-нибудь из эйчаров, если разрешат и заплатят, @nyasha_dasha все сделает!
    п3: Если тебе кажется, что что-то можно улучшить, и ты знаешь, как это сделать, но делать не будешь... то см п2.

    `
    bot.sendMessage(chatId, message);

});

// Функция для отправки сообщения и его удаления
const sendAndDelete = async (chatId, text, delay) => {
    const waitingMessage = await bot.sendMessage(chatId, text);
    await new Promise((resolve) => setTimeout(resolve, delay)); // Ждем указанное время
    await bot.deleteMessage(chatId, waitingMessage.message_id).catch(console.error);
}

async function removeMessage(chatId, messageId) {
    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (error) {
        console.error("Ошибка при удалении сообщения:", error);
    }
}

async function addUser(value) {
    const query = `
        INSERT INTO users (user_id, name, username, chat_id)
        VALUES ($1, $2, $3, $4)
    `;

    const user = [
        value.user_id,
        value.name,
        value.username,
        value.chat_id,
    ];

    try {
        await client.query(query, user);
        console.log('Пользователь добавлен!');
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
    }
}

async function getUsers() {
    const query = 'SELECT * FROM users'; // SQL-запрос для получения всех пользователей

    try {
        const result = await client.query(query); // Выполняем запрос
        console.log('Пользователи:', result.rows); // Выводим пользователей
        return result.rows; // Возвращаем строки с данными
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        throw err; // Пробрасываем ошибку дальше
    }
}


async function getSickDays() {
    const query = 'SELECT * FROM SickDay'; // SQL-запрос для получения всех пользователей

    try {
        const result = await client.query(query); // Выполняем запрос
        console.log('Сикдеи:', result.rows); // Выводим пользователей
        return result.rows; // Возвращаем строки с данными
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        throw err; // Пробрасываем ошибку дальше
    }
}

function takeSickDay(chatId) {
    bot.sendMessage(chatId, takeSickDayMessage);

    bot.once('message', async (response) => {
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(\d{4})$/;
        if (dateRegex.test(response.text)) {
            console.log('прошел')
            const query = `
                INSERT INTO SickDay (user_id, creation_date, sickday_date)
                VALUES ($1, $2, $3)
            `;

            const sickDay = [
                chatId,
                new Date,
                response.text
            ];

            try {
                await client.query(query, sickDay);
                bot.sendMessage(chatId, `
                Отлично, сикдей оформлен! Выздоравливай

Если тебе нужен ещё один сикдей, нажми команду “взять сикдей”.
Если ты оформил сикдей по ошибке, нажми команду “отменить сикдей”. Отменить сикдей можно в течение 2х часов. 
`);
                getSickDays() // TODO чисто для отладки
            } catch (err) {
                console.error('Ошибка выполнения запроса:', err);
            }
        } else {
            console.log('не прошел')
            bot.sendMessage(chatId, `Упс, ты ошибся. Попробуй ещё раз  ┐(￣ヘ￣)┌`);
            setTimeout(() => {
                takeSickDay(chatId)
            }, 500)
        }
    });
}


function sickDayWord(num) {
    const wordVar = [
        `У тебя остался ${num} сикдей`,
        `У тебя осталось ${num} сикдея`,
        `У тебя осталось ${num} сикдеев`,
    ]
    return useNumWord().numWord(num, wordVar)
}

function useNumWord()  {
    const numWord = function (value, words) {
        value = Math.abs(value) % 100
        const num = value % 10
        if (value > 10 && value < 20) return words[2]
        if (num > 1 && num < 5) return words[1]
        if (num == 1) return words[0]
        return words[2]
    }

    return {
        numWord,
    }
}

// для фотрматирования даты для отмены
// function formatDate(dateString) {
//     const [year, month, day] = dateString.split('-');
//
//     return `${day}.${month}.${year}`;
// }

// bot.sendMessage(chatId, `${addLinkForName(username, name)}, произошли технические шоколадки( Громко кричите о помощи!`, { parse_mode: "HTML", disable_web_page_preview: true });

