import { DuneClient } from "@duneanalytics/client-sdk";
import { supabaseService } from './supabase';
import { walletAnalyticsService } from './walletAnalytics';

class DuneService {
  private client: DuneClient;
  private timer: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 5 * 60 * 1000; // 5分鐘

  constructor() {
    this.client = new DuneClient("MdStLrxoohfepf1sWAbISw21di5WQ8Sa");
  }

  private async fetchWallets(): Promise<string[]> {
    try {
      console.log('開始從 Dune 獲取錢包數據...');
      
      const result = await this.client.getLatestResult({
        queryId: 4461837
      });
      
      console.log('Dune API 響應:', result);
      
      if (!result || !Array.isArray(result.result?.rows)) {
        console.warn('Dune API 響應格式不符合預期:', result);
        return [];
      }

      const wallets = result.result.rows.map((row: any) => 
        (row.address || '').toLowerCase()
      ).filter(Boolean);

      console.log('成功解析錢包地址:', wallets.length, '個地址');
      return wallets;
    } catch (error) {
      console.error('從 Dune 獲取錢包時發生錯誤:', error);
      return [];
    }
  }

  private async updateWalletTracking(currentWallets: string[]) {
    console.log('開始更新錢包追蹤狀態...');
    
    // 更新所有當前在列表上的錢包的時間
    for (const address of currentWallets) {
      await supabaseService.updateWalletTime(address);
    }
  }

  public async startTracking() {
    console.log('開始追蹤錢包...');
    
    if (this.timer) {
      console.log('追蹤已在進行中');
      return;
    }

    const checkWallets = async () => {
      const currentWallets = await this.fetchWallets();
      await this.updateWalletTracking(currentWallets);
    };

    // 立即執行一次
    await checkWallets();

    // 設置定期檢查
    this.timer = setInterval(checkWallets, this.POLLING_INTERVAL);
    console.log('已設置定期檢查，間隔:', this.POLLING_INTERVAL / 1000, '秒');
  }

  public stopTracking() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('已停止追蹤');
    }
  }
}

export const duneService = new DuneService();