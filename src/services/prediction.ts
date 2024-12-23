import { ethers } from 'ethers';

const PREDICTION_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp, int256 lockPrice, int256 closePrice, uint256 lockOracleId, uint256 closeOracleId, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount, uint256 rewardBaseCalAmount, uint256 rewardAmount, bool oracleCalled)",
  "event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event Claim(address indexed sender, uint256 indexed epoch, uint256 amount)",
];

const PREDICTION_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";
const BLOCKS_PER_QUERY = 5000;
const QUERY_DELAY = 8000;
const RPC_SWITCH_DELAY = 8000;

const BSC_NETWORK = {
  name: 'bnb',
  chainId: 56,
  ensAddress: null,
  ensNetwork: null
};

// Updated RPC endpoints with more reliable and CORS-enabled nodes
const RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
  "https://endpoints.omniatech.io/v1/bsc/mainnet/public",
  "https://bsc.meowrpc.com"
];

export class PredictionService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private interface: ethers.Interface;
  private currentRpcIndex: number = 0;
  private lastRequestTime: number = 0;
  private consecutiveFailures: number = 0;
  private maxRetries: number = 12;
  private eventCache: Map<string, any> = new Map();

  constructor() {
    this.provider = this.createProvider();
    this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, this.provider);
    this.interface = new ethers.Interface(PREDICTION_ABI);
  }

  private createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(
      RPC_ENDPOINTS[this.currentRpcIndex],
      BSC_NETWORK,
      {
        staticNetwork: null,
        batchMaxCount: 1,
        polling: true,
        pollingInterval: 15000,
        cacheTimeout: -1, // Disable caching to prevent stale data
        timeout: 30000, // Increase timeout to 30 seconds
      }
    );

    // Add custom error handling for the provider
    provider.on("error", (error) => {
      console.error("Provider error:", error);
      this.switchToNextRpc();
    });

    return provider;
  }

  private async switchToNextRpc(): Promise<void> {
    this.consecutiveFailures++;
    const backoffDelay = Math.min(
      RPC_SWITCH_DELAY * Math.pow(2, this.consecutiveFailures - 1),
      45000
    );
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    // Reset provider and contract with next RPC
    this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    this.provider = this.createProvider();
    this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, this.provider);
    console.log(`Switched to RPC endpoint: ${RPC_ENDPOINTS[this.currentRpcIndex]}`);
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
        this.consecutiveFailures = 0;
        return result;
      } catch (error: any) {
        console.error(`Operation attempt failed (${i + 1}/${this.maxRetries}):`, error);
        
        const isNetworkError = 
          error.code === 'NETWORK_ERROR' ||
          error.code === 'TIMEOUT' ||
          error.code === 'SERVER_ERROR' ||
          error.code === 'CALL_EXCEPTION' ||
          error.message.includes('failed to meet quorum') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('failed to get payload') ||
          error.message.includes('connection error') ||
          error.message.includes('network error') ||
          error.message.includes('timeout') ||
          error.message.includes('request failed') ||
          error.message.includes('too many requests');
        
        if (isNetworkError && i < this.maxRetries - 1) {
          await this.switchToNextRpc();
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

  async getRoundInfo(epoch: number) {
    return await this.executeWithRetry(() => this.contract.rounds(epoch));
  }

  private getCacheKey(address: string, epoch: number): string {
    return `${address.toLowerCase()}-${epoch}`;
  }

  private async queryLogs(filter: any): Promise<ethers.Log[]> {
    return await this.executeWithRetry(async () => {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = latestBlock - BLOCKS_PER_QUERY;
      
      const logs = await this.provider.getLogs({
        ...filter,
        fromBlock,
        toBlock: latestBlock,
      });
      
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
        const cacheKey = this.getCacheKey(address, epoch);

        // 檢查是否已經處理過這個事件
        if (this.eventCache.has(cacheKey)) {
          continue;
        }

        // 將事件加入快取
        this.eventCache.set(cacheKey, true);

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
        const cacheKey = this.getCacheKey(address, Number(epoch));
        if (!this.eventCache.has(cacheKey)) {
          this.eventCache.set(cacheKey, true);
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
        const cacheKey = this.getCacheKey(address, Number(epoch));
        if (!this.eventCache.has(cacheKey)) {
          this.eventCache.set(cacheKey, true);
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