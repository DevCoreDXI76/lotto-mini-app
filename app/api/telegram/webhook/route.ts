// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { classifyMessage } from '@/lib/telegram/webhookLogic';
import { sendTelegramMessage, sendMiniAppLaunchMessage } from '@/lib/telegram/api';

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { username?: string; first_name?: string };
  };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const action = classifyMessage(message.text);

  try {
    if (action.type === 'launchMiniApp') {
      await sendMiniAppLaunchMessage(chatId);
    } else if (action.type === 'forwardFeedback') {
      const adminChatId = Number(process.env.TELEGRAM_ADMIN_CHAT_ID);
      const from = message.from?.username
        ? `@${message.from.username}`
        : (message.from?.first_name ?? '익명');
      await sendTelegramMessage(adminChatId, `📩 피드백 (${from}):\n${action.text}`);
      await sendTelegramMessage(chatId, '의견 감사합니다! 검토 후 반영하겠습니다.');
    }
  } catch (error) {
    console.error('telegram webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
