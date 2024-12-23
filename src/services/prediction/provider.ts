import { ethers } from 'ethers';
import { REQUEST_DELAY } from './constants';

export class ProviderService {
  private static instance: ProviderService;
  private providers: ethers.JsonRpcProvider[];
  private currentProviderIndex: number;
  private lastProviderSwitch: number;
  private readonly rpcUrls = [
    'https://bsc-dataseed1.bnbchain.org',
    'https://bsc-dataseed2.bnbchain.org',
    'https://bsc-dataseed3.bnbchain.org',
    'https://bsc-dataseed4.bnbchain.org'
  ];

  private constructor() {
    this.providers = this.rpcUrls.map(url => {
      const provider = new ethers.JsonRpcProvider(url);
      provider.pollingInterval = REQUEST_DELAY;
      return provider;
    });
    this.currentProviderIndex = 0;
    this.lastProviderSwitch = Date.now();
  }

  public static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    const currentTime = Date.now();
    const timeSinceLastSwitch = currentTime - this.lastProviderSwitch;
    
    // 如果距離上次切換時間不到30秒，等待一下
    if (timeSinceLastSwitch < 30000) {
      await this.delay(5000);
    }

    const provider = this.providers[this.currentProviderIndex];
    
    try {
      // 測試提供者是否正常運作
      await provider.getBlockNumber();
      return provider;
    } catch (error) {
      console.log(`Provider ${this.currentProviderIndex} 失敗，切換中...`);
      
      // 更新最後切換時間
      this.lastProviderSwitch = Date.now();
      
      // 切換到下一個提供者
      this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
      
      // 如果已經輪詢完所有提供者，等待較長時間後重試
      if (this.currentProviderIndex === 0) {
        await this.delay(REQUEST_DELAY * 2);
      }
      
      return this.getProvider();
    }
  }
}

export const providerService = ProviderService.getInstance();