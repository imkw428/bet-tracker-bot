import { Card } from "@/components/ui/card";
import { WalletAnalytics } from "@/types/wallet";
import { WalletHeader } from "./wallet/components/WalletHeader";
import { WalletAnalyticsDisplay } from "./wallet/components/WalletAnalytics";
import { BettingHistory } from "./wallet/components/BettingHistory";

interface Bet {
  type: 'bull' | 'bear';
  epoch: number;
  amount: string;
}

interface WalletHistory {
  bulls: { epoch: number; amount: string; }[];
  bears: { epoch: number; amount: string; }[];
  claims: { epoch: number; amount: string; }[];
}

interface WalletCardProps {
  address: string;
  history: WalletHistory | null;
  recentBets: Bet[];
  note: string;
  analytics?: WalletAnalytics;
  currentEpoch: number;
  totalTimeOnList: number;
}

export const WalletCard = ({ 
  address, 
  history, 
  analytics,
  currentEpoch,
  totalTimeOnList
}: WalletCardProps) => {
  const winningEpochs = history?.claims.map(claim => claim.epoch) || [];
  const hasHistory = history && (
    history.bulls.length > 0 || 
    history.bears.length > 0 || 
    history.claims.length > 0
  );

  const getRecentRounds = () => {
    if (!history) return [];
    
    const allBets = [
      ...history.bulls.map(bet => ({ ...bet, type: 'bull' as const })),
      ...history.bears.map(bet => ({ ...bet, type: 'bear' as const }))
    ];

    return Array.from({ length: 5 }, (_, index) => {
      const roundEpoch = currentEpoch - index;
      const bet = allBets.find(b => b.epoch === roundEpoch);
      const won = winningEpochs.includes(roundEpoch);
      
      return {
        epoch: roundEpoch,
        type: bet?.type || null,
        amount: bet?.amount || null,
        won
      };
    });
  };

  return (
    <Card className="p-4 bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800">
      <div className="space-y-4">
        <WalletHeader
          address={address}
          hasHistory={hasHistory}
          totalTimeOnList={totalTimeOnList}
        />

        <WalletAnalyticsDisplay analytics={analytics} />

        <BettingHistory rounds={getRecentRounds()} />
      </div>
    </Card>
  );
};