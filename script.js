// Инициализация Telegram WebApp
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// DOM элементы
const sendBtn = document.getElementById('sendBtn');
const queryInput = document.getElementById('query');
const chatContainer = document.getElementById('chatContainer');
const greeting = document.getElementById('greeting');
const chatList = document.getElementById('chatList');
const closeChatBtn = document.getElementById('closeChatBtn');
const modelIsland = document.getElementById('modelIsland');
const currentModelLabel = document.getElementById('currentModelLabel');

// Данные пользователя
const user = Telegram.WebApp.initDataUnsafe?.user;

// Модели
const modelMap = {
    "gpt-5-chat-latest": "GPT-5 Chat",
    "gpt-5-thinking-all": "GPT-5 Thinking",
    "gemini-2.5-pro": "Gemini 2.5 Pro",
    "grok-4-fast": "Grok-4 Fast",
    "grok-4": "Grok-4",
    "grok-3-reasoner": "Grok-3 Reasoner",
    "claude-sonnet-4-5-20250929": "Claude Sonnet",
    "claude-sonnet-4-5-20250929-thinking": "Claude Sonnet (Thinking)"
};

let currentModel = "gpt-5-chat-latest";

// Создание меню выбора модели
const modelMenu = document.createElement('div');
modelMenu.className = 'model-menu';

Object.entries(modelMap).forEach(([value, label]) => {
    const item = document.createElement('div');
    item.className = 'model-menu-item';
    item.textContent = label;
    item.addEventListener('click', () => {
        currentModel = value;
        currentModelLabel.textContent = label;
        modelMenu.classList.remove('visible');
    });
    modelMenu.appendChild(item);
});

modelIsland.appendChild(modelMenu);

// Переключение меню
modelIsland.addEventListener('click', (e) => {
    if (modelMenu.contains(e.target)) return;
    modelMenu.classList.toggle('visible');
});

// Закрытие меню при клике вне
document.addEventListener('click', (e) => {
    if (!modelIsland.contains(e.target)) {
        modelMenu.classList.remove('visible');
    }
});

// Открытие/закрытие списка чатов
document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('menu-btn')) {
        chatList.classList.add('visible');
    } else if (closeChatBtn.contains(e.target) || !chatList.contains(e.target)) {
        chatList.classList.remove('visible');
    }
});

// Добавление сообщения
function addMessage(text, isUser = false) {
    const div = document.createElement('div');
    div.classList.add('message');
    if (isUser) div.classList.add('user');
    div.textContent = text;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Отправка запроса
async function sendRequest() {
    const query = queryInput.value.trim();
    if (!query) return;

    // Убираем приветствие после первого запроса
    greeting.classList.add('hidden');

    // Добавляем запрос пользователя (справа)
    addMessage(query, true);
    queryInput.value = '';

    // Показываем индикатор загрузки (слева)
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message');
    loadingDiv.textContent = '⏳ Обработка...';
    chatContainer.appendChild(loadingDiv);

    try {
        const res = await fetch('https://my-ai-miniapp.onrender.com/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                query,
                user_id: user?.id || 'anonymous'
            })
        });

        const data = await res.json();
        chatContainer.removeChild(loadingDiv); // удаляем "Обработка..."

        if (res.ok) {
            // Добавляем ответ бота (слева)
            addMessage(data.answer || 'Пустой ответ');
        } else {
            addMessage(`❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`);
        }
    } catch (e) {
        chatContainer.removeChild(loadingDiv);
        addMessage(`❌ Ошибка подключения: ${e.message}`);
    }
}

// Обработчики
sendBtn.addEventListener('click', sendRequest);
queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendRequest();
    }
});

// Скрываем кнопку Telegram MainButton
Telegram.WebApp.MainButton.hide();