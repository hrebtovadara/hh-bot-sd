import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Client } = pkg;

// Создаем подключение к базе данных
const client = new Client({
    host: process.env.HOST,       // Адрес базы данных
    port: process.env.PORT,       // Порт базы данных
    user: process.env.POSTGRES_USER,       // Имя пользователя
    password: process.env.POSTGRES_PASSWORD, // Пароль пользователя
    database: process.env.POSTGRES_DB    // Имя базы данных
});

// Подключаемся к базе
client.connect()
    .then(() => console.log('Подключено к базе данных!'))
    .catch(err => console.error('Ошибка подключения:', err));

export default client;
