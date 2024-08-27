const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('./db'); // ваш модуль подключения к базе данных

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/public')));

// Сессии
const MemoryStore = require('memorystore')(session);

app.use(session({
    cookie: { maxAge: 86400000 }, // Сессия хранится 1 день
    store: new MemoryStore({
        checkPeriod: 86400000 // Чистим старые сессии ежедневно
    }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
}));

const PORT = process.env.PORT || 3001;

// Хелпер для обработки ошибок
const handleError = (err, res, message = 'Server error') => {
    console.error(message, err);
    res.status(500).send(message);
};

// Регистрация пользователя
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
            [username, hashedPassword, role]
        );
        
        console.log('New user ID:', result.rows[0].id);  // Логирование ID нового пользователя
        res.status(201).send('User registered');
    } catch (err) {
        handleError(err, res, 'Error registering user');
    }
});
app.get('/student/dashboard', authenticateSession, authorizeRole('student'), async (req, res) => {
    try {
        // Логируем user_id из сессии
        console.log('User ID from session:', req.session.userId);

        // Получаем student_id по user_id
        const studentResult = await pool.query('SELECT id, name FROM students WHERE user_id = $1', [req.session.userId]);
        console.log('Student query result:', studentResult.rows);

        if (studentResult.rows.length === 0) {
            return res.status(404).send('Student not found');
        }

        const student = studentResult.rows[0];
        console.log('Student:', student);

        // Получаем оценки студента по его student_id
        const gradesResult = await pool.query('SELECT grade, date FROM grades WHERE student_id = $1 ORDER BY date', [student.id]);
        console.log('Grades query result:', gradesResult.rows);

        res.json({
            student: {
                name: student.name,
                grades: gradesResult.rows
            }
        });
    } catch (err) {
        console.error('Error fetching student dashboard:', err);
        res.status(500).send('Error fetching student dashboard');
    }
});


// Авторизация пользователя
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT id, password, role FROM users WHERE username = $1', [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];

            const match = await bcrypt.compare(password, user.password);

            if (match) {
                req.session.userId = user.id;
                req.session.role = user.role;
                req.session.username = username;
                res.status(200).json({ message: 'Logged in successfully', role: user.role });
            } else {
                res.status(401).json({ error: 'Invalid username or password' });
            }
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (err) {
        handleError(err, res, 'Error during login');
    }
});

app.post('/register/student', async (req, res) => {
    const { name, classId, username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const userResult = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
            [username, hashedPassword, 'student']
        );

        const userId = userResult.rows[0].id;

        await pool.query(
            'INSERT INTO students (name, class_id, user_id) VALUES ($1, $2, $3)',
            [name, classId, userId]
        );

        res.status(201).send('Student registered successfully');
    } catch (err) {
        console.error('Error registering student:', err);
        res.status(500).send('Error registering student');
    }
});


// Выход пользователя
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return handleError(err, res, 'Ошибка при выходе');
        }
        res.status(200).send('Выход выполнен успешно');
    });
});

// Middleware для проверки аутентификации
function authenticateSession(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).send('Not authenticated');
    }
    next();
}

// Middleware для проверки роли
function authorizeRole(role) {
    return (req, res, next) => {
        if (req.session.role !== role) {
            return res.status(403).send('Forbidden');
        }
        next();
    };
}

// Пример защищенного маршрута
app.get('/api/protected', authenticateSession, (req, res) => {
    res.json({ message: 'This is protected data', user: req.session.username });
});

// Маршруты для работы с классами
app.route('/api/classes')
    .get(authenticateSession, async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM classes');
            res.json(result.rows);
        } catch (err) {
            handleError(err, res);
        }
    })
    .post(authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { name } = req.body;
        try {
            await pool.query('INSERT INTO classes (name) VALUES ($1)', [name]);
            res.status(201).send('Class added');
        } catch (err) {
            handleError(err, res);
        }
    });

app.route('/api/classes/:id')
    .put(authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        try {
            const result = await pool.query('UPDATE classes SET name = $1 WHERE id = $2', [name, id]);
            if (result.rowCount === 0) {
                return res.status(404).send('Class not found');
            }
            res.status(200).send('Class updated');
        } catch (err) {
            handleError(err, res);
        }
    })
    .delete(authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM grades WHERE student_id IN (SELECT id FROM students WHERE class_id = $1)', [id]);
            await client.query('DELETE FROM students WHERE class_id = $1', [id]);
            const result = await client.query('DELETE FROM classes WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).send('Class not found');
            }
            await client.query('COMMIT');
            res.status(200).send('Class and related records deleted successfully');
        } catch (err) {
            await client.query('ROLLBACK');
            handleError(err, res, 'Error deleting class');
        } finally {
            client.release();
        }
    });

// Работа со студентами
app.route('/api/classes/:classId/students')
    .get(authenticateSession, async (req, res) => {
        const { classId } = req.params;
        try {
            const result = await pool.query('SELECT * FROM students WHERE class_id = $1', [classId]);
            res.json(result.rows);
        } catch (err) {
            handleError(err, res);
        }
    });

app.route('/api/students')
    .post(authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { name, classId, username, password } = req.body;

        try {
            // Хешируем пароль
            const hashedPassword = await bcrypt.hash(password, 10);

            // Вставляем данные в таблицу пользователей
            const userResult = await pool.query(
                'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
                [username, hashedPassword, 'student']
            );

            const userId = userResult.rows[0].id;

            // Вставляем данные в таблицу студентов
            await pool.query(
                'INSERT INTO students (name, class_id, user_id) VALUES ($1, $2, $3)',
                [name, classId, userId]
            );

            res.status(201).send('Student added and registered');
        } catch (err) {
            handleError(err, res, 'Error adding student');
        }
    });

app.route('/api/students/:studentId')
    .put(authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { studentId } = req.params;
        const { name } = req.body;
        try {
            const result = await pool.query('UPDATE students SET name = $1 WHERE id = $2', [name, studentId]);
            if (result.rowCount === 0) {
                return res.status(404).send('Student not found');
            }
            res.status(200).send('Student name updated');
        } catch (err) {
            handleError(err, res, 'Error updating student name');
        }
    })
    .delete(authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { studentId } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM grades WHERE student_id = $1', [studentId]);
            const result = await client.query('DELETE FROM students WHERE id = $1', [studentId]);
            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).send('Student not found');
            }
            await client.query('COMMIT');
            res.status(200).send('Student deleted successfully');
        } catch (err) {
            await client.query('ROLLBACK');
            handleError(err, res, 'Error deleting student');
        } finally {
            client.release();
        }
    });

// Работа с оценками
app.route('/api/students/:studentId/grades')
    .get(authenticateSession, async (req, res) => {
        const { studentId } = req.params;
        try {
            const result = await pool.query('SELECT * FROM grades WHERE student_id = $1 ORDER BY date', [studentId]);
            res.json(result.rows);
        } catch (err) {
            handleError(err, res);
        }
    });
    app.post('/api/grades', authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { studentId, grade, date } = req.body;
    
        try {
            await pool.query('INSERT INTO grades (student_id, grade, date) VALUES ($1, $2, $3)', [studentId, grade, date]);
            res.status(201).send('Grade added');
        } catch (err) {
            console.error('Error adding grade:', err);
            res.status(500).send('Error adding grade');
        }
    });
    // Получение оценок студента
    app.get('/api/students/:studentId/grades', authenticateSession, async (req, res) => {
        const { studentId } = req.params;
        try {
            const result = await pool.query('SELECT * FROM grades WHERE student_id = $1 ORDER BY date', [studentId]);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    });
    

app.route('/api/grades')
    .post(authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { studentId, grade, date } = req.body;
        try {
            if (!studentId || !grade || !date) {
                return res.status(400).send('All fields are required');
            }
            await pool.query('INSERT INTO grades (student_id, grade, date) VALUES ($1, $2, $3)', [studentId, grade, date]);
            res.status(201).send('Grade added');
        } catch (err) {
            handleError(err, res);
        }
    });

app.route('/api/grades/:gradeId')
    .put(authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { gradeId } = req.params;
        const { grade, date } = req.body;
        try {
            await pool.query('UPDATE grades SET grade = $1, date = $2 WHERE id = $3', [grade, date, gradeId]);
            res.status(200).send('Grade updated');
        } catch (err) {
            handleError(err, res);
        }
    })
    .delete(authenticateSession, authorizeRole('teacher'), async (req, res) => {
        const { gradeId } = req.params;
        try {
            await pool.query('DELETE FROM grades WHERE id = $1', [gradeId]);
            res.status(200).send('Grade deleted');
        } catch (err) {
            handleError(err, res);
        }
    });

// Личный кабинет студента
app.get('/student/dashboard', authenticateSession, authorizeRole('student'), async (req, res) => {
    try {
        const studentResult = await pool.query('SELECT id, name FROM students WHERE user_id = $1', [req.session.userId]);

        if (studentResult.rows.length === 0) {
            return res.status(404).send('Student not found');
        }

        const student = studentResult.rows[0];

        const gradesResult = await pool.query('SELECT grade, date FROM grades WHERE student_id = $1 ORDER BY date', [student.id]);

        res.json({
            student: {
                name: student.name,
                grades: gradesResult.rows
            }
        });
    } catch (err) {
        console.error('Error fetching student dashboard:', err);
        res.status(500).send('Error fetching student dashboard');
    }
});

// Маршрут для обработки корневого запроса
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
