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

// Автоматическое изменение высоты текстового поля
const BASE_TEXTAREA_HEIGHT = 64;
const MAX_TEXTAREA_RATIO = 0.33;

function autoResizeTextarea() {
    const maxHeight = Math.floor(window.innerHeight * MAX_TEXTAREA_RATIO);
    const minHeight = BASE_TEXTAREA_HEIGHT;
    queryInput.style.height = 'auto';
    const next = Math.min(maxHeight, Math.max(minHeight, queryInput.scrollHeight));
    queryInput.style.height = `${next}px`;
}

// Модели
const models = [
    { id: "gpt-5-chat-latest", label: "GPT-5 Chat", tag: "GPT", icon: "✦" },
    { id: "gpt-5-thinking-all", label: "GPT-5 Thinking", tag: "GPT", icon: "✦" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tag: "Gemini", icon: "🜚" },
    { id: "grok-4-fast", label: "Grok-4 Fast", tag: "Grok", icon: "⚡" },
    { id: "grok-4", label: "Grok-4", tag: "Grok", icon: "⚡" },
    { id: "grok-3-reasoner", label: "Grok-3 Reasoner", tag: "Grok", icon: "⚡" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet", tag: "Claude", icon: "✺" },
    { id: "claude-sonnet-4-5-20250929-thinking", label: "Claude Sonnet (Thinking)", tag: "Claude", icon: "✺" }
];

let currentModel = "grok-4-fast";

// Создание меню выбора модели
const modelMenu = document.createElement('div');
modelMenu.className = 'model-menu';

function renderModelMenu() {
    modelMenu.innerHTML = '';
    models.forEach((model) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `model-menu-item${model.id === currentModel ? ' active' : ''}`;
        item.innerHTML = `
            <span class="icon">${model.icon}</span>
            <span class="info">
                <span class="name">${model.label}</span>
                <span class="tag">${model.tag}</span>
            </span>
            <span class="dot"></span>
        `;
        item.addEventListener('click', () => {
            currentModel = model.id;
            currentModelLabel.textContent = model.label;
            renderModelMenu();
            modelMenu.classList.remove('visible');
        });
        modelMenu.appendChild(item);
    });
}

renderModelMenu();
currentModelLabel.textContent = models.find((m) => m.id === currentModel)?.label || models[0].label;
modelIsland.appendChild(modelMenu);

// Переключение меню
modelIsland.addEventListener('click', (e) => {
    if (!modelMenu.contains(e.target)) {
        modelMenu.classList.toggle('visible');
        setTimeout(() => {
            const rect = modelIsland.getBoundingClientRect();
            modelMenu.style.bottom = `${rect.height + 12}px`;
            modelMenu.style.left = '0';
            modelMenu.style.right = 'auto';
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
function formatAssistantMessage(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        const parsed = marked.parse(text, { breaks: true });
        return DOMPurify.sanitize(parsed);
    }
    return text.replace(/\n/g, '<br>');
}

function addMessage(text, isUser = false) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'assistant'}`;
    if (isUser) {
        div.textContent = text;
    } else {
        div.innerHTML = formatAssistantMessage(text);
    }
    chatContainer.appendChild(div);
    if (!isUser && window.MathJax?.typesetPromise) {
        MathJax.typesetPromise([div]).catch((err) => console.warn('MathJax render error', err));
    }
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
    autoResizeTextarea();

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
queryInput.addEventListener('input', autoResizeTextarea);
queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendRequest();
    }
});

window.addEventListener('resize', autoResizeTextarea);
autoResizeTextarea();
