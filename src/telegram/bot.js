import { Telegraf } from 'telegraf';
import { logger } from '../logger.js';

export class TelegramBot {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.pendingRequests = new Map();
    this.setupCommands();
  }

  setupCommands() {
    this.bot.command('start', (ctx) => {
      ctx.reply('Antigravity Notify 已啟動！\n\n當 Antigravity IDE 需要核准時，您會收到通知。');
    });

    this.bot.command('status', (ctx) => {
      ctx.reply('✅ 服務運行中');
    });

    this.bot.action('approve', async (ctx) => {
      const callbackData = ctx.callbackQuery.data;
      const requestId = ctx.callbackQuery.message?.text;
      
      await ctx.answerCbQuery('已核准');
      await ctx.editMessageReplyMarkup(null);
      
      if (this.pendingRequests.has(callbackData)) {
        const callback = this.pendingRequests.get(callbackData);
        callback('approve');
        this.pendingRequests.delete(callbackData);
      }
    });

    this.bot.action('deny', async (ctx) => {
      const callbackData = ctx.callbackQuery.data;
      
      await ctx.answerCbQuery('已拒絕');
      await ctx.editMessageReplyMarkup(null);
      
      if (this.pendingRequests.has(callbackData)) {
        const callback = this.pendingRequests.get(callbackData);
        callback('deny');
        this.pendingRequests.delete(callbackData);
      }
    });
  }

  async start() {
    logger.info('Starting Telegram Bot...');
    await this.bot.launch();
    logger.info('Telegram Bot started');
  }

  async sendApprovalRequest(event, callback) {
    const message = this.formatApprovalMessage(event);
    const requestId = `req_${Date.now()}`;
    
    try {
      await this.bot.telegram.sendMessage(
        this.chatId,
        message,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ 核准', callback_data: `approve_${requestId}` },
                { text: '❌ 拒絕', callback_data: `deny_${requestId}` }
              ]
            ]
          }
        }
      );
      
      this.pendingRequests.set(`approve_${requestId}`, callback);
      this.pendingRequests.set(`deny_${requestId}`, callback);
      
      logger.info(`Approval request sent: ${requestId}`);
    } catch (error) {
      logger.error('Failed to send Telegram message:', error.message);
    }
  }

  formatApprovalMessage(event) {
    return `🔔 *核准請求*\n\n*類型:* ${event.type || 'Unknown'}\n*訊息:* ${event.message || '請確認此操作'}\n\n請選擇要執行的動作:`;
  }

  async stop() {
    this.bot.stop();
    logger.info('Telegram Bot stopped');
  }
}
