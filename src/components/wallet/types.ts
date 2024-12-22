import { WalletHistory } from '@/services/prediction/types';

export interface Bet {
  type: 'bull' | 'bear';
  epoch: number;
  amount: string;
}

export interface WalletData {
  address: string;
  history: WalletHistory | null;
  recentBets: Bet[];
  note: string;
  created_at: string;
}