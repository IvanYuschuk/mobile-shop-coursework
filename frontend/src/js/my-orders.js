import '../css/style.css';

const API_URL = 'http://127.0.0.1:5000/api/client/orders';

document.getElementById('search-order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('phone-input').value;
    const resultsArea = document.getElementById('results-area');
    const errorArea = document.getElementById('error-area');
    const ordersList = document.getElementById('orders-list');
    
    // Скидаємо видимість
    resultsArea.classList.add('d-none');
    errorArea.classList.add('d-none');
    ordersList.innerHTML = '';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        });

        const data = await response.json();

        if (response.ok) {
            // УСПІХ
            document.getElementById('client-name').innerText = data.client;
            resultsArea.classList.remove('d-none');

            if (data.orders.length === 0) {
                ordersList.innerHTML = '<div class="text-center text-muted">У вас поки немає замовлень.</div>';
                return;
            }

            // Малюємо кожне замовлення
            data.orders.forEach(order => {
                const date = new Date(order.order_date).toLocaleDateString('uk-UA');
                
                // Формуємо список товарів всередині замовлення
                let itemsHtml = '';
                order.items.forEach(item => {
                    itemsHtml += `
                        <div class="d-flex align-items-center mb-2 border-bottom pb-2">
                            <img src="${item.image_url || 'https://via.placeholder.com/40'}" 
                                 style="width: 50px; height: 50px; object-fit: contain;" class="me-3 bg-white border rounded">
                            <div class="flex-grow-1">
                                <div class="small fw-bold">${item.product_name}</div>
                                <div class="small text-muted">${item.quantity} шт. x ${item.price_at_purchase} ₴</div>
                            </div>
                            <div class="fw-bold">${item.quantity * item.price_at_purchase} ₴</div>
                        </div>
                    `;
                });

                // Визначаємо колір статусу
                let statusBadge = 'bg-secondary';
                if (order.status === 'New') statusBadge = 'bg-primary';
                if (order.status === 'Completed') statusBadge = 'bg-success';
                if (order.status === 'Cancelled') statusBadge = 'bg-danger';

                const orderHtml = `
                    <div class="card shadow-sm mb-4 border-0">
                        <div class="card-header bg-white d-flex justify-content-between align-items-center py-3">
                            <div>
                                <span class="fw-bold me-2">Замовлення #${order.order_id}</span>
                                <span class="badge ${statusBadge}">${order.status}</span>
                            </div>
                            <div class="text-muted small">
                                <i class="fa-regular fa-calendar me-1"></i> ${date}
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                ${itemsHtml}
                            </div>
                            <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                                <div class="small text-muted">
                                    <i class="fa-solid fa-truck me-1"></i> ${order.delivery_method} <br>
                                    <i class="fa-solid fa-location-dot me-1"></i> ${order.delivery_address || 'Адреса не вказана'}
                                </div>
                                <div class="fs-5 fw-bold text-primary">
                                    Сума: ${order.total_amount} ₴
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                ordersList.innerHTML += orderHtml;
            });

        } else {
            // ПОМИЛКА (наприклад, клієнта не знайдено)
            errorArea.classList.remove('d-none');
            document.getElementById('error-text').innerText = data.error;
        }

    } catch (error) {
        console.error(error);
        errorArea.classList.remove('d-none');
        document.getElementById('error-text').innerText = "Помилка з'єднання з сервером";
    }
});
