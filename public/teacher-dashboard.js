document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html'; // Перенаправляем на страницу входа
        return;
    }

    try {
        const response = await fetch('/api/protected', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const { user } = await response.json();
            if (user.role === 'teacher') {
                document.getElementById('teacher-dashboard').style.display = 'block';
                // Логика загрузки данных и обработки формы
                document.getElementById('add-class-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const className = document.getElementById('class-name').value.trim();
                    try {
                        const response = await fetch('/api/add-class', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ className })
                        });
                        if (response.ok) {
                            alert('Класс добавлен');
                        } else {
                            alert('Ошибка добавления класса');
                        }
                    } catch (error) {
                        console.error('Ошибка:', error);
                        alert('Ошибка добавления класса');
                    }
                });
            } else {
                alert('Доступ запрещен');
                window.location.href = 'index.html'; // Перенаправляем на страницу входа
            }
        } else {
            alert('Ошибка получения данных');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка получения данных');
    }
});
