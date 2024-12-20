import { ethers } from 'ethers';

const PREDICTION_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp, int256 lockPrice, int256 closePrice, uint256 lockOracleId, uint256 closeOracleId, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount, uint256 rewardBaseCalAmount, uint256 rewardAmount, bool oracleCalled)",
  "event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event Claim(address indexed sender, uint256 indexed epoch, uint256 amount)",
];

const PREDICTION_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";
const BLOCKS_PER_QUERY = 2000; // Limit block range to avoid rate limiting

export class PredictionService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private interface: ethers.Interface;

  constructor() {
    this.provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org");
    this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, this.provider);
    this.interface = new ethers.Interface(PREDICTION_ABI);
  }

  async getCurrentEpoch(): Promise<number> {
    return await this.contract.currentEpoch();
  }

  async getRoundInfo(epoch: number) {
    return await this.contract.rounds(epoch);
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
    const latestBlock = await this.provider.getBlockNumber();
    const fromBlock = latestBlock - 10000; // Last 10000 blocks
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
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching logs for range ${start}-${end}:`, error);
      }
    }
    return allLogs;
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

    const logs = await this.queryLogsInBatches(filters);
    
    const bulls: { epoch: number; amount: string }[] = [];
    const bears: { epoch: number; amount: string }[] = [];
    const claims: { epoch: number; amount: string }[] = [];

    logs.forEach(log => {
      const parsedLog = this.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (!parsedLog) return;

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
    });

    return { bulls, bears, claims };
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