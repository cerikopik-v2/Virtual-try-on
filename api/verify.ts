export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const userId = body.userId;

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'User ID is required' }) };
    }

    // Подключаемся к Upstash Redis
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
        // Если ключей нет, пропускаем (чтобы не сломать приложение)
        return { statusCode: 200, body: JSON.stringify({ generationsCount: 0 }) };
    }

    // Стучимся в базу за количеством попыток
    const limitRes = await fetch(`${redisUrl}/get/user:${userId}:generations`, {
        headers: { Authorization: `Bearer ${redisToken}` }
    });
    
    const limitData = await limitRes.json();
    
    // Превращаем ответ в число (если пусто, то 0)
    const generations = parseInt(limitData.result || '0');

    // Отдаем на фронтенд
    return { 
      statusCode: 200, 
      body: JSON.stringify({ generationsCount: generations }) 
    };

  } catch (error) {
    console.error('Ошибка проверки лимита в Redis:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
