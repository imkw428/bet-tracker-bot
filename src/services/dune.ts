import { DuneClient } from "@duneanalytics/client-sdk";
import { supabaseService } from './supabase';
import { walletAnalyticsService } from './walletAnalytics';

class DuneService {
  private client: DuneClient;
  private timer: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 5 * 60 * 1000; // 5分钟

  constructor() {
    this.client = new DuneClient("MdStLrxoohfepf1sWAbISw21di5WQ8Sa");
  }

  private async fetchWallets(): Promise<string[]> {
    try {
      const result = await this.client.getLatestResult({
        queryId: 4461837
      });
      
      if (!result || !Array.isArray(result.result?.rows)) {
        console.warn('Unexpected Dune API response format:', result);
        return [];
      }

      return result.result.rows.map((row: any) => 
        (row.address || '').toLowerCase()
      ).filter(Boolean);
    } catch (error) {
      console.error('从 Dune 获取钱包时发生错误:', error);
      return [];
    }
  }

  private async updateWalletTracking(currentWallets: string[]) {
    // 更新所有钱包的活跃状态
    const existingWallets = await supabaseService.getWallets();
    const existingAddresses = new Set(existingWallets.map(w => w.address.toLowerCase()));

    // 更新所有已知钱包的活跃状态
    for (const address of existingAddresses) {
      const isPresent = currentWallets.includes(address);
      walletAnalyticsService.updateWalletActivity(address, isPresent);
    }

    // 添加新钱包到监控列表
    for (const address of currentWallets) {
      if (!existingAddresses.has(address)) {
        await supabaseService.addWallet(address);
        walletAnalyticsService.updateWalletActivity(address, true);
      }
    }
  }

  public async startTracking() {
    if (this.timer) {
      return;
    }

    const checkWallets = async () => {
      const currentWallets = await this.fetchWallets();
      await this.updateWalletTracking(currentWallets);
    };

    // 立即执行一次
    await checkWallets();

    // 设置定期检查
    this.timer = setInterval(checkWallets, this.POLLING_INTERVAL);
  }

  public stopTracking() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getWalletAnalytics(address: string) {
    return walletAnalyticsService.analyzeWallet(address);
  }

  public getWalletActivity(address: string) {
    return walletAnalyticsService.getWalletActivity(address);
  }
}

export const duneService = new DuneService();