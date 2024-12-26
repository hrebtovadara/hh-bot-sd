import pg from 'pg'
const { Pool } = pg

import dotenv from 'dotenv';
dotenv.config();
let pool;

// Создаем подключение к базе данных
function createPool() {
    pool = new Pool({
        host: process.env.HOST,       // Адрес базы данных
        port: process.env.PORT,       // Порт базы данных
        user: process.env.POSTGRES_USER,       // Имя пользователя
        password: process.env.POSTGRES_PASSWORD, // Пароль пользователя
        database: process.env.POSTGRES_DB,  // Имя базы данных
    });
}

createPool();

export {
    pool,
    createPool
}
