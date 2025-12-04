// Инициализация
if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    Telegram.WebApp.setHeaderColor('#090a0c');
    Telegram.WebApp.setBackgroundColor('#090a0c');
}

// Настройка Marked
if (typeof marked !== 'undefined') {
    marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: false,
        mangle: false
    });
}

// Элементы
const sendBtn = document.getElementById('sendBtn');
const queryInput = document.getElementById('query');
const chatContainer = document.getElementById('chatContainer');
const greeting = document.getElementById('greeting');
const modelIsland = document.getElementById('modelIsland');
const currentModelLabel = document.getElementById('currentModelLabel');

let currentModel = "grok-4-fast";

// --- Логика Формул (КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ) ---

// Используем простые токены БЕЗ спецсимволов markdown (_, *, ~)
const MATH_BLOCK_TOKEN = 'MATHPHBLOCK';
const MATH_INLINE_TOKEN = 'MATHPHINLINE';

function processText(text) {
    const mathStore = [];
    
    // 1. Сохраняем блочные формулы $$...$$ и \[...\]
    // Используем [\s\S] для захвата переносов строк
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
        const id = mathStore.length;
        mathStore.push(`$$${content}$$`);
        return `${MATH_BLOCK_TOKEN}${id}END`;
    });

    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
        const id = mathStore.length;
        mathStore.push(`$$${content}$$`); // Приводим к формату MathJax
        return `${MATH_BLOCK_TOKEN}${id}END`;
    });

    // 2. Сохраняем строчные формулы \(...\)
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
        const id = mathStore.length;
        mathStore.push(`\\(${content}\\)`);
        return `${MATH_INLINE_TOKEN}${id}END`;
    });

    // 3. Сохраняем строчные формулы $...$ 
    // (аккуратно, чтобы не захватить цены вида $100)
    text = text.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, content) => {
        const id = mathStore.length;
        mathStore.push(`$${content}$`);
        return `${MATH_INLINE_TOKEN}${id}END`;
    });

    // 4. Рендерим Markdown
    let html = marked.parse(text);

    // 5. Восстанавливаем формулы
    // Мы ищем наши токены в HTML и возвращаем оригинальный LaTeX
    // Marked оборачивает блочные элементы в <p>, поэтому иногда полезно убрать <p> вокруг блока
    
    // Восстановление блоков
    const blockRegex = new RegExp(`${MATH_BLOCK_TOKEN}(\\d+)END`, 'g');
    html = html.replace(blockRegex, (match, id) => {
        return mathStore[parseInt(id)];
    });

    // Восстановление инлайнов
    const inlineRegex = new RegExp(`${MATH_INLINE_TOKEN}(\\d+)END`, 'g');
    html = html.replace(inlineRegex, (match, id) => {
        return mathStore[parseInt(id)];
    });

    return html;
}

function addMessage(text, isUser = false) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'assistant'}`;

    if (isUser) {
        div.textContent = text;
    } else {
        // Обработка Markdown + Формул
        const safeHtml = DOMPurify.sanitize(processText(text));
        div.innerHTML = safeHtml;
    }

    chatContainer.appendChild(div);
    
    // Запуск рендера формул только для этого сообщения
    if (!isUser && window.MathJax) {
        MathJax.typesetPromise([div]).catch(err => console.log(err));
    }

    // Прокрутка вниз с небольшим таймаутом для учета рендера картинок/формул
    setTimeout(scrollToBottom, 50);
}

function scrollToBottom() {
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// --- Остальная логика ---

const autoResizeTextarea = () => {
    queryInput.style.height = 'auto';
    queryInput.style.height = Math.min(queryInput.scrollHeight, 140) + 'px';
};

queryInput.addEventListener('input', autoResizeTextarea);

async function sendRequest() {
    const query = queryInput.value.trim();
    if (!query) return;

    greeting.classList.add('hidden');
    addMessage(query, true);
    
    queryInput.value = '';
    queryInput.style.height = 'auto';
    
    // Индикатор
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant';
    loadingDiv.innerHTML = '⏳ <i>Думаю...</i>';
    chatContainer.appendChild(loadingDiv);
    scrollToBottom();

    try {
        const res = await fetch('https://my-ai-miniapp.onrender.com/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                query: query,
                user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'anon'
            })
        });

        const data = await res.json();
        chatContainer.removeChild(loadingDiv);

        if (res.ok) {
            addMessage(data.answer);
        } else {
            addMessage(`Ошибка: ${data.error}`);
        }
    } catch (e) {
        if(loadingDiv.parentNode) chatContainer.removeChild(loadingDiv);
        addMessage(`Ошибка сети: ${e.message}`);
    }
}

// Меню моделей
const models = [
    { id: "grok-4-fast", label: "Grok-4 Fast" },
    { id: "gpt-5-chat-latest", label: "GPT-5 Chat" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet" }
];

const modelMenu = document.createElement('div');
modelMenu.className = 'model-menu';
document.querySelector('.input-panel').appendChild(modelMenu);

function renderMenu() {
    modelMenu.innerHTML = '';
    models.forEach(m => {
        const btn = document.createElement('button');
        btn.className = `model-menu-item ${m.id === currentModel ? 'active' : ''}`;
        btn.textContent = m.label;
        btn.onclick = () => {
            currentModel = m.id;
            currentModelLabel.textContent = m.label;
            modelMenu.classList.remove('visible');
            renderMenu();
        };
        modelMenu.appendChild(btn);
    });
}
renderMenu();

modelIsland.addEventListener('click', (e) => {
    e.stopPropagation();
    // Позиционируем меню над кнопкой
    const rect = modelIsland.getBoundingClientRect();
    const panelRect = document.querySelector('.input-panel').getBoundingClientRect();
    
    modelMenu.style.left = '16px';
    modelMenu.style.bottom = (panelRect.height + 10) + 'px';
    modelMenu.classList.toggle('visible');
});

document.addEventListener('click', (e) => {
    if (!modelMenu.contains(e.target) && !modelIsland.contains(e.target)) {
        modelMenu.classList.remove('visible');
    }
});

sendBtn.addEventListener('click', sendRequest);
queryInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendRequest();
    }
});