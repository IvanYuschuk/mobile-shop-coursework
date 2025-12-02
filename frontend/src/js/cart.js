import iziToast from "izitoast";
import 'izitoast/dist/css/iziToast.min.css';

// Ключ для збереження в LocalStorage
const CART_KEY = 'mobi_shop_cart';

// Отримуємо поточний кошик або пустий масив
export function getCart() {
    const json = localStorage.getItem(CART_KEY);
    return json ? JSON.parse(json) : [];
}

// Зберігаємо кошик
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCounter(); // Оновлюємо лічильник у шапці
}

// === ДОДАТИ ТОВАР ===
export function addToCart(product) {
    const cart = getCart();
    
    // Перевіряємо, чи є вже такий товар
    const existingItem = cart.find(item => item.id === product.id && item.type === product.type);
    
    if (existingItem) {
        existingItem.quantity += 1; // Якщо є - збільшуємо кількість
    } else {
        // Якщо немає - додаємо новий об'єкт (беремо тільки потрібні поля)
        cart.push({
            id: product.id,
            type: product.type,
            brand: product.brand,
            model: product.model,
            price: parseFloat(product.price),
            image_url: product.image_url,
            quantity: 1
        });
    }
    
    saveCart(cart);
    
    // Красиве повідомлення замість alert
    iziToast.success({
        title: 'Додано!',
        message: `Товар "${product.model}" додано у кошик`,
        position: 'topCenter',
        timeout: 3000
    });
}

// === ВИДАЛИТИ ТОВАР ===
export function removeFromCart(id, type) {
    let cart = getCart();
    // Фільтруємо, залишаючи все КРІМ цього товару
    cart = cart.filter(item => !(item.id === id && item.type === type));
    saveCart(cart);
    renderCartModal(); // Перемальовуємо вікно кошика
    
    // Можна додати сповіщення про видалення
    iziToast.info({
        message: 'Товар видалено з кошика',
        position: 'topRight',
        timeout: 2000
    });
}

// === ЗМІНИТИ КІЛЬКІСТЬ (+/-) ===
export function changeQuantity(id, type, change) {
    const cart = getCart();
    const item = cart.find(item => item.id === id && item.type === type);
    
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id, type); // Якщо стало 0 - видаляємо
            return;
        }
    }
    saveCart(cart);
    renderCartModal();
}

// === ОЧИСТИТИ КОШИК ===
export function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartCounter();
    renderCartModal();
    
    iziToast.info({
        message: 'Кошик очищено',
        position: 'topRight'
    });
}

// === ОНОВИТИ ЛІЧИЛЬНИК У ШАПЦІ ===
export function updateCartCounter() {
    const cart = getCart();
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.innerText = totalCount;
        badge.classList.remove('d-none');
        if (totalCount === 0) badge.classList.add('d-none');
    }
}

// === МАЛЮВАННЯ КОШИКА (HTML) ===
export function renderCartModal() {
    const cart = getCart();
    const container = document.getElementById('cart-items-container');
    const totalElem = document.getElementById('cart-total-price');
    
    if (!container) return;

    container.innerHTML = '';
    let totalSum = 0;

    if (cart.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fa-solid fa-basket-shopping fa-3x mb-3"></i><p>Кошик порожній</p></div>';
        if(totalElem) totalElem.innerText = '0 ₴';
        return;
    }

    cart.forEach(item => {
        const itemSum = item.price * item.quantity;
        totalSum += itemSum;

        container.innerHTML += `
            <div class="d-flex align-items-center mb-3 border-bottom pb-3">
                <img src="${item.image_url || 'https://via.placeholder.com/50'}" 
                     style="width: 60px; height: 60px; object-fit: contain;" class="me-3 border rounded">
                
                <div class="flex-grow-1">
                    <h6 class="mb-0 fw-bold">${item.brand} ${item.model}</h6>
                    <small class="text-muted">${item.price} ₴ x ${item.quantity}</small>
                </div>

                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-secondary px-2" onclick="window.cartChange(${item.id}, '${item.type}', -1)">-</button>
                    <span class="mx-2 fw-bold" style="min-width: 20px; text-align: center;">${item.quantity}</span>
                    <button class="btn btn-sm btn-outline-secondary px-2" onclick="window.cartChange(${item.id}, '${item.type}', 1)">+</button>
                </div>

                <div class="ms-3 text-end" style="min-width: 80px;">
                    <div class="fw-bold text-primary">${itemSum} ₴</div>
                    <button class="btn btn-link text-danger p-0 small text-decoration-none" onclick="window.cartRemove(${item.id}, '${item.type}')">
                        <small>Видалити</small>
                    </button>
                </div>
            </div>
        `;
    });

    if(totalElem) totalElem.innerText = `${totalSum} ₴`;
}