import { ethers } from 'ethers';

const PREDICTION_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp, int256 lockPrice, int256 closePrice, uint256 lockOracleId, uint256 closeOracleId, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount, uint256 rewardBaseCalAmount, uint256 rewardAmount, bool oracleCalled)",
  "event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event Claim(address indexed sender, uint256 indexed epoch, uint256 amount)",
];

const PREDICTION_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";
const BLOCKS_PER_QUERY = 2000;

// Updated RPC endpoints with more reliable nodes and API keys
const RPC_ENDPOINTS = [
  "https://bsc.getblock.io/mainnet/?api_key=your-api-key",
  "https://bsc.blockpi.network/v1/rpc/public",
  "https://1rpc.io/bnb",
  "https://bsc.meowrpc.com",
  "https://bsc.publicnode.com",
  "https://binance.llamarpc.com",
  "https://bsc-mainnet.public.blastapi.io",
  "https://bsc-rpc.gateway.pokt.network"
];

export class PredictionService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private interface: ethers.Interface;
  private currentRpcIndex: number = 0;
  private retryCount: number = 0;
  private maxRetries: number = 5; // Increased max retries

  constructor() {
    this.provider = this.createProvider();
    this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, this.provider);
    this.interface = new ethers.Interface(PREDICTION_ABI);
  }

  private createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[this.currentRpcIndex], {
      staticNetwork: ethers.Network.from(56), // BSC mainnet
      batchMaxCount: 1, // Reduce batch size to avoid rate limits
      polling: false, // Disable polling to reduce requests
      staticNetwork: true // Use static network to avoid network detection
    });
    provider.pollingInterval = 3000; // Increased polling interval
    return provider;
  }

  private async switchToNextRpc(): Promise<void> {
    console.log(`Switching to next RPC node, current index: ${this.currentRpcIndex}`);
    this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    this.provider = this.createProvider();
    this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, this.provider);
    
    if (this.currentRpcIndex === 0) {
      this.retryCount++;
      // Add exponential backoff delay
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, this.retryCount), 30000)));
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    while (this.retryCount < this.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        console.error(`Operation failed (retry ${this.retryCount + 1}/${this.maxRetries}):`, error);
        
        if (this.retryCount === this.maxRetries - 1) {
          throw new Error('All RPC nodes failed to connect, please try again later');
        }
        
        await this.switchToNextRpc();
      }
    }
    throw new Error('Maximum retry attempts exceeded');
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

  private async getBlockRanges(fromBlock: number, toBlock: number): Promise<Array<[number, number]>> {
    const ranges: Array<[number, number]> = [];
    for (let start = fromBlock; start <= toBlock; start += BLOCKS_PER_QUERY) {
      const end = Math.min(start + BLOCKS_PER_QUERY - 1, toBlock);
      ranges.push([start, end]);
    }
    return ranges;
  }

  private async queryLogsInBatches(filter: any): Promise<ethers.Log[]> {
    return await this.executeWithRetry(async () => {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = latestBlock - 10000; // 最近10000個區塊
      const ranges = await this.getBlockRanges(fromBlock, latestBlock);
      
      const allLogs: ethers.Log[] = [];
      for (const [start, end] of ranges) {
        try {
          const logs = await this.provider.getLogs({
            ...filter,
            fromBlock: start,
            toBlock: end,
          });
          allLogs.push(...logs);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`獲取日誌範圍 ${start}-${end} 時出錯:`, error);
          throw error;
        }
      }
      return allLogs;
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
      const logs = await this.queryLogsInBatches(filters);
      
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
        callback({
          type: 'bull',
          epoch: Number(epoch),
          amount: ethers.formatEther(amount),
        });
      }
    });

    this.contract.on("BetBear", (sender: string, epoch: bigint, amount: bigint) => {
      if (sender.toLowerCase() === address.toLowerCase()) {
        callback({
          type: 'bear',
          epoch: Number(epoch),
          amount: ethers.formatEther(amount),
        });
      }
    });
  }
}
