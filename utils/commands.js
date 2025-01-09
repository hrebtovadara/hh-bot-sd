import { pool } from "../db.js";
import { bot } from './../bot.js';
import { confirmSickDayMessage, takeSickDayMessage } from "../messages.js";
import { checkDate } from "./helpers.js"


const ADMIN_CHAT_ID = '98150327'; // Ника

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
    }
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

async function takeSickDay(chatId) {
    const sickDayCount = await getCountSickDay(chatId)

    if (sickDayCount > 4) {
        bot.sendMessage(chatId, `У тебя не осталось сикдеев в этом году. Оформи больничный и поправляйся скорее!`);
    } else {
        bot.sendMessage(chatId, takeSickDayMessage);

        bot.once('message', async (response) => {
            checkDate(response.text)
            if (checkDate(response.text)) {
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
                bot.sendMessage(chatId, `Упс, ты ошибся. Попробуй ещё раз, нажав команду “<a href="tg://resolve?domain=@sickDayForHHBot&start=takemysickdaycount">взять сикдей</a>”`, { parse_mode: "HTML", disable_web_page_preview: true });
            }
        });
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

async function cancelSickDay(chatId) {
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
            const query = `DELETE FROM SickDay WHERE sick_day_id = $1`

            try {
                await pool.query(query, [lastSickDay.sick_day_id]);
                bot.sendMessage(chatId, `Ты успешно отменил последний взятый сикдей. Удачи!`);
                sendInfoAdmin(chatId, false)
            } catch (err) {
                console.error('Ошибка выполнения запроса:', err);
                bot.sendMessage(chatId, `Ошибка выполнения запроса. Напиши эйчарам.`);
            }
        }
    } catch (err) {
        console.error('Ошибка выполнения запроса:', err);
        bot.sendMessage(chatId, `Ошибка выполнения запроса. Напиши эйчарам.`);
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

export {
    sendInfoAdmin,
    getCountSickDay,
    takeSickDay,
    checkRegisterUser,
    cancelSickDay,
    addUser,
    getUsers
}
