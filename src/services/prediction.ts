import { ethers } from 'ethers';

const PREDICTION_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp, int256 lockPrice, int256 closePrice, uint256 lockOracleId, uint256 closeOracleId, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount, uint256 rewardBaseCalAmount, uint256 rewardAmount, bool oracleCalled)",
  "event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event Claim(address indexed sender, uint256 indexed epoch, uint256 amount)",
];

const PREDICTION_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";

export class PredictionService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org");
    this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, this.provider);
  }

  async getCurrentEpoch(): Promise<number> {
    return await this.contract.currentEpoch();
  }

  async getRoundInfo(epoch: number) {
    return await this.contract.rounds(epoch);
  }

  async getWalletHistory(address: string, fromEpoch: number, toEpoch: number) {
    const bullFilter = this.contract.filters.BetBull(address);
    const bearFilter = this.contract.filters.BetBear(address);
    const claimFilter = this.contract.filters.Claim(address);

    const [bullEvents, bearEvents, claimEvents] = await Promise.all([
      this.contract.queryFilter(bullFilter, -10000),
      this.contract.queryFilter(bearFilter, -10000),
      this.contract.queryFilter(claimFilter, -10000),
    ]);

    return {
      bulls: bullEvents.map(e => ({
        epoch: Number(e.args![1]),
        amount: ethers.formatEther(e.args![2]),
      })),
      bears: bearEvents.map(e => ({
        epoch: Number(e.args![1]),
        amount: ethers.formatEther(e.args![2]),
      })),
      claims: claimEvents.map(e => ({
        epoch: Number(e.args![1]),
        amount: ethers.formatEther(e.args![2]),
      })),
    };
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