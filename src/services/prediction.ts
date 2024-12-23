import { ethers } from 'ethers';
import { 
  PREDICTION_ABI, 
  PREDICTION_ADDRESS,
  BLOCKS_PER_QUERY,
  QUERY_DELAY,
  CHUNK_SIZE,
  MAX_RETRIES,
  BSC_NETWORK,
  RPC_ENDPOINTS
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

  private async executeWithRetry<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
    try {
      await this.throttleRequest();
      return await operation();
    } catch (error: any) {
      console.error(`Operation failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);

      const isLimitExceeded = error.message?.includes('limit exceeded');
      
      if (isLimitExceeded && retryCount < MAX_RETRIES) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 15000);
        await new Promise(resolve => setTimeout(resolve, backoffDelay + QUERY_DELAY));
        return this.executeWithRetry(operation, retryCount + 1);
      }
      
      throw error;
    }
  }

  async getCurrentEpoch(): Promise<number> {
    return await this.executeWithRetry(async () => {
      const epoch = await this.contract.currentEpoch();
      return Number(epoch);
    });
  }

  private async queryLogsInChunks(filter: any, fromBlock: number, toBlock: number): Promise<ethers.Log[]> {
    const logs: ethers.Log[] = [];
    
    for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, toBlock);
      
      try {
        const chunkLogs = await this.executeWithRetry(async () => {
          return await this.provider.getLogs({
            ...filter,
            fromBlock: start,
            toBlock: end,
          });
        });
        
        logs.push(...chunkLogs);
        
        // Add extra delay between chunks
        if (start + CHUNK_SIZE <= toBlock) {
          await new Promise(resolve => setTimeout(resolve, QUERY_DELAY * 1.5));
        }
      } catch (error) {
        console.error(`Error fetching logs for blocks ${start}-${end}:`, error);
        // Continue with next chunk instead of failing completely
        await new Promise(resolve => setTimeout(resolve, QUERY_DELAY * 2));
        continue;
      }
    }
    
    return logs;
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
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(latestBlock - BLOCKS_PER_QUERY, 0);
      const logs = await this.queryLogsInChunks(filters, fromBlock, latestBlock);
      
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