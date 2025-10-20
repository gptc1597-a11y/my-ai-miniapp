// Инициализация Telegram WebApp
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// Элементы DOM
const sendBtn = document.getElementById('sendBtn');
const queryInput = document.getElementById('query');
const chatContainer = document.getElementById('chatContainer');
const modelBtn = document.getElementById('modelBtn');
const chatList = document.getElementById('chatList');
const openChatBtn = document.getElementById('openChatBtn');
const closeChatBtn = document.getElementById('closeChatBtn');
const plusBtn = document.getElementById('plusBtn');

// Получаем данные пользователя (опционально)
const user = Telegram.WebApp.initDataUnsafe?.user;

// Текущая модель
let currentModel = "gpt-5-chat-latest";

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
    const query = queryInput.value.trim();

    if (!query) {
        alert('Введите запрос!');
        return;
    }

    // Убираем приветствие "Чем я могу помочь?"
    if (chatContainer.children.length === 1 && chatContainer.firstElementChild.tagName === 'H2') {
        chatContainer.innerHTML = '';
    }

    // Добавляем сообщение пользователя
    addMessage(query, true);

    sendBtn.disabled = true;
    // Показываем индикатор загрузки
    addMessage('⏳ Обработка...', false);

    try {
        const payload = {
            model: currentModel,
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

// Логика для кнопки выбора модели
modelBtn.addEventListener('click', () => {
    const models = [
        { value: "gpt-5-chat-latest", label: "ChatGPT" },
        { value: "gpt-5-thinking-all", label: "GPT-5 Thinking" },
        { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        { value: "grok-4-fast", label: "Grok-4 Fast" },
        { value: "grok-4", label: "Grok-4" },
        { value: "grok-3-reasoner", label: "Grok-3 Reasoner" },
        { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet" },
        { value: "claude-sonnet-4-5-20250929-thinking", label: "Claude Sonnet (Thinking)" }
    ];

    const selected = prompt(
        "Выберите модель:\n\n" +
        models.map((m, i) => `${i + 1}. ${m.label}`).join("\n"),
        "1"
    );

    if (selected && !isNaN(selected)) {
        const index = parseInt(selected) - 1;
        if (index >= 0 && index < models.length) {
            currentModel = models[index].value;
            modelBtn.textContent = models[index].label;
        }
    }
});

// Логика для кнопки "+"
plusBtn.addEventListener('click', () => {
    alert("Эта кнопка пока не реализована. Здесь можно добавить функции: создание изображений, работа с файлами и т.д.");
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