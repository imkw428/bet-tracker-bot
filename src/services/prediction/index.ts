import { ethers } from 'ethers';
import { PREDICTION_ABI, PREDICTION_ADDRESS } from './constants';
import { ProviderService } from './provider';
import { LogService } from './logs';
import { BetEvent, RoundInfo } from './types';

export class PredictionService {
  private provider: ProviderService;
  private contract: ethers.Contract;
  private interface: ethers.Interface;
  private logService: LogService;

  constructor() {
    this.provider = new ProviderService();
    this.interface = new ethers.Interface(PREDICTION_ABI);
    this.initializeContract();
    this.logService = new LogService(this.provider, this.interface);
  }

  private async initializeContract() {
    const provider = await this.provider.getProvider();
    this.contract = new ethers.Contract(
      PREDICTION_ADDRESS,
      PREDICTION_ABI,
      provider
    );
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let retryCount = 0;
    const maxRetries = 5;

    while (retryCount < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        console.error(`Operation failed (retry ${retryCount + 1}/${maxRetries}):`, error);
        
        if (retryCount === maxRetries - 1) {
          throw new Error('Maximum retry attempts exceeded');
        }
        
        // Recreate the provider and contract
        const provider = await this.provider.getProvider();
        this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, provider);
        retryCount++;
        
        // Add delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  }

  async getCurrentEpoch(): Promise<number> {
    return this.executeWithRetry(async () => {
      const epoch = await this.contract.currentEpoch();
      return Number(epoch);
    });
  }

  async getRoundInfo(epoch: number): Promise<RoundInfo> {
    return this.executeWithRetry(() => this.contract.rounds(epoch));
  }

  async getTimeUntilNextRound(): Promise<number> {
    const currentEpoch = await this.getCurrentEpoch();
    const roundInfo = await this.getRoundInfo(currentEpoch);
    const startTimestamp = Number(roundInfo.startTimestamp) * 1000;
    return startTimestamp - Date.now();
  }

  async getWalletHistory(address: string, fromEpoch: number, toEpoch: number) {
    return this.executeWithRetry(() => this.logService.queryLogsInBatches(address));
  }

  onNewBet(address: string, callback: (bet: BetEvent) => void) {
    const setupListeners = () => {
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
    };

    setupListeners();

    return () => {
      this.contract.removeAllListeners("BetBull");
      this.contract.removeAllListeners("BetBear");
    };
  }

  setPollingInterval(intensive: boolean) {
    this.provider.setPollingInterval(intensive);
  }
}

export * from './types';