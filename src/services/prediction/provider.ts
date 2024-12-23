import { ethers } from 'ethers';
import { REQUEST_DELAY } from './constants';

export class ProviderService {
  private static instance: ProviderService;
  private providers: ethers.JsonRpcProvider[];
  private currentProviderIndex: number;
  private readonly rpcUrls = [
    'https://bsc-dataseed1.binance.org:443',
    'https://bsc-dataseed2.binance.org:443',
    'https://bsc-dataseed3.binance.org:443',
    'https://bsc-dataseed4.binance.org:443',
    'https://bsc-dataseed-failover.binance.org:443'
  ];

  private constructor() {
    this.providers = this.rpcUrls.map(url => {
      const provider = new ethers.JsonRpcProvider(url);
      provider.pollingInterval = REQUEST_DELAY; // 增加輪詢間隔
      return provider;
    });
    this.currentProviderIndex = 0;
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
    const provider = this.providers[this.currentProviderIndex];
    try {
      await provider.getBlockNumber();
      return provider;
    } catch (error) {
      console.log(`Provider ${this.currentProviderIndex} failed, switching...`);
      await this.delay(REQUEST_DELAY);
      return this.switchProvider();
    }
  }

  async switchProvider(): Promise<ethers.JsonRpcProvider> {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    const newProvider = this.providers[this.currentProviderIndex];
    
    try {
      await newProvider.getBlockNumber();
      console.log(`Switched to provider ${this.currentProviderIndex}`);
      return newProvider;
    } catch (error) {
      if (this.currentProviderIndex === 0) {
        await this.delay(REQUEST_DELAY * 2);
        throw new Error('All providers failed');
      }
      await this.delay(REQUEST_DELAY);
      return this.switchProvider();
    }
  }
}

export const providerService = ProviderService.getInstance();