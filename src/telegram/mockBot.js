import { logger } from '../logger.js';
import { HistoryStore } from '../store/history.js';

export class MockTelegramBot {
  constructor() {
    this.pendingRequests = [];
    this.historyStore = new HistoryStore();
    this.approvedKeywords = ['yes', 'y', 'approve', 'ok', '好', '確認', '同意'];
    this.deniedKeywords = ['no', 'n', 'deny', 'reject', '不要', '拒絕', '不同意'];
    this.requireWhitelist = process.env.REQUIRE_WHITELIST === 'true';
    logger.info('🧪 Mock Telegram Bot 啟動（測試模式）');
  }

  async start() {
    logger.info('Mock Bot started');
  }

  async sendApprovalRequest(event, callback) {
    const requestId = `mock_${Date.now()}`;
    const eventType = event.type || 'Unknown';
    const eventMessage = event.message || '';

    console.log('\n' + '='.repeat(50));
    console.log('🔔 模擬核准請求');
    console.log('='.repeat(50));
    console.log(`類型: ${eventType}`);
    console.log(`訊息: ${eventMessage}`);
    console.log(`ID: ${requestId}`);
    console.log('-'.repeat(50));
    console.log('選項:');
    console.log('  [1] ✅ 核准 (approve)');
    console.log('  [2] ❌ 拒絕 (deny)');
    console.log('  [3] 🔄 略過 (skip)');
    console.log('='.repeat(50));

    const wrappedCallback = (action) => {
      this.historyStore.addRecord(requestId, eventType, eventMessage, action);
      callback(action);
    };

    this.pendingRequests.push({ requestId, callback: wrappedCallback });
    logger.info(`Mock approval request sent: ${requestId}`);
  }

  async handleInput(text) {
    const t = text.toLowerCase().trim();
    const lastRequest = this.pendingRequests[this.pendingRequests.length - 1];

    if (!lastRequest) {
      console.log('❌ 目前沒有待核准的請求');
      return;
    }

    if (this.approvedKeywords.includes(t)) {
      console.log(`✅ 已核准 (${t})`);
      lastRequest.callback('approve');
      this.pendingRequests.pop();
    } else if (this.deniedKeywords.includes(t)) {
      console.log(`❌ 已拒絕 (${t})`);
      lastRequest.callback('deny');
      this.pendingRequests.pop();
    } else {
      console.log(`⚠️ 無效指令: ${t}`);
    }
  }

  async showHistory() {
    const history = this.historyStore.getHistory(10);
    console.log('\n📋 歷史記錄:');
    if (history.length === 0) {
      console.log('  尚無記錄');
      return;
    }
    history.forEach(h => {
      const icon = h.action === 'approve' ? '✅' : '❌';
      console.log(`  ${icon} ${h.event_type} - ${h.action} (${h.created_at})`);
    });
  }

  async stop() {
    this.historyStore.close();
    logger.info('Mock Bot stopped');
  }
}
