import '../css/style.css';
import { getCart, clearCart } from './cart.js';
import iziToast from "izitoast";
import 'izitoast/dist/css/iziToast.min.css';

const API_URL = 'http://127.0.0.1:5000/api/orders';

document.addEventListener('DOMContentLoaded', () => {
    const cart = getCart();
    
    // Перевірка на порожній кошик
    if (cart.length === 0) {
        iziToast.warning({
            title: 'Кошик порожній',
            message: 'Додайте товари перед оформленням замовлення.',
            position: 'topRight',
            timeout: 5000
        });
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000); // Даємо 2 сек прочитати повідомлення перед переходом
        return;
    }

    renderCheckoutCart(cart);
});

// Відображення списку товарів збоку
function renderCheckoutCart(cart) {
    const list = document.getElementById('checkout-cart-list');
    const totalElem = document.getElementById('checkout-total');
    const countElem = document.getElementById('cart-count');
    
    let totalSum = 0;
    let totalCount = 0;
    list.innerHTML = '';

    cart.forEach(item => {
        const sum = item.price * item.quantity;
        totalSum += sum;
        totalCount += item.quantity;

        list.innerHTML += `
            <li class="list-group-item d-flex justify-content-between lh-sm">
                <div class="me-3">
                    <h6 class="my-0 text-truncate" style="max-width: 200px;">${item.brand} ${item.model}</h6>
                    <small class="text-muted">${item.quantity} шт. x ${item.price} ₴</small>
                </div>
                <span class="text-muted fw-bold text-nowrap">${sum} ₴</span>
            </li>
        `;
    });

    totalElem.innerText = `${totalSum} ₴`;
    countElem.innerText = totalCount;
}

// Обробка форми замовлення
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const cart = getCart();
    
    const orderData = {
        fullName: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        delivery: document.querySelector('input[name="deliveryMethod"]:checked').value,
        payment: document.querySelector('input[name="paymentMethod"]:checked').value,
        cart: cart
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (response.ok) {
            // УСПІХ
            iziToast.success({
                title: 'Замовлення прийнято!',
                message: `Номер вашого замовлення: #${result.order_id}`,
                position: 'center', // Покажемо по центру для важливості
                timeout: 5000,
                overlay: true, // Затеняет фон
                onClosing: () => {
                    clearCart();
                    window.location.href = '/index.html';
                }
            });
        } else {
            // ПОМИЛКА СЕРВЕРА
            iziToast.error({
                title: 'Помилка',
                message: result.error || 'Щось пішло не так',
                position: 'topRight'
            });
        }
    } catch (error) {
        console.error(error);
        // ПОМИЛКА МЕРЕЖІ
        iziToast.error({
            title: 'Помилка з\'єднання',
            message: 'Не вдалося зв\'язатися з сервером. Перевірте інтернет.',
            position: 'topRight'
        });
    }
});