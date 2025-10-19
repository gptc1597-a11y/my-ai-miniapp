// Инициализация Telegram WebApp
Telegram.WebApp.ready();
Telegram.WebApp.expand();

const sendBtn = document.getElementById('sendBtn');
const responseDiv = document.getElementById('response');

// Получаем данные пользователя (опционально)
const user = Telegram.WebApp.initDataUnsafe?.user;

async function sendRequest() {
  const model = document.getElementById('model').value;
  const query = document.getElementById('query').value.trim();

  if (!query) {
    alert('Введите запрос!');
    return;
  }

  sendBtn.disabled = true;
  responseDiv.textContent = '⏳ Обработка...';

  try {
    const payload = {
      model: model,
      query: query,
      user_id: user?.id || 'anonymous'
    };

    const res = await fetch('https://https://my-ai-miniapp.onrender.com/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      responseDiv.textContent = data.answer || 'Пустой ответ';
    } else {
      responseDiv.textContent = `❌ Ошибка: ${data.error || 'Неизвестная ошибка'}`;
    }
  } catch (e) {
    responseDiv.textContent = `❌ Ошибка подключения: ${e.message}`;
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', sendRequest);

// Поддержка кнопки "Отправить" внизу экрана (Telegram MainButton)
Telegram.WebApp.MainButton.setText("Отправить");
Telegram.WebApp.MainButton.show();
Telegram.WebApp.MainButton.onClick(sendRequest);