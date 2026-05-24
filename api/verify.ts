export const handler = async (event: any) => {
  // В Netlify метод проверяется через event.httpMethod
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // В Netlify тело запроса нужно парсить из строки event.body
    const body = JSON.parse(event.body || '{}');
    const userId = body.userId;

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'User ID is required' }) };
    }

    const wpUser = process.env.WP_USERNAME;
    const wpPass = process.env.WP_APP_PASSWORD;
    const wpUrl = 'https://life.burservis.ru';

    // Кодируем логин и пароль администратора
    const credentials = Buffer.from(`${wpUser}:${wpPass}`).toString('base64');
    
    // ПРИНУДИТЕЛЬНО переводим введенный пользователем ID в нижний регистр 
    // (в базе WordPress логины для поиска 'slug' хранятся маленькими буквами)
    const safeUserId = userId.toLowerCase();

    // Запрашиваем пользователя из WP
    const response = await fetch(`${wpUrl}/wp-json/wp/v2/users?slug=${encodeURIComponent(safeUserId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: 'WP API Error' }) };
    }

    const users = await response.json();

    // Если массив пустой, значит пользователь не найден
    if (!users || users.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ exists: false }) };
    }

    // Если нашли — возвращаем успешный статус!
    return { 
      statusCode: 200, 
      body: JSON.stringify({ exists: true, user: users[0].slug }) 
    };

  } catch (error) {
    console.error('Ошибка сервера Netlify:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
