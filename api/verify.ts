export default async function handler(req: any, res: any) {
  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Получаем ID пользователя, который он ввел в окне
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Берем наши секретные ключи из Vercel (позже мы их туда добавим)
  const wpUser = process.env.WP_USERNAME;
  const wpPass = process.env.WP_APP_PASSWORD;
  const wpUrl = 'https://life.burservis.ru';

  // Кодируем логин и пароль для безопасной передачи
  const credentials = Buffer.from(`${wpUser}:${wpPass}`).toString('base64');

  try {
    // Делаем скрытый запрос к твоему сайту через встроенный REST API
    const response = await fetch(`${wpUrl}/wp-json/wp/v2/users?slug=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`WordPress API responded with status: ${response.status}`);
    }

    const users = await response.json();

    // Если массив пустой, значит WordPress не нашел такого пользователя
    if (users.length === 0) {
      return res.status(404).json({ exists: false });
    }

    // Если пользователь найден, отвечаем успехом
    return res.status(200).json({ exists: true, user: users[0].slug });

  } catch (error) {
    console.error('Ошибка проверки пользователя WP:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
