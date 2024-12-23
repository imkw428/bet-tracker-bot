import { DuneClient } from "@duneanalytics/client-sdk";
import { toast } from "@/components/ui/use-toast";

class DuneService {
  private client: DuneClient;
  private checkInterval: number = 300; // 5分鐘檢查一次
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    try {
      this.client = new DuneClient({ apiKey: "YOUR_API_KEY" });
    } catch (error) {
      console.error("初始化 Dune 客戶端時發生錯誤:", error);
    }
  }

  async fetchWallets() {
    try {
      console.info("開始從 Dune 獲取錢包數據...");
      const result = await this.client.getLatestResult("3247234");
      return result.rows;
    } catch (error) {
      console.error("從 Dune 獲取錢包時發生錯誤:", error);
      return [];
    }
  }

  async checkWallets() {
    try {
      console.info("開始更新錢包追蹤狀態...");
      const wallets = await this.fetchWallets();
      // 處理錢包數據...
    } catch (error) {
      console.error("檢查錢包時發生錯誤:", error);
    }
  }

  startTracking() {
    console.info("開始追蹤錢包...");
    console.info(`已設置定期檢查，間隔: ${this.checkInterval} 秒`);
    
    // 立即執行一次
    this.checkWallets();
    
    // 設置定時器
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.timer = setInterval(() => {
      this.checkWallets();
    }, this.checkInterval * 1000);
  }

  stopTracking() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const duneService = new DuneService();