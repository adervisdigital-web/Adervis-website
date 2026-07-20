// Cloudflare Worker — прокси между лид-формой сайта и Telegram Bot API.
//
// Зачем: на статическом GitHub Pages нет бэкенда, поэтому раньше токен бота лежал
// прямо в js/app.js и был виден любому. Теперь фронтенд шлёт только текст заявки
// на этот воркер, а токен и chat_id хранятся секретами воркера (env), не в коде сайта.
//
// Секреты (задаются командой `npx wrangler secret put …`, см. README.md):
//   TG_BOT_TOKEN — токен бота от @BotFather (НОВЫЙ, после отзыва старого)
//   TG_CHAT_ID   — id группы, куда падают заявки (например -5287777539)
//
// Переменная окружения (в wrangler.toml, не секрет):
//   ALLOWED_ORIGIN — какому сайту разрешаем слать заявки (https://adervis.ru)

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || 'https://adervis.ru';
    // Разрешаем сам домен и его www-вариант
    const originOk = origin === allowed || origin === allowed.replace('://', '://www.');

    const corsHeaders = {
      'Access-Control-Allow-Origin': originOk ? origin : allowed,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders);
    }

    // Заявки принимаем только со своего сайта (защита от чужих отправок)
    if (!originOk) {
      return json({ ok: false, error: 'forbidden_origin' }, 403, corsHeaders);
    }

    let text;
    try {
      const data = await request.json();
      text = typeof data.text === 'string' ? data.text.trim() : '';
    } catch {
      return json({ ok: false, error: 'bad_json' }, 400, corsHeaders);
    }

    // Простая валидация: непустой текст разумной длины
    if (!text || text.length > 4000) {
      return json({ ok: false, error: 'bad_text' }, 400, corsHeaders);
    }

    if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
      return json({ ok: false, error: 'not_configured' }, 500, corsHeaders);
    }

    const tgRes = await fetch(
      'https://api.telegram.org/bot' + env.TG_BOT_TOKEN + '/sendMessage',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TG_CHAT_ID,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );

    const tgData = await tgRes.json().catch(() => ({ ok: false }));
    // Наружу отдаём только флаг ok — никаких деталей Telegram API клиенту
    return json({ ok: !!tgData.ok }, tgData.ok ? 200 : 502, corsHeaders);
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
