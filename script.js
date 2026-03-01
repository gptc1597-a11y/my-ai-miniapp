// --- Синхронизация высоты для Telegram Mini App ---
const setViewportHeight = () => {
    // Получаем реальную высоту от Telegram (с учетом клавиатуры) или от браузера
    const vh = window.Telegram?.WebApp?.viewportHeight || window.innerHeight;
    document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
};

// Инициализация Telegram WebApp
if (window.Telegram && Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#090a0c'); 
    tg.setBackgroundColor('#090a0c');
    
    // Пересчитываем высоту, когда открывается/закрывается клавиатура
    tg.onEvent('viewportChanged', setViewportHeight);
}

// Запускаем пересчет сразу при загрузке
setViewportHeight();
window.addEventListener('resize', setViewportHeight);

// --- Элементы DOM и Глобальные переменные ---
const sendBtn = document.getElementById('sendBtn');
const queryInput = document.getElementById('query');
const chatContainer = document.getElementById('chatContainer');
const greeting = document.getElementById('greeting');
const modelIsland = document.getElementById('modelIsland');
const currentModelLabel = document.getElementById('currentModelLabel');
const chatsBtn = document.getElementById('chatsBtn');
const enhanceBtn = document.getElementById('enhanceBtn');
const chatsSidebar = document.getElementById('chatsSidebar');
const closeChatsBtn = document.getElementById('closeChatsBtn');
const chatsList = document.getElementById('chatsList');
const sidebarOverlay = document.getElementById('sidebarOverlay');

let currentChatId = null; // Глобальная память для чатов

if (typeof marked !== 'undefined') {
    marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
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
document.body.appendChild(modelMenu);

modelIsland.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = modelIsland.getBoundingClientRect();
    modelMenu.style.left = `${rect.left}px`;
    modelMenu.style.width = `${rect.width}px`;
    modelMenu.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    modelMenu.classList.toggle('visible');
});

document.addEventListener('click', (e) => {
    if (!modelMenu.contains(e.target) && !modelIsland.contains(e.target)) {
        modelMenu.classList.remove('visible');
    }
});

// --- Боковая панель чатов ---
function toggleSidebar() {
    const isOpen = chatsSidebar.classList.contains('open');
    if (isOpen) {
        chatsSidebar.classList.remove('open');
        sidebarOverlay.classList.remove('visible');
    } else {
        chatsSidebar.classList.add('open');
        sidebarOverlay.classList.add('visible');
        loadChats(); 
    }
}
chatsBtn.addEventListener('click', toggleSidebar);
closeChatsBtn.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', toggleSidebar);

async function loadChats() {
    chatsList.innerHTML = '<div class="loading-dots" style="margin: 20px auto;"><span></span><span></span><span></span></div>';
    try {
        const res = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 12345
            })
        });
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();
        chatsList.innerHTML = '';
        
        // Кнопка нового чата
        const newChatBtn = document.createElement('div');
        newChatBtn.className = 'chat-item';
        newChatBtn.style.border = '1px dashed var(--primary)';
        newChatBtn.textContent = '+ Создать новый чат';
        newChatBtn.addEventListener('click', () => {
            currentChatId = null;
            chatContainer.innerHTML = ''; 
            chatContainer.appendChild(greeting);
            greeting.classList.remove('hidden');
            toggleSidebar();
        });
        chatsList.appendChild(newChatBtn);

        if (data.chats && data.chats.length > 0) {
            data.chats.forEach(chat => {
                const item = document.createElement('div');
                item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
                item.textContent = chat.title || `Чат #${chat.id}`;
                item.addEventListener('click', () => {
                    loadChatHistory(chat.id);
                    toggleSidebar();
                });
                chatsList.appendChild(item);
            });
        }
    } catch (e) {
        chatsList.innerHTML = `<div style="text-align:center; color:#ff4444; padding: 20px;">Ошибка: ${e.message}</div>`;
    }
}

async function loadChatHistory(chatId) {
    currentChatId = chatId;
    chatContainer.innerHTML = ''; 
    greeting.classList.add('hidden');

    try {
        const res = await fetch(`/api/messages/${chatId}`);
        const data = await res.json();
        data.messages.forEach(msg => {
            if (msg.role !== 'system') addMessage(msg.content, msg.role === 'user');
        });
    } catch (e) {
        console.error("Ошибка загрузки истории", e);
    }
}

// --- Автоулучшение промпта ---
enhanceBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    const originalIcon = enhanceBtn.innerHTML;
    enhanceBtn.innerHTML = '<div class="loading-dots" style="transform: scale(0.6);"><span></span><span></span><span></span></div>';
    enhanceBtn.disabled = true;

    try {
        const res = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                query: `Улучши промпт. Выведи ТОЛЬКО текст:\n\n${query}`,
                user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 12345,
                is_system_action: true 
            })
        });

        const data = await res.json();
        if (res.ok && data.answer) {
            queryInput.value = data.answer.trim();
            autoResizeTextarea();
        }
    } catch (e) {
        console.error('Ошибка сети:', e);
    } finally {
        enhanceBtn.innerHTML = originalIcon;
        enhanceBtn.disabled = false;
    }
});

const autoResizeTextarea = () => {
    queryInput.style.height = 'auto';
    queryInput.style.height = queryInput.scrollHeight + 'px';
};
queryInput.addEventListener('input', autoResizeTextarea);

// --- Обработка формул ---
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

function unescapeMath(html, mathStore) {
    mathStore.forEach(item => { html = html.replace(item.id, item.content); });
    return html;
}

// --- Отрисовка сообщений ---
function addMessage(text, isUser = false) {
    if (text === undefined || text === null) {
        text = "⚠️ Ошибка: получен пустой ответ от сервера.";
    }
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
        const res = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                query: query,
                user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 12345,
                chat_id: currentChatId 
            })
        });

        chatContainer.removeChild(loadingDiv);
        const data = await res.json();

        if (res.ok) {
            if (data.chat_id) currentChatId = data.chat_id;
            addMessage(data.answer);
        } else {
            addMessage(`Ошибка: ${data.error || 'Не удалось получить ответ'}`);
        }
    } catch (e) {
        if (loadingDiv.parentNode) chatContainer.removeChild(loadingDiv);
        addMessage(`Ошибка сети: ${e.message}`);
    }
}

sendBtn.addEventListener('click', sendRequest);
queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendRequest();
    }
});