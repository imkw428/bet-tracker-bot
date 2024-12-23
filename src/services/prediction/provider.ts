import { ethers } from 'ethers';
import { REQUEST_DELAY } from './constants';

export class ProviderService {
  private static instance: ProviderService;
  private providers: ethers.JsonRpcProvider[];
  private currentProviderIndex: number;
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
      console.log(`Provider ${this.currentProviderIndex} 失敗，切換中...`);
      await this.delay(REQUEST_DELAY);
      return this.switchProvider();
    }
  }

  async switchProvider(): Promise<ethers.JsonRpcProvider> {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    const newProvider = this.providers[this.currentProviderIndex];
    
    try {
      await newProvider.getBlockNumber();
      console.log(`已切換到 provider ${this.currentProviderIndex}`);
      return newProvider;
    } catch (error) {
      if (this.currentProviderIndex === 0) {
        await this.delay(REQUEST_DELAY * 2);
        throw new Error('所有 provider 都失敗了');
      }
      await this.delay(REQUEST_DELAY);
      return this.switchProvider();
    }
  }
}

export const providerService = ProviderService.getInstance();