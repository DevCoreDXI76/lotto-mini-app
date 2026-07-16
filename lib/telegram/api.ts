const TELEGRAM_API_BASE = 'https://api.telegram.org';

function botUrl(method: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return `${TELEGRAM_API_BASE}/bot${token}/${method}`;
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const res = await fetch(botUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    throw new Error(`Telegram sendMessage failed: ${res.status} ${await res.text()}`);
  }
}

export async function sendMiniAppLaunchMessage(chatId: number): Promise<void> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL is not set');

  const res = await fetch(botUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: '로또 미니앱에 오신 것을 환영합니다! 아래 버튼으로 번호 생성기, 통계, 판매점 찾기를 이용해보세요.',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎲 미니앱 열기', web_app: { url: appUrl } }],
        ],
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Telegram sendMessage failed: ${res.status} ${await res.text()}`);
  }
}
