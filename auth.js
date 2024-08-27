document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginForm').addEventListener('submit', function(event) {
        event.preventDefault(); // предотвращаем отправку формы

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Пример простой проверки логина и пароля
        if (username === 'teacher' && password === 'teacher123') {
            // Если учитель
            window.location.href = 'teacher-dashboard.html';
        } else if (username === 'student' && password === 'student123') {
            // Если ученик
            window.location.href = 'student-dashboard.html';
        } else {
            alert('Invalid username or password');
        }
    });
});
