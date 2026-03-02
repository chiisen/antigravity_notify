import 'dotenv/config';
import { logger } from './logger.js';
import { CDPClient } from './cdp/client.js';
import { TelegramBot } from './telegram/bot.js';

class AntigravityNotify {
  constructor() {
    this.cdpClient = null;
    this.telegramBot = null;
    this.isRunning = false;
  }

  async start() {
    logger.info('Starting Antigravity Notify...');
    
    this.validateConfig();
    
    this.telegramBot = new TelegramBot();
    await this.telegramBot.start();
    
    this.cdpClient = new CDPClient({
      host: process.env.REMOTE_HOST || 'localhost',
      port: parseInt(process.env.REMOTE_PORT || '9222', 10)
    });
    
    await this.cdpClient.connect();
    
    this.isRunning = true;
    logger.info('Antigravity Notify started successfully!');
    
    await this.cdpClient.startMonitoring((event) => {
      this.handleApprovalEvent(event);
    });
  }

  validateConfig() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set in .env file');
    }
    if (!process.env.TELEGRAM_CHAT_ID) {
      throw new Error('TELEGRAM_CHAT_ID is not set in .env file');
    }
    logger.info('Configuration validated');
  }

  async handleApprovalEvent(event) {
    logger.info('Approval event detected:', event);
    
    await this.telegramBot.sendApprovalRequest(event, (action) => {
      this.handleUserResponse(event, action);
    });
  }

  async handleUserResponse(event, action) {
    logger.info(`User responded with: ${action}`);
    
    if (action === 'approve') {
      await this.cdpClient.clickApprove();
    } else if (action === 'deny') {
      await this.cdpClient.clickDeny();
    }
  }

  async stop() {
    logger.info('Stopping Antigravity Notify...');
    this.isRunning = false;
    
    if (this.cdpClient) {
      await this.cdpClient.disconnect();
    }
    
    if (this.telegramBot) {
      await this.telegramBot.stop();
    }
    
    logger.info('Antigravity Notify stopped');
  }
}

const app = new AntigravityNotify();

process.on('SIGINT', async () => {
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await app.stop();
  process.exit(0);
});

app.start().catch((err) => {
  logger.error('Failed to start application:', err);
  process.exit(1);
});
