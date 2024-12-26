import { pool, createPool } from "./db.js";
process.env.NTBA_FIX_350 = true;
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import { firstMessage, secondMessage, takeSickDayMessage, confirmSickDayMessage } from './messages.js'

// токен от BotFather
const TOKEN = '7502069553:AAEmY4Y8NxyNusowJimPGCmg-3jFyDEa-zQ';

// чат админа (сейчас Даша, потом исправить )
const ADMIN_CHAT_ID = '98150327'; // Ника
// const ADMIN_CHAT_ID = '314147055'; // Даша

getUsers()

// создаем экземпляр бота
const bot = new TelegramBot(TOKEN, { polling: true });

// добавляем обработку ошибок для отладки
bot.on('polling_error', async (error) =>  {
    console.error('Ошибка опроса:', error);
    await reconnectDatabase();
});
//
setInterval(async () => {
    await checkDatabaseConnection();
}, 24 * 60 * 60 * 1000); // Каждые 24 часа

// логирование для теста в консоли
console.log('Бот запущен и ожидает команды...');

// Приветственное сообщение при добавлении в чат
bot.on('new_chat_members', async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    const isRegistered = await checkRegisterUser(chatId)

    if (isRegistered) {
        bot.sendMessage(chatId, `Привет! Можешь пользоваться функциями бота!)`);
        return
    }

    bot.sendMessage(chatId, firstMessage, { parse_mode: "HTML", disable_web_page_preview: true });
    setTimeout(() => {
        bot.sendMessage(chatId, secondMessage, { parse_mode: "HTML", disable_web_page_preview: true });
    }, 500)

    bot.once('message', async (response) => {

        const newUser = {
            user_id: chatId,
            name: response.text,
            username: `@${user.username}`,
            chat_id: chatId,
        }

        await addUser(newUser)
        bot.sendMessage(chatId, `Спасибо! Ты теперь можешь пользоваться всеми функциями бота.`);
    });

});

bot.onText('/start', async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    const isRegistered = await checkRegisterUser(chatId)

    if (isRegistered) {
        bot.sendMessage(chatId, `Привет! Можешь пользоваться функциями бота!)`);
        getUsers()
        return
    }

    bot.sendMessage(chatId, firstMessage, { parse_mode: "HTML", disable_web_page_preview: true });
    setTimeout(() => {
        bot.sendMessage(chatId, secondMessage, { parse_mode: "HTML", disable_web_page_preview: true });
    }, 500)

    bot.once('message', async (response) => {

        const words = response.text.split(/\s+/); // Разделяем текст по пробелам

        if (words.length !== 3) {
            await bot.sendMessage(chatId, "Пожалуйста, повторно нажмите /start и укажите фамилию, имя и отчество. ");
            return;
        }

        const newUser = {
            user_id: chatId,
            name: response.text,
            username: `@${user.username}`,
            chat_id: chatId,
        }

        await addUser(newUser)

        await bot.sendMessage(chatId, `Спасибо! Ты теперь можешь пользоваться функциями бота.`);
    });

});

// узнать остаток сик деев
bot.onText(/\/getmysickdaycount/, async (msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    let sickDayCount = 5

    removeMessage(chatId, messageId);

    const isRegistered = await checkRegisterUser(chatId)

    if (!isRegistered) {
        bot.sendMessage(chatId, `Ты еще не зарегистрирован(а).`);
    } else {
        sickDayCount = await getCountSickDay(chatId)
        bot.sendMessage(chatId, `${sickDayWord(5 - sickDayCount)}.`);
    }
});

bot.onText(/\/takemysickdaycount/, async (msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    removeMessage(chatId, messageId);

    const isRegistered = await checkRegisterUser(chatId)

    if (!isRegistered) {
        bot.sendMessage(chatId, `Ты еще не зарегистрирован(а).`);
        return;
    }

    const sickDayCount = await getCountSickDay(chatId)

    if (sickDayCount > 4) {
        bot.sendMessage(chatId, `У тебя не осталось сикдеев в этом году. Оформи больничный и поправляйся скорее!`);
    } else {
        takeSickDay(chatId)
    }
});

bot.onText(/\/cancelmysickday/, async (msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    removeMessage(chatId, messageId);

    const isRegistered = await checkRegisterUser(chatId)

    if (!isRegistered) {
        bot.sendMessage(chatId, `Ты еще не зарегистрирован(а).`);
    } else {
        const query = `
            SELECT *
            FROM SickDay
            WHERE user_id = (
                SELECT user_id FROM users WHERE user_id = $1
            )
            AND creation_date >= NOW() - INTERVAL '2 hours'
        `;

        try {
            const result = await pool.query(query, [chatId]);
            const lastSickDay = result.rows.at(-1) || null

            if (!lastSickDay) {
                bot.sendMessage(chatId, `У тебя нет подходящих под условие взятых сикдеев.`);
            } else {
                cancelSickDay(lastSickDay, chatId)
            }
        } catch (err) {
            console.error('Ошибка выполнения запроса:', err);
            bot.sendMessage(chatId, `Ошибка выполнения запроса. Напиши эйчарам.`);
        } finally {
        }
    }
});

// команды для админов

bot.onText(/\/clearall/, async (msg) => {
    const chatId = msg.chat.id;

    if (ADMIN_CHAT_ID == chatId) {
        bot.sendMessage(chatId, `‼️ ты собираешься обнулить все сикдеи для всей компании за этот год. данные будет не восстановить. 
точно обнулить❓`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Подтвердить", callback_data: "confirm_clearall" }]
                ],
            },
        });
    } else {
        const photoStream = fs.createReadStream('./image/not-power.png');
        bot.sendPhoto(chatId, photoStream, {
            caption: "У вас недостаточно прав!"
        });
    }
});


bot.onText(/\/showall/, async (msg) => {
    const chatId = msg.chat.id;
    if (ADMIN_CHAT_ID == chatId) {
        const SickDayUsers = await getUsers(chatId)
        const updatedUserList = SickDayUsers.map(u => `${u.name} (${u.username})`).join('\n');
        bot.sendMessage(ADMIN_CHAT_ID, `📋 Вот список зарегистрированных участников:\n${updatedUserList}`);
    } else {
        const photoStream = fs.createReadStream('./image/big-city.png');
        bot.sendPhoto(chatId, photoStream, {
            caption: "У вас недостаточно прав!"
        });
    }
});

bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    removeMessage(chatId, messageId);

    const message = `
    Привет, я ассистент по сикдей в HH.
    Для тебя доступны команды:
    /start - для того, чтобы зарегистрироваться в системе.
    /getmysickdaycount - для того, чтобы увидеть, сколько sick day у тебя осталось.
    /takemysickdaycount - для того, чтобы брать sick day через меня.
    /cancelmysickdaycount - для того, чтобы увидеть, сколько sick day у тебя осталось.
    /help - для того, чтобы увидеть это сообщение.
  `
    bot.sendMessage(chatId, message);

});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Проверяем, что нажата кнопка подтверждения
    if (data === "confirm_clearall") {
        if (ADMIN_CHAT_ID == chatId) {
            const query = `DELETE FROM SickDay`;

            try {
                await pool.query(query);
                bot.sendMessage(chatId, "Все записи успешно обновлены. Теперь у всех sickDayCount = 5!");
            } catch (err) {
                console.error('Ошибка выполнения запроса:', err);
                bot.sendMessage(ADMIN_CHAT_ID, `Ошибка выполнения запроса. Кричите караул, товарищ эйчар :DD`);
            }
        } else {
            bot.sendMessage(chatId, "У вас недостаточно прав для выполнения этой операции.");
        }
        // Закрываем окно кнопки
        bot.answerCallbackQuery(query.id);
    }
});

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
        await pool.query(query, user);
        console.log('Пользователь добавлен!');
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        bot.sendMessage(value.chat_id, `Ошибка выполнения запроса. Напиши эйчарам.`);
    } finally {
    }
}

async function getUsers(chatId) {
    const query = 'SELECT * FROM users'; // SQL-запрос для получения всех пользователей

    try {
        const result = await pool.query(query); // Выполняем запрос
        console.log(result.rows)
        return result.rows; // Возвращаем строки с данными
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        bot.sendMessage(chatId, `Ошибка выполнения запроса. Напиши эйчарам.`);
    } finally {
    }
}

async function checkRegisterUser(chatId){
    const query = `SELECT count(*) FROM users WHERE chat_id = $1`

    try {
        const result = await pool.query(query, [chatId]); // Выполняем запрос
        return result.rows[0].count !== '0'// Возвращаем
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        bot.sendMessage(chatId, `Ошибка выполнения запроса. Напиши эйчарам.`);
    }
}

async function cancelSickDay(sickDay, chatId){
    const query = `DELETE FROM SickDay WHERE sick_day_id = $1`

    try {
        await pool.query(query, [sickDay.sick_day_id]);
        bot.sendMessage(chatId, `Ты успешно отменил последний взятый сикдей. Удачи!`);
        sendInfoAdmin(chatId, false)
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        bot.sendMessage(chatId, `Ошибка выполнения запроса. Напиши эйчарам.`);
    } finally {
    }
}

async function takeSickDay(chatId) {
    bot.sendMessage(chatId, takeSickDayMessage);

    bot.once('message', async (response) => {
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(\d{4})$/;
        if (dateRegex.test(response.text)) {
            const query = `
                INSERT INTO SickDay (user_id, creation_date, sickday_date)
                VALUES ($1, $2, $3)
            `;

            const [day, month, year] = response.text.split('.');
            const formattedDate = `${year}-${month}-${day}`;

            const sickDay = [
                chatId,
                new Date,
                formattedDate
            ];

            try {
                await pool.query(query, sickDay);
                bot.sendMessage(chatId, confirmSickDayMessage, { parse_mode: "HTML", disable_web_page_preview: true });
                sendInfoAdmin(chatId, response.text)
            } catch (err) {
                console.error('Ошибка выполнения запроса:', err);
                bot.sendMessage(chatId, `Ошибка выполнения запроса. Напиши эйчарам.`);
            } finally {
            }
        } else {
            bot.sendMessage(chatId, `Упс, ты ошибся. Попробуй ещё раз, вызвав команду /takemysickdaycount`);
        }
    });
}

async function getCountSickDay(chatId) {
    const query = `
        SELECT count(*)
        FROM SickDay
        WHERE user_id = (
            SELECT user_id FROM users WHERE user_id = $1
        )
    `;


    try {
        const result = await pool.query(query, [chatId]);
        const count = parseInt(result.rows[0].count);
        return count
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        bot.sendMessage(chatId, `Ошибка выполнения запроса. Напиши эйчарам.`);
    } finally {
    }
}

async function sendInfoAdmin(chatId, sickDay){
    const query = `
        SELECT *
        FROM users WHERE chat_id = $1
    `;

    try {
        const result = await pool.query(query, [chatId]);
        const user = result.rows[0];
        const sickDayCount = await getCountSickDay(chatId)
        if (sickDay) {
            bot.sendMessage(ADMIN_CHAT_ID, `${user.name} использует сикдей ${sickDay}. Остаток сикдеев: ${5 - sickDayCount}`);
        } else {
            bot.sendMessage(ADMIN_CHAT_ID, `${user.name} отменил последний сикдей. Остаток сикдеев: ${5 - sickDayCount}`);
        }
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        bot.sendMessage(ADMIN_CHAT_ID, `Ошибка выполнения запроса. Кричите караул, товарищ эйчар :DD`);
    } finally {
    }

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

async function reconnectDatabase() {
    try {
        pool.end(); // Завершить текущее соединение
        createPool(); // Создать новый пул
        // Тестируем новое соединение
        const client = await pool.connect();
        client.release(); // Освобождаем клиента
        console.log('Соединение с базой данных восстановлено.');
    } catch (err) {
        console.error('Не удалось восстановить соединение с базой данных:', err);
    }
}

async function checkDatabaseConnection() {
    try {
        await pool.query('SELECT * FROM users'); // Простой запрос
        console.log('Соединение с базой данных активно.');
    } catch (err) {
        console.error('Соединение с базой данных потеряно:', err);
        // Попытка восстановления соединения
        await reconnectDatabase();
    }
}





