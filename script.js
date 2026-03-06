// --- Синхронизация высоты для Telegram Mini App ---
const setViewportHeight = () => {
    const vh = window.Telegram?.WebApp?.viewportHeight || window.innerHeight;
    document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
};

if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#090a0c'); 
    tg.setBackgroundColor('#090a0c');
    if (typeof tg.onEvent === 'function') {
        tg.onEvent('viewportChanged', setViewportHeight);
    }
}
setViewportHeight();
window.addEventListener('resize', setViewportHeight);

// --- Элементы DOM ---
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

// !!! ЗАМЕНИ ЭТОТ АДРЕС НА СВОЙ !!
const TUNA_URL = "https://xui-ai.ru.tuna.am";

// Читаем параметр ?bot= из ссылки (если его нет, считаем, что это студент)
const urlParams = new URLSearchParams(window.location.search);
const currentBotType = urlParams.get('bot') || 'student';

let currentChatId = null; 

if (typeof marked !== 'undefined') {
    marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
}

// --- Обновленный список моделей ---
const models = [
    { id: "gpt-5.2", label: "GPT 5. 2." },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4. 6." },
    { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
    { id: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
    { id: "grok-4", label: "Grok 4" }
];
let currentModel = "gpt-5.2";

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
        const res = await fetch(`${TUNA_URL}/api/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 12345,
                bot_type: currentBotType 
            })
        });
        const data = await res.json();
        chatsList.innerHTML = '';
        
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

        if (data.chats) {
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
        const res = await fetch(`${TUNA_URL}/api/messages/${chatId}?bot_type=${currentBotType}`);
        const data = await res.json();
        data.messages.forEach(msg => {
            if (msg.role !== 'system') addMessage(msg.content, msg.role === 'user');
        });
    } catch (e) { console.error(e); }
}

enhanceBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    const originalIcon = enhanceBtn.innerHTML;
    enhanceBtn.innerHTML = '<div class="loading-dots" style="transform: scale(0.6);"><span></span><span></span><span></span></div>';
    enhanceBtn.disabled = true;

    const formData = new FormData();
    formData.append('model', currentModel);
    formData.append('query', `Улучши промпт. Выведи ТОЛЬКО текст:\n\n${query}`);
    formData.append('user_id', window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 12345);
    formData.append('bot_type', currentBotType);
    formData.append('is_system_action', true);

    try {
        const res = await fetch(`${TUNA_URL}/api/ask`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        
        if (data.error) {
            console.error(`Ошибка от сервера: ${data.error}`);
            queryInput.value = query; 
        } else if (res.ok && data.answer) {
            queryInput.value = data.answer.trim();
            autoResizeTextarea();
        }
    } catch (e) {
        console.error('Ошибка сети при улучшении промпта:', e);
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

function escapeMath(text) {
    if (!text) return { text: "", mathStore: [] };
    const mathStore = [];
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
        const id = `__MATH_BLOCK_${mathStore.length}__`;
        mathStore.push({ id, content: `$$${content}$$` });
        return id;
    });
    return { text, mathStore };
}

function unescapeMath(html, mathStore) {
    mathStore.forEach(item => { html = html.replace(item.id, item.content); });
    return html;
}

function addMessage(text, isUser = false) {
    if (text === undefined || text === null) text = "⚠️ Ошибка: пустой ответ.";
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'assistant'}`;
    if (isUser) {
        div.textContent = text;
    } else {
        const { text: safeText, mathStore } = escapeMath(text);
        let rawHtml = typeof marked !== 'undefined' ? marked.parse(safeText) : safeText;
        rawHtml = unescapeMath(rawHtml, mathStore);
        div.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
    }
    chatContainer.appendChild(div);
    if (!isUser && window.MathJax) MathJax.typesetPromise([div]);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- ЛОГИКА ПРИКРЕПЛЕНИЯ ФАЙЛОВ (ПЛИТКИ) ---
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const filePreviewContainer = document.getElementById('filePreviewContainer');
window.selectedFiles = [];

function truncateFileName(fileName, maxLength = 16) {
    if (fileName.length <= maxLength) return fileName;
    const extIndex = fileName.lastIndexOf('.');
    if (extIndex !== -1 && fileName.length - extIndex <= 6) {
        const ext = fileName.substring(extIndex);
        const name = fileName.substring(0, extIndex);
        return name.substring(0, maxLength - 6) + '...' + ext;
    }
    return fileName.substring(0, maxLength) + '...';
}

function updateFilePreview() {
    if (!filePreviewContainer) return;
    filePreviewContainer.innerHTML = '';
    
    if (window.selectedFiles.length === 0) {
        filePreviewContainer.style.display = 'none';
        if (attachBtn) attachBtn.style.color = 'var(--text-muted)';
        return;
    }

    filePreviewContainer.style.display = 'flex';
    if (attachBtn) attachBtn.style.color = 'var(--primary)';

    window.selectedFiles.forEach((file, index) => {
        const tile = document.createElement('div');
        tile.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 6px 10px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); max-width: 160px; flex-shrink: 0; gap: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        
        const shortName = truncateFileName(file.name, 15);

        tile.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;" title="${file.name}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; flex-shrink: 0; color: #fff;">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <span style="font-size: 0.8rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${shortName}</span>
            </div>
            <button type="button" aria-label="Удалить" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; outline: none; margin-left: 2px; flex-shrink: 0;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        tile.querySelector('button').addEventListener('click', () => {
            window.selectedFiles.splice(index, 1);
            const dt = new DataTransfer();
            window.selectedFiles.forEach(f => dt.items.add(f));
            if (fileInput) fileInput.files = dt.files;
            updateFilePreview();
        });

        filePreviewContainer.appendChild(tile);
    });
}

if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        window.selectedFiles = Array.from(e.target.files);
        queryInput.value = '';
        queryInput.placeholder = "Введите запрос...";
        updateFilePreview();
    });
}

async function sendRequest() {
    const query = queryInput.value.trim();
    if (!query && window.selectedFiles.length === 0) return; 

    if (!greeting.classList.contains('hidden')) greeting.classList.add('hidden');
    
    const fileNames = window.selectedFiles.map(f => f.name).join(', ');
    const displayQuery = window.selectedFiles.length > 0 ? query + `\n📎 [${fileNames}]` : query;
    addMessage(displayQuery, true);
    
    queryInput.value = '';
    queryInput.style.height = 'auto';
    queryInput.placeholder = "Введите запрос...";

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant';
    loadingDiv.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const formData = new FormData();
    formData.append('model', currentModel);
    formData.append('query', query || "Опиши эти файлы"); 
    formData.append('user_id', window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 12345);
    formData.append('bot_type', currentBotType);
    if (currentChatId) formData.append('chat_id', currentChatId);
    
    if (window.selectedFiles.length > 0) {
        // Пока отправляем только первый файл, чтобы не сломать бэкенд
        formData.append('file', window.selectedFiles[0]);
    }

    try {
        const res = await fetch(`${TUNA_URL}/api/ask`, {
            method: 'POST',
            body: formData
        });

        // Очищаем карусель файлов после отправки
        window.selectedFiles = [];
        if (fileInput) fileInput.value = '';
        updateFilePreview();

        chatContainer.removeChild(loadingDiv);
        const data = await res.json();

        if (data.error) {
            addMessage(`⚠️ Ошибка от сервера: ${data.error}`);
        } else if (res.ok && data.answer) {
            if (data.chat_id) currentChatId = data.chat_id;
            addMessage(data.answer);
        } else {
            addMessage(`⚠️ Неизвестная ошибка: ответ не получен.`);
        }
    } catch (e) {
        if (loadingDiv.parentNode) chatContainer.removeChild(loadingDiv);
        addMessage(`Ошибка сети: ${e.message}`);
    }
}

sendBtn.addEventListener('click', sendRequest);
queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendRequest(); }
});