import { createPool, pool } from "../db.js";

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

export {
    reconnectDatabase,
    checkDatabaseConnection
}
