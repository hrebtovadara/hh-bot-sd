import pg from 'pg'
const { Pool, Client } = pg

import dotenv from 'dotenv';
dotenv.config();


// Создаем подключение к базе данных
const pool = new Pool({
    host: process.env.HOST,       // Адрес базы данных
    port: process.env.PORT,       // Порт базы данных
    user: process.env.POSTGRES_USER,       // Имя пользователя
    password: process.env.POSTGRES_PASSWORD, // Пароль пользователя
    database: process.env.POSTGRES_DB,  // Имя базы данных
});

export default pool;
