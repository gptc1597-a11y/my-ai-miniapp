// Инициализация Telegram WebApp
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// Элементы DOM
const sendBtn = document.getElementById('sendBtn');
const queryInput = document.getElementById('query');
const chatContainer = document.getElementById('chatContainer');
const modelSelect = document.getElementById('model');
const chatList = document.getElementById('chatList');
const openChatBtn = document.getElementById('openChatBtn');
const closeChatBtn = document.getElementById('closeChatBtn');

// Получаем данные пользователя (опционально)
const user = Telegram.WebApp.initDataUnsafe?.user;

// Функция для отправки запроса
async function sendRequest() {
    const model = modelSelect.value;
    const query = queryInput.value.trim();

    if (!query) {
        alert('Введите запрос!');
        return;
    }

    // Очищаем приветствие
    chatContainer.innerHTML = '';

    sendBtn.disabled = true;
    // Показываем индикатор загрузки
    const loadingDiv = document.createElement('div');
    loadingDiv.textContent = '⏳ Обработка...';
    chatContainer.appendChild(loadingDiv);

    try {
        const payload = {
            model: model,
            query: query,
            user_id: user?.id || 'anonymous'
        };

        const res = await fetch('https://my-ai-miniapp.onrender.com/api/ask', { // Исправленный URL!
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            // Удаляем предыдущее сообщение "Обработка..."
            chatContainer.removeChild(loadingDiv);
            // Добавляем ответ бота
            const responseDiv = document.createElement('div');
            responseDiv.style.padding = '1rem';
            responseDiv.style.borderRadius = '8px';
            responseDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            responseDiv.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            responseDiv.textContent = data.answer || 'Пустой ответ';
            chatContainer.appendChild(responseDiv);
        } else {
            // Удаляем предыдущее сообщение "Обработка..."
            chatContainer.removeChild(loadingDiv);
            const errorDiv = document.createElement('div');
            errorDiv.style.padding = '1rem';
            errorDiv.style.borderRadius = '8px';
            errorDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            errorDiv.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            errorDiv.textContent = `❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`;
            chatContainer.appendChild(errorDiv);
        }
    } catch (e) {
        // Удаляем предыдущее сообщение "Обработка..."
        chatContainer.removeChild(loadingDiv);
        const errorDiv = document.createElement('div');
        errorDiv.style.padding = '1rem';
        errorDiv.style.borderRadius = '8px';
        errorDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        errorDiv.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        errorDiv.textContent = `❌ Ошибка подключения: ${e.message}`;
        chatContainer.appendChild(errorDiv);
    } finally {
        sendBtn.disabled = false;
        queryInput.value = '';
        queryInput.focus();
    }
}

// Обработчики событий
sendBtn.addEventListener('click', sendRequest);
queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendRequest();
    }
});

// Логика для списка чатов
openChatBtn.addEventListener('click', () => {
    chatList.classList.remove('hidden');
    // Для мобильных
    if (window.innerWidth <= 768) {
        chatList.classList.add('visible');
    }
});

closeChatBtn.addEventListener('click', () => {
    chatList.classList.add('hidden');
    // Для мобильных
    if (window.innerWidth <= 768) {
        chatList.classList.remove('visible');
    }
});

// Поддержка кнопки "Отправить" внизу экрана (Telegram MainButton)
Telegram.WebApp.MainButton.hide(); // Скрываем главную кнопку Telegram

// Делаем так, чтобы при клике вне списка чатов он закрывался (для мобильных)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !chatList.contains(e.target) && !openChatBtn.contains(e.target)) {
        chatList.classList.add('hidden');
        chatList.classList.remove('visible');
    }
});