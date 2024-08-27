document.addEventListener('DOMContentLoaded', () => {
    
    // Функция для загрузки списка классов
    async function loadClasses() {
        try {
            const response = await fetch('/api/classes');
            if (response.ok) {
                const classes = await response.json();
                const classList = document.getElementById('class-list');
                classList.innerHTML = '';

                classes.forEach(c => {
                    const li = createListItem(c.name, c.id, 'class-item', loadStudents);
                    classList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Ошибка при загрузке классов:', error);
        }
    }

  // Получение оценок ученика из личного кабинета
  document.addEventListener('DOMContentLoaded', async () => {
    async function fetchStudentGrades(studentId) {
        try {
            const response = await fetch(`/api/students/${studentId}/grades`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Network response was not ok: ${response.status} - ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching grades:', error);
            return [];
        }
    }

    async function displayStudentGrades() {
        const studentId = localStorage.getItem('student_id'); // Assuming student ID is stored in localStorage
        if (!studentId) {
            console.error('No student ID found in localStorage');
            return;
        }

        const grades = await fetchStudentGrades(studentId);
        const gradesList = document.querySelector('#grades-table tbody');

        if (grades.length === 0) {
            gradesList.innerHTML = '<tr><td colspan="2">No grades available</td></tr>';
        } else {
            gradesList.innerHTML = grades.map(grade => 
                `<tr>
                    <td>${grade.grade}</td>
                    <td>${new Date(grade.date).toLocaleDateString()}</td>
                </tr>`
            ).join('');
        }
    }

    displayStudentGrades();
});




    // Функция для загрузки списка учеников
    async function loadStudents(classId) {
        try {
            const response = await fetch(`/api/classes/${classId}/students`);
            if (response.ok) {
                const students = await response.json();
                const studentsList = document.getElementById('students-list');
                studentsList.innerHTML = '';

                students.forEach(s => {
                    const li = createListItem(s.name, s.id, 'student-item', loadGrades);
                    studentsList.appendChild(li);
                });

                document.getElementById('class-students').style.display = 'block';
                document.getElementById('student-grades').style.display = 'none';
            }
        } catch (error) {
            console.error('Ошибка при загрузке учеников:', error);
        }
    }
    // Функция для загрузки оценок
    async function loadGrades(studentId) {
        try {
            const response = await fetch(`/api/students/${studentId}/grades`);
            if (response.ok) {
                const grades = await response.json();
                const gradesTableBody = document.querySelector('#grades-table tbody');
                gradesTableBody.innerHTML = '';

                grades.forEach(g => {
                    const tr = document.createElement('tr');
                    tr.dataset.id = g.id;
                    tr.innerHTML = `
                        <td class="grade">${g.grade}</td>
                        <td class="date">${new Date(g.date).toLocaleDateString()}</td>
                        <td>
                            <button class="edit-grade" data-grade-id="${g.id}">Изменить</button>
                            <button class="delete-grade" data-grade-id="${g.id}">Удалить</button>
                        </td>
                    `;
                    gradesTableBody.appendChild(tr);
                });

                document.getElementById('student-grades').style.display = 'block';
            }
        } catch (error) {
            console.error('Ошибка при загрузке оценок:', error);
        }
    }

    // Функция для создания элемента списка
    function createListItem(name, id, className, clickHandler) {
        const li = document.createElement('li');
        li.dataset.id = id;
        li.classList.add(className);

        li.innerHTML = `
            <span class="name">${name}</span>
            <button class="edit-${className.split('-')[0]}">Изменить</button>
            <button class="delete-${className.split('-')[0]}">Удалить</button>
        `;

        li.addEventListener('click', (event) => {
            if (event.target.tagName !== 'BUTTON') { // Чтобы игнорировать клики по кнопкам
                document.querySelectorAll(`.${className}`).forEach(el => el.classList.remove('selected'));
                li.classList.add('selected');
                clickHandler(id);
            }
        });

        return li;
    }


  const addClassButton = document.getElementById('add-class-button');
    if (addClassButton) {
        addClassButton.addEventListener('click', async () => {
            await addItem('class-name', '/api/classes', loadClasses);
        });
    }

    const addStudentButton = document.getElementById('add-student-button');
    if (addStudentButton) {
        addStudentButton.addEventListener('click', async () => {
            const selectedClass = document.querySelector('.class-item.selected');
            if (selectedClass) {
                const studentName = document.getElementById('student-name').value.trim();
                const studentUsername = document.getElementById('student-username').value.trim();
                const studentPassword = document.getElementById('student-password').value.trim();

                if (studentName && studentUsername && studentPassword) {
                    try {
                        const response = await fetch('/api/students', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: studentName,
                                username: studentUsername,
                                password: studentPassword,
                                classId: selectedClass.dataset.id
                            })
                        });

                        if (response.ok) {
                            const text = await response.text(); // Ожидаем ответ от сервера
                            alert(text); // Например, "Ученик добавлен"
                            loadStudents(selectedClass.dataset.id); // Обновляем список учеников
                        } else {
                            alert('Ошибка при добавлении ученика');
                        }
                    } catch (error) {
                        console.error('Ошибка при добавлении ученика:', error);
                        alert('Ошибка при добавлении ученика');
                    }
                } else {
                    alert('Заполните все поля');
                }
            } else {
                alert('Выберите класс');
            }
        });
    }

    // Обработчик добавления оценки
    const addGradeButton = document.getElementById('add-grade-button');
    if (addGradeButton) {
        addGradeButton.addEventListener('click', async () => {
            const selectedStudent = document.querySelector('.student-item.selected');
            if (selectedStudent) {
                const grade = document.getElementById('gradeInput').value;
                const date = document.getElementById('dateInput').value;
                if (grade && date) {
                    await addItem(null, '/api/grades', () => loadGrades(selectedStudent.dataset.id), {
                        studentId: selectedStudent.dataset.id,
                        grade,
                        date
                    });
                } else {
                    alert('Введите оценку и дату');
                }
            } else {
                alert('Выберите ученика');
            }
        });
    }
    // Обработка событий кликов по элементам (удаление, редактирование)
    document.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-grade')) {
            await deleteItem(event, 'grade', loadGrades);
        } else if (event.target.classList.contains('edit-grade')) {
            const trElement = event.target.closest('tr');
            console.log('TR element:', trElement);
            enableEditing(trElement, 'grade');
        } else if (event.target.classList.contains('delete-class')) {
            await deleteItem(event, 'class', loadClasses);
        } else if (event.target.classList.contains('edit-class')) {
            const liElement = event.target.closest('li');
            console.log('LI element:', liElement);
            enableEditing(liElement, 'class');
        } else if (event.target.classList.contains('delete-student')) {
            await deleteItem(event, 'student', loadStudents);
        } else if (event.target.classList.contains('edit-student')) {
            const liElement = event.target.closest('li');
            console.log('LI element:', liElement);
            enableEditing(liElement, 'student');
        }
    });

    // Функция редактирования элементов
    function enableEditing(listItem, itemType) {
        console.log('Редактируемый элемент:', listItem);

        let gradeElement;
        let dateElement;
        if (itemType === 'grade') {
            gradeElement = listItem.querySelector('.grade');
            dateElement = listItem.querySelector('.date');
        } else {
            gradeElement = listItem.querySelector('.name');
        }

        if (!gradeElement) {
            console.error('Элемент с классом не найден', listItem);
            return;
        }

        const oldGradeValue = gradeElement.textContent;
        const oldDateValue = itemType === 'grade' ? dateElement.textContent : null;

        gradeElement.innerHTML = `<input type="text" value="${oldGradeValue}" class="edit-input-grade">`;
        const inputGrade = gradeElement.querySelector('.edit-input-grade');
        inputGrade.focus();

        if (itemType === 'grade' && dateElement) {
            const formattedDate = formatDateForInput(oldDateValue); // Преобразуем дату для input[type="date"]
            dateElement.innerHTML = `<input type="date" value="${formattedDate}" class="edit-input-date">`;
        }

        let confirmButton;
        if (itemType === 'class') {
            confirmButton = listItem.querySelector('.edit-class');
        } else if (itemType === 'student') {
            confirmButton = listItem.querySelector('.edit-student');
        } else {
            confirmButton = listItem.querySelector('.edit-grade');
        }
        confirmButton.textContent = 'Сохранить';
        confirmButton.removeEventListener('click', enableEditing);

        confirmButton.addEventListener('click', async function saveChanges() {
            const newGradeValue = inputGrade.value.trim();
            const newDateValue = itemType === 'grade' ? listItem.querySelector('.edit-input-date').value : null;

            if (newGradeValue === oldGradeValue && (itemType !== 'grade' || newDateValue === oldDateValue)) {
                alert('Значения не изменились.');
                cancelEditing();
                return;
            }

            try {
                let updateUrl, updateData;
                if (itemType === 'class') {
                    updateUrl = `/api/classes/${listItem.dataset.id}`;
                    updateData = { name: newGradeValue };
                } else if (itemType === 'student') {
                    updateUrl = `/api/students/${listItem.dataset.id}`;
                    updateData = { name: newGradeValue };
                } else {
                    updateUrl = `/api/grades/${listItem.dataset.id}`;
                    updateData = { grade: newGradeValue, date: newDateValue };
                }

                const response = await fetch(updateUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    if (itemType === 'class') {
                        loadClasses();
                    } else if (itemType === 'student') {
                        const selectedClassId = document.querySelector('.class-item.selected').dataset.id;
                        loadStudents(selectedClassId);
                    } else {
                        const selectedStudentId = document.querySelector('.student-item.selected').dataset.id;
                        loadGrades(selectedStudentId);
                    }
                } else {
                    alert(`Ошибка при обновлении ${itemType}.`);
                    cancelEditing();
                }
            } catch (error) {
                console.error(`Ошибка при обновлении ${itemType}:`, error);
                alert(`Ошибка при обновлении ${itemType}.`);
                cancelEditing();
            }

            confirmButton.removeEventListener('click', saveChanges);
        });

        function cancelEditing() {
            if (itemType === 'class') {
                loadClasses();
            } else if (itemType === 'student') {
                const selectedClassId = document.querySelector('.class-item.selected').dataset.id;
                loadStudents(selectedClassId);
            } else {
                const selectedStudentId = document.querySelector('.student-item.selected').dataset.id;
                loadGrades(selectedStudentId);
            }
        }
    }

    function formatDateForInput(dateStr) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return `${year}-${month}-${day}`;
        }
        return '';
    }

    // Функция добавления элементов
    async function addItem(inputId, url, callback, data = null) {
        let itemName;
        if (inputId) {
            itemName = document.getElementById(inputId).value.trim();
            if (!itemName) {
                alert('Заполните поле');
                return;
            }
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data || { name: itemName })
            });

            if (response.ok) {
                await callback();
                if (inputId) {
                    document.getElementById(inputId).value = ''; // Очистить поле ввода
                }
            } else {
                alert('Ошибка при добавлении');
            }
        } catch (error) {
            console.error('Ошибка при добавлении:', error);
            alert('Ошибка при добавлении');
        }
    }

    // Функция удаления элементов
    async function deleteItem(event, itemType, callback) {
        const itemElement = event.target.closest(`.${itemType}-item`) || event.target.closest('tr');
        if (itemElement) {
            const itemId = itemElement.dataset.id;

            if (confirm(`Вы уверены, что хотите удалить ${itemType}?`)) {
                try {
                    const response = await fetch(`/api/${itemType}s/${itemId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        alert(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} удалён.`);
                        await callback();
                    } else {
                        alert(`Ошибка при удалении ${itemType}.`);
                    }
                } catch (error) {
                    console.error(`Ошибка при удалении ${itemType}:`, error);
                    alert(`Ошибка при удалении ${itemType}.`);
                }
            }
        }
    }


    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const response = await fetch('/student/dashboard');
            
            if (response.ok) {
                const data = await response.json();
                document.getElementById('student-name').textContent = data.student.name;
                const gradesTableBody = document.querySelector('#grades-table tbody');
                
                data.student.grades.forEach(grade => {
                    const row = document.createElement('tr');
                    const gradeCell = document.createElement('td');
                    const dateCell = document.createElement('td');
    
                    gradeCell.textContent = grade.grade;
                    dateCell.textContent = new Date(grade.date).toLocaleDateString();
    
                    row.appendChild(gradeCell);
                    row.appendChild(dateCell);
                    gradesTableBody.appendChild(row);
                });
            } else {
                console.error('Ошибка при загрузке данных:', response.statusText);
            }
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
        }
    });
    
    // Загрузка списка классов при загрузке страницы
    loadClasses();
});
