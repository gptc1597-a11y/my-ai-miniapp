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
    queryInput.style.height = Math.min(queryInput.scrollHeight, 120) + 'px';
};

queryInput.addEventListener('input', autoResizeTextarea);

// --- Логика сообщений и формул ---

// 1. Защита формул от Markdown парсера
function escapeMath(text) {
    // Временное хранилище для формул
    const mathStore = [];
    
    // Заменяем $$...$$ (display math)
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
        const id = `__MATH_BLOCK_${mathStore.length}__`;
        mathStore.push({ id, content: `$$${content}$$` });
        return id;
    });

    // Заменяем \(...\) и $...$ (inline math)
    // Важно: $...$ может встречаться в обычном тексте, поэтому используем строгую проверку или полагаемся на структуру
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
        const id = `__MATH_BLOCK_${mathStore.length}__`;
        mathStore.push({ id, content: `$$${content}$$` }); // MathJax понимает $$ для блока
        return id;
    });

    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
        const id = `__MATH_INLINE_${mathStore.length}__`;
        mathStore.push({ id, content: `\\(${content}\\)` });
        return id;
    });
    
    // Осторожная замена $...$ для inline, исключая экранированные \$
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
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'assistant'}`;

    if (isUser) {
        div.textContent = text;
    } else {
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            // Шаг 1: Спрятать формулы
            const { text: safeText, mathStore } = escapeMath(text);
            // Шаг 2: Рендер Markdown
            let rawHtml = marked.parse(safeText);
            // Шаг 3: Вернуть формулы
            rawHtml = unescapeMath(rawHtml, mathStore);
            // Шаг 4: Санитизация (разрешаем mathjax теги если нужно, но обычно они просто текст на этом этапе)
            div.innerHTML = DOMPurify.sanitize(rawHtml);
        } else {
            div.textContent = text;
        }
    }

    chatContainer.appendChild(div);
    
    // Рендер формул в новом сообщении
    if (!isUser && window.MathJax) {
        MathJax.typesetPromise([div]).catch(err => console.log('MathJax Error:', err));
    }

    // Скролл вниз
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
    queryInput.style.height = 'auto'; // Сброс высоты
    queryInput.focus();

    // Создаем пузырь загрузки
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant';
    loadingDiv.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const res = await fetch('https://my-ai-miniapp.onrender.com/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                query: query,
                // Передаем ID пользователя если есть, иначе аноним
                user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'anon'
            })
        });

        chatContainer.removeChild(loadingDiv);
        const data = await res.json();

        if (res.ok) {
            addMessage(data.answer);
        } else {
            addMessage(`Ошибка: ${data.error || 'Не удалось получить ответ'}`);
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