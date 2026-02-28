// Инициализация Telegram WebApp
if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    // Адаптация цвета хедера под тему
    Telegram.WebApp.setHeaderColor('#090a0c'); 
    Telegram.WebApp.setBackgroundColor('#090a0c');
}

// Элементы DOM
const sendBtn = document.getElementById('sendBtn');
const queryInput = document.getElementById('query');
const chatContainer = document.getElementById('chatContainer');
const greeting = document.getElementById('greeting');
const modelIsland = document.getElementById('modelIsland');
const currentModelLabel = document.getElementById('currentModelLabel');

// Конфигурация Markdown
if (typeof marked !== 'undefined') {
    marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: false,
        mangle: false
    });
}

// Модели
const models = [
    { id: "gpt-5-chat-latest", label: "GPT-5 Chat" },
    { id: "gpt-5-thinking-all", label: "GPT-5 Thinking" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "grok-4-fast", label: "Grok-4 Fast" },
    { id: "grok-4", label: "Grok-4" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet" }
];

let currentModel = "grok-4-fast";

// --- Меню моделей ---
const modelMenu = document.createElement('div');
modelMenu.className = 'model-menu';

function renderModelMenu() {
    modelMenu.innerHTML = '';
    models.forEach((model) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `model-menu-item${model.id === currentModel ? ' active' : ''}`;
        item.textContent = model.label;
        if (model.id === currentModel) {
            const check = document.createElement('span');
            check.innerHTML = '●';
            check.style.fontSize = '10px';
            item.appendChild(check);
        }
        
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
// Вставляем меню перед панелью ввода, чтобы позиционировать относительно modelIsland
document.querySelector('.input-panel').appendChild(modelMenu);

modelIsland.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = modelIsland.getBoundingClientRect();
    modelMenu.style.left = `${rect.left}px`;
    modelMenu.style.bottom = `${window.innerHeight - rect.top + 8}px`; // Позиционируем над кнопкой
    modelMenu.classList.toggle('visible');
});

document.addEventListener('click', (e) => {
    if (!modelMenu.contains(e.target) && !modelIsland.contains(e.target)) {
        modelMenu.classList.remove('visible');
    }
});

// --- Обработка ввода ---
const autoResizeTextarea = () => {
    queryInput.style.height = 'auto';
    queryInput.style.height = queryInput.scrollHeight + 'px';
};

queryInput.addEventListener('input', autoResizeTextarea);

// --- Логика сообщений и формул ---

// 1. Защита формул от Markdown парсера
function escapeMath(text) {
    const mathStore = [];
    
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
        const id = `__MATH_BLOCK_${mathStore.length}__`;
        mathStore.push({ id, content: `$$${content}$$` });
        return id;
    });

    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
        const id = `__MATH_BLOCK_${mathStore.length}__`;
        mathStore.push({ id, content: `$$${content}$$` }); 
        return id;
    });

    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
        const id = `__MATH_INLINE_${mathStore.length}__`;
        mathStore.push({ id, content: `\\(${content}\\)` });
        return id;
    });
    
    text = text.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, content) => {
        const id = `__MATH_INLINE_${mathStore.length}__`;
        mathStore.push({ id, content: `$${content}$` });
        return id;
    });

    return { text, mathStore };
}

// 2. Восстановление формул после Markdown
function unescapeMath(html, mathStore) {
    mathStore.forEach(item => {
        html = html.replace(item.id, item.content);
    });
    return html;
}

function addMessage(text, isUser = false) {
    // ИСПРАВЛЕНИЕ 1: Жесткая защита от undefined. Если пришла пустота, ставим заглушку.
    if (text === undefined || text === null) {
        text = "⚠️ Ошибка: получен пустой ответ. Проверьте логи бэкенда.";
    }
    // Гарантируем, что дальше по коду идет только строка
    if (typeof text !== 'string') {
        text = JSON.stringify(text);
    }

    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'assistant'}`;

    if (isUser) {
        div.textContent = text;
    } else {
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            const { text: safeText, mathStore } = escapeMath(text);
            let rawHtml = marked.parse(safeText);
            rawHtml = unescapeMath(rawHtml, mathStore);
            div.innerHTML = DOMPurify.sanitize(rawHtml);
        } else {
            div.textContent = text;
        }
    }

    chatContainer.appendChild(div);
    
    if (!isUser && window.MathJax) {
        MathJax.typesetPromise([div]).catch(err => console.log('MathJax Error:', err));
    }

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- Отправка запроса ---
async function sendRequest() {
    const query = queryInput.value.trim();
    if (!query) return;

    if (!greeting.classList.contains('hidden')) {
        greeting.classList.add('hidden');
    }

    addMessage(query, true);
    queryInput.value = '';
    queryInput.style.height = 'auto'; 
    queryInput.focus();

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant';
    loadingDiv.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const res = await fetch('https://xui-ai.ru.tuna.am/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                // ИСПРАВЛЕНИЕ 2: Возвращаем ключ 'question', как этого ждет FastAPI
                question: query, 
                // ИСПРАВЛЕНИЕ 3: Передаем число 12345 вместо строки 'anon' для тестов
                user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 12345
            })
        });

        chatContainer.removeChild(loadingDiv);
        const data = await res.json();

        if (res.ok) {
            // ИСПРАВЛЕНИЕ 4: Проверяем, не вернул ли бэкенд ошибку со статусом 200
            if (data.error) {
                addMessage(`Ошибка сервера: ${data.error}`);
            } else {
                addMessage(data.answer);
            }
        } else {
            // Если FastAPI отбил запрос (ошибка 422), выводим детали
            addMessage(`Ошибка: ${data.error || JSON.stringify(data.detail) || 'Не удалось получить ответ'}`);
        }

    } catch (e) {
        if (loadingDiv.parentNode) chatContainer.removeChild(loadingDiv);
        addMessage(`Ошибка сети: ${e.message}`);
    }
}

// События
sendBtn.addEventListener('click', sendRequest);

queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendRequest();
    }
});