import { pool, createPool } from "./db.js";
process.env.NTBA_FIX_350 = true;
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import { firstMessage, secondMessage, takeSickDayMessage, confirmSickDayMessage } from './messages.js'
import { reconnectDatabase, checkDatabaseConnection } from './utils/database.js'
import { sickDayWord, removeMessage } from './utils/helpers.js'
import {
    getCountSickDay,
    takeSickDay,
    checkRegisterUser,
    cancelSickDay,
    addUser,
    getUsers } from './utils/commands.js'

// токен от BotFather
const TOKEN = '7502069553:AAEmY4Y8NxyNusowJimPGCmg-3jFyDEa-zQ';

// чат админа (сейчас Даша, потом исправить )
const ADMIN_CHAT_ID = '98150327'; // Ника
// const ADMIN_CHAT_ID = '314147055'; // Даша

getUsers()

// создаем экземпляр бота
export const bot = new TelegramBot(TOKEN, { polling: true });

// добавляем обработку ошибок для отладки
bot.on('polling_error', async (error) =>  {
    console.error('Ошибка опроса:', error);
    await reconnectDatabase();
});

// Нужно для ежедневного контроля подключения
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


// узнать остаток сикдеев
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

    takeSickDay(chatId)
});

bot.onText(/\/cancelmysickday/, async (msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    removeMessage(chatId, messageId);

    const isRegistered = await checkRegisterUser(chatId)

    if (!isRegistered) {
        bot.sendMessage(chatId, `Ты еще не зарегистрирован(а).`);
    } else {
        cancelSickDay(chatId)
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

// Ожидание нажатия на кнопку
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

// bot.onText(/\/start (.+)/, async (msg, match) => {
//     const param = match[1]; // Параметр после /start
//     const chatId = msg.chat.id;
//     const user = msg.from;
//     const messageId = msg.message_id;
//
//     const isRegistered = await checkRegisterUser(chatId)
//
//     if (!isRegistered) {
//         bot.sendMessage(chatId, `Ты еще не зарегистрирован(а).`);
//         return;
//     }
//
//     removeMessage(chatId, messageId);
//     console.log('start: ', param)
//
//     if (param === 'takemysickdaycount') {
//         takeSickDay(chatId)
//     }
//     else if (param === 'cancelmysickday') {
//         cancelSickDay(chatId)
//     }
//     else {
//         bot.sendMessage(chatId, firstMessage, { parse_mode: "HTML", disable_web_page_preview: true });
//         setTimeout(() => {
//             bot.sendMessage(chatId, secondMessage, { parse_mode: "HTML", disable_web_page_preview: true });
//         }, 500)
//
//         bot.once('message', async (response) => {
//
//             const words = response.text.split(/\s+/); // Разделяем текст по пробелам
//
//             if (words.length !== 3) {
//                 await bot.sendMessage(chatId, "Пожалуйста, повторно нажмите /start и укажите фамилию, имя и отчество. ");
//                 return;
//             }
//
//             const newUser = {
//                 user_id: chatId,
//                 name: response.text,
//                 username: `@${user.username}`,
//                 chat_id: chatId,
//             }
//
//             await addUser(newUser)
//
//             await bot.sendMessage(chatId, `Спасибо! Ты теперь можешь пользоваться функциями бота.`);
//         });
//     }
// });

bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const param = match[1]; // Параметр после /start (может быть undefined)
    const chatId = msg.chat.id;
    const user = msg.from;
    const messageId = msg.message_id;

    const isRegistered = await checkRegisterUser(chatId);

    if (!isRegistered) {
        bot.sendMessage(chatId, `Ты еще не зарегистрирован(а).`);
        return;
    }

    removeMessage(chatId, messageId);

    console.log('start: ', param);

    // Если параметр есть
    if (param) {
        if (param === 'takemysickdaycount') {
            takeSickDay(chatId);
        } else if (param === 'cancelmysickday') {
            cancelSickDay(chatId);
        } else {
            bot.sendMessage(chatId, `Неизвестная команда: ${param}`);
        }
    }
    // Если параметра нет
    else {
        const isRegistered = await checkRegisterUser(chatId)

        if (isRegistered) {
            bot.sendMessage(chatId, `Ты уже зарегистрирован(а).`);
            return;
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
    }
});



