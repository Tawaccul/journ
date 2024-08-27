const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('./userModel'); // Модель пользователя
const Student = require('./studentModel'); // Модель ученика
const { v4: uuidv4 } = require('uuid');

router.post('/students', async (req, res) => {
    try {
        const { name, username, password, classId } = req.body;

        
        if (!name || !username || !password || !classId) {
            return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
        }
        // Генерация никнейма и пароля


        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание записи в таблице Users
        const newUser = await User.create({
            username,
            password: hashedPassword,
            role: 'student'
        });

        // Привязка ученика к классу и создание записи в таблице Students
        const newStudent = {
            name,
            username,
            password, // Возможно, нужно зашифровать пароль перед сохранением
            classId
        };

        // Возвращаем JSON-ответ
        res.status(201).json({ message: "Ученик добавлен", username, password });
    } catch (error) {
        console.error('Ошибка при добавлении ученика:', error);
        res.status(500).json({ error: 'Ошибка при добавлении ученика' });
    }
});


app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Поиск пользователя в базе данных
        const user = await findUserByUsername(username);

        if (user && user.password === password) { // Сравниваем пароли, не забывайте о хэшировании на практике!
            res.json({ role: user.role });
        } else {
            res.status(401).json({ message: 'Неверные никнейм или пароль' });
        }
    } catch (error) {
        console.error('Ошибка при авторизации:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});
