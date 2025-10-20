// Инициализация Telegram WebApp
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// Элементы DOM
const sendBtn = document.getElementById('sendBtn');
const queryInput = document.getElementById('query');
const responseDiv = document.getElementById('response');
const chatContainer = document.getElementById('chatContainer');
const modelSelect = document.getElementById('model');
const chatList = document.getElementById('chatList');
const openChatBtn = document.getElementById('openChatBtn');
const closeChatBtn = document.getElementById('closeChatBtn');

// Получаем данные пользователя (опционально)
const user = Telegram.WebApp.initDataUnsafe?.user;

// Функция для добавления сообщения в чат
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (isUser) {
        messageDiv.classList.add('user');
    } else {
        messageDiv.classList.add('bot');
    }
    messageDiv.textContent = text;
    chatContainer.appendChild(messageDiv);
    // Прокручиваем вниз
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Функция для отправки запроса
async function sendRequest() {
    const model = modelSelect.value;
    const query = queryInput.value.trim();

    if (!query) {
        alert('Введите запрос!');
        return;
    }

    // Добавляем сообщение пользователя
    addMessage(query, true);

    sendBtn.disabled = true;
    // Показываем индикатор загрузки
    addMessage('⏳ Обработка...', false);

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
            chatContainer.lastChild.remove();
            // Добавляем ответ бота
            addMessage(data.answer || 'Пустой ответ', false);
        } else {
            // Удаляем предыдущее сообщение "Обработка..."
            chatContainer.lastChild.remove();
            addMessage(`❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`, false);
        }
    } catch (e) {
        // Удаляем предыдущее сообщение "Обработка..."
        chatContainer.lastChild.remove();
        addMessage(`❌ Ошибка подключения: ${e.message}`, false);
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
Telegram.WebApp.MainButton.setText("Отправить");
Telegram.WebApp.MainButton.show();
Telegram.WebApp.MainButton.onClick(sendRequest);

// Делаем так, чтобы при клике вне списка чатов он закрывался (для мобильных)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !chatList.contains(e.target) && !openChatBtn.contains(e.target)) {
        chatList.classList.add('hidden');
        chatList.classList.remove('visible');
    }
});