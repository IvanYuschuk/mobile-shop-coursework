// frontend/src/js/login.js
import '../css/style.css'; // Щоб підтягнулися шрифти, якщо треба

const LOGIN_API = 'http://127.0.0.1:5000/api/login';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Зупиняємо перезавантаження сторінки

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorBox = document.getElementById('error-msg');

    // Очищаємо помилки
    errorBox.classList.add('d-none');
    errorBox.innerText = '';

    try {
        const response = await fetch(LOGIN_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            // 1. Зберігаємо мітку, що ми адмін
            localStorage.setItem('isAdmin', 'true');
            
            // 2. Переходимо в адмінку
            window.location.href = '/dashboard.html';
        } else {
            // Показуємо помилку
            errorBox.innerText = result.error;
            errorBox.classList.remove('d-none');
        }

    } catch (error) {
        console.error(error);
        errorBox.innerText = "Помилка з'єднання з сервером";
        errorBox.classList.remove('d-none');
    }
});