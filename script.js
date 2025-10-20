// Инициализация Telegram WebApp
Telegram.WebApp.ready();
Telegram.WebApp.expand();
Telegram.WebApp.MainButton.hide();

// Элементы DOM
const sendBtn = document.getElementById('sendBtn');
const queryInput = document.getElementById('query');
const chatContainer = document.getElementById('chatContainer');
const greeting = document.getElementById('greeting');
const modelIsland = document.getElementById('modelIsland');
const currentModelLabel = document.getElementById('currentModelLabel');

// Модели
const models = {
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

Object.entries(models).forEach(([value, label]) => {
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
    if (!modelMenu.contains(e.target)) {
        modelMenu.classList.toggle('visible');
        // Принудительно обновляем позицию меню
        setTimeout(() => {
            const rect = modelIsland.getBoundingClientRect();
            modelMenu.style.top = `${rect.height + 10}px`;
        }, 0);
    }
});

// Закрытие меню при клике вне
document.addEventListener('click', (e) => {
    if (!modelIsland.contains(e.target) && !modelMenu.contains(e.target)) {
        modelMenu.classList.remove('visible');
    }
});

// Добавление сообщения
function addMessage(text, isUser = false) {
    const div = document.createElement('div');
    div.className = `message${isUser ? ' user' : ''}`;
    div.textContent = text;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Отправка запроса
async function sendRequest() {
    const query = queryInput.value.trim();
    if (!query) return;

    // Скрываем приветствие
    greeting.classList.add('hidden');

    // Запрос пользователя
    addMessage(query, true);
    queryInput.value = '';

    // Индикатор загрузки
    const loading = document.createElement('div');
    loading.className = 'message';
    loading.textContent = '⏳ Обработка...';
    chatContainer.appendChild(loading);

    try {
        const res = await fetch('https://my-ai-miniapp.onrender.com/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                query,
                user_id: Telegram.WebApp.initDataUnsafe?.user?.id || 'anonymous'
            })
        });

        const data = await res.json();
        chatContainer.removeChild(loading);

        if (res.ok) {
            addMessage(data.answer || 'Пустой ответ');
        } else {
            addMessage(`❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`);
        }
    } catch (e) {
        chatContainer.removeChild(loading);
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