import { ethers } from 'ethers';
import { 
  PREDICTION_ABI, 
  PREDICTION_ADDRESS,
  BLOCKS_PER_QUERY,
  QUERY_DELAY 
} from './blockchain/constants';
import { ProviderManager } from './blockchain/provider';
import { EventCache } from './blockchain/eventCache';

export class PredictionService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private interface: ethers.Interface;
  private providerManager: ProviderManager;
  private eventCache: EventCache;
  private lastRequestTime: number = 0;
  private maxRetries: number = 12;

  constructor() {
    this.providerManager = new ProviderManager();
    this.provider = this.providerManager.createProvider();
    this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, this.provider);
    this.interface = new ethers.Interface(PREDICTION_ABI);
    this.eventCache = new EventCache();
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < QUERY_DELAY) {
      await new Promise(resolve => setTimeout(resolve, QUERY_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        await this.throttleRequest();
        const result = await operation();
        this.providerManager.resetFailures();
        return result;
      } catch (error: any) {
        console.error(`Operation attempt failed (${i + 1}/${this.maxRetries}):`, error);
        
        const isNetworkError = 
          error.code === 'NETWORK_ERROR' ||
          error.code === 'TIMEOUT' ||
          error.code === 'SERVER_ERROR' ||
          error.code === 'CALL_EXCEPTION' ||
          error.message.includes('failed to meet quorum') ||
          error.message.includes('limit exceeded') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('failed to get payload') ||
          error.message.includes('connection error') ||
          error.message.includes('network error') ||
          error.message.includes('timeout') ||
          error.message.includes('request failed');
        
        if (isNetworkError && i < this.maxRetries - 1) {
          this.provider = await this.providerManager.switchToNextRpc();
          this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, this.provider);
          // Add exponential backoff delay
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000)));
          continue;
        }
        throw error;
      }
    }
    throw new Error('All retry attempts failed');
  }

  async getCurrentEpoch(): Promise<number> {
    return await this.executeWithRetry(async () => {
      const epoch = await this.contract.currentEpoch();
      return Number(epoch);
    });
  }

  private async queryLogs(filter: any): Promise<ethers.Log[]> {
    return await this.executeWithRetry(async () => {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(latestBlock - BLOCKS_PER_QUERY, 0);
      
      // Split the request into smaller chunks to avoid rate limits
      const blockChunkSize = 100;
      const logs: ethers.Log[] = [];
      
      for (let start = fromBlock; start <= latestBlock; start += blockChunkSize) {
        const end = Math.min(start + blockChunkSize, latestBlock);
        const chunkLogs = await this.provider.getLogs({
          ...filter,
          fromBlock: start,
          toBlock: end,
        });
        logs.push(...chunkLogs);
        // Add small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return logs;
    });
  }

  async getWalletHistory(address: string, fromEpoch: number, toEpoch: number) {
    const filters = {
      address: PREDICTION_ADDRESS,
      topics: [
        [
          this.interface.getEvent('BetBull').topicHash,
          this.interface.getEvent('BetBear').topicHash,
          this.interface.getEvent('Claim').topicHash,
        ],
        ethers.zeroPadValue(address.toLowerCase(), 32),
      ],
    };

    try {
      const logs = await this.queryLogs(filters);
      
      const bulls: { epoch: number; amount: string }[] = [];
      const bears: { epoch: number; amount: string }[] = [];
      const claims: { epoch: number; amount: string }[] = [];

      for (const log of logs) {
        const parsedLog = this.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (!parsedLog) continue;

        const epoch = Number(parsedLog.args[1]);
        const amount = ethers.formatEther(parsedLog.args[2]);
        const cacheKey = this.eventCache.getCacheKey(address, epoch);

        if (this.eventCache.has(cacheKey)) {
          continue;
        }

        this.eventCache.set(cacheKey);

        switch (parsedLog.name) {
          case 'BetBull':
            bulls.push({ epoch, amount });
            break;
          case 'BetBear':
            bears.push({ epoch, amount });
            break;
          case 'Claim':
            claims.push({ epoch, amount });
            break;
        }
      }

      return { bulls, bears, claims };
    } catch (error) {
      console.error('獲取錢包歷史記錄時出錯:', error);
      throw error;
    }
  }

  onNewBet(address: string, callback: (bet: { type: 'bull' | 'bear', epoch: number, amount: string }) => void) {
    this.contract.on("BetBull", (sender: string, epoch: bigint, amount: bigint) => {
      if (sender.toLowerCase() === address.toLowerCase()) {
        const cacheKey = this.eventCache.getCacheKey(address, Number(epoch));
        if (!this.eventCache.has(cacheKey)) {
          this.eventCache.set(cacheKey);
          callback({
            type: 'bull',
            epoch: Number(epoch),
            amount: ethers.formatEther(amount),
          });
        }
      }
    });

    this.contract.on("BetBear", (sender: string, epoch: bigint, amount: bigint) => {
      if (sender.toLowerCase() === address.toLowerCase()) {
        const cacheKey = this.eventCache.getCacheKey(address, Number(epoch));
        if (!this.eventCache.has(cacheKey)) {
          this.eventCache.set(cacheKey);
          callback({
            type: 'bear',
            epoch: Number(epoch),
            amount: ethers.formatEther(amount),
          });
        }
      }
    });
  }
}