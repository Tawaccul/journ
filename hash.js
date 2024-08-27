const bcrypt = require('bcrypt');
const saltRounds = 10;

async function createUser(name, email, password, role) {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Используйте ваш метод для вставки в базу данных
    // Например, используя pg-promise
    await db.none('INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4)', [name, email, role, hashedPassword]);
}

// Пример использования
createUser('John Doe', 'john.doe@example.com', 'securePassword123', 'student');
createUser('Jane Smith', 'jane.smith@example.com', 'anotherSecurePassword456', 'teacher');
