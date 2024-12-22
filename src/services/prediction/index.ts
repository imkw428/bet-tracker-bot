import { ethers } from 'ethers';
import { ABI, PREDICTION_ADDRESS } from './constants';
import { ProviderService } from './provider';
import { LogService } from './logs';
import { BetEvent, RoundInfo } from './types';
import { toast } from "@/components/ui/use-toast";

export class PredictionService {
  private provider: ProviderService;
  private contract: ethers.Contract;
  private interface: ethers.Interface;
  private logService: LogService;

  constructor() {
    this.provider = ProviderService.getInstance();
    this.interface = new ethers.Interface(ABI);
    this.initializeContract();
    this.logService = new LogService();
  }

  private async initializeContract() {
    const provider = await this.provider.getProvider();
    this.contract = new ethers.Contract(
      PREDICTION_ADDRESS,
      ABI,
      provider
    );
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
    const maxRetries = 5;
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);

    try {
      return await operation();
    } catch (error) {
      console.error(`Operation failed (retry ${retryCount + 1}/${maxRetries}):`, error);
      
      if (retryCount >= maxRetries) {
        toast({
          title: "連接錯誤",
          description: "無法連接到區塊鏈網絡，請稍後再試",
          variant: "destructive",
        });
        throw new Error('Maximum retry attempts exceeded');
      }
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      const newProvider = await this.provider.switchProvider();
      this.contract = new ethers.Contract(PREDICTION_ADDRESS, ABI, newProvider);
      
      return this.executeWithRetry(operation, retryCount + 1);
    }
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
}

export * from './types';