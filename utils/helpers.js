import { bot } from './../bot.js';

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

async function removeMessage(chatId, messageId) {
    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (error) {
        console.error("Ошибка при удалении сообщения:", error);
    }
}

function checkDate(date) {
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(\d{4})$/;
    if (!dateRegex.test(date)) {
        return false
    }

    const [day, month, year] = date.split('.').map(Number);
    const sickDayDate = new Date(year, month - 1, day);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    sickDayDate.setHours(0, 0, 0, 0);

    return sickDayDate >= today;

}

export {
    sickDayWord,
    removeMessage,
    checkDate
}
