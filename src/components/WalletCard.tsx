import { Card } from "@/components/ui/card";
import { WalletAnalytics } from "@/types/wallet";
import { WalletHeader } from "./wallet/components/WalletHeader";
import { WalletAnalyticsDisplay } from "./wallet/components/WalletAnalytics";
import { BettingHistory } from "./wallet/components/BettingHistory";
import { Badge } from "@/components/ui/badge";

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
  roundResults: Record<number, 'bull' | 'bear'>;
}

export const WalletCard = ({ 
  address, 
  history, 
  analytics,
  currentEpoch,
  totalTimeOnList,
  roundResults
}: WalletCardProps) => {
  const winningEpochs = history?.claims.map(claim => claim.epoch) || [];
  const hasHistory = history && (
    history.bulls.length > 0 || 
    history.bears.length > 0 || 
    history.claims.length > 0
  );

  // 計算最近一小時的領獎次數
  const recentClaimsCount = history?.claims.length || 0;

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
        won,
        result: roundResults[roundEpoch]
      };
    });
  };

  return (
    <Card className="p-4 bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 border border-emerald-100 dark:border-emerald-800">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <WalletHeader
            address={address}
            hasHistory={hasHistory}
            totalTimeOnList={totalTimeOnList}
          />
          {recentClaimsCount > 0 && (
            <Badge variant={recentClaimsCount >= 6 ? "destructive" : "secondary"}>
              {recentClaimsCount} 次領獎
            </Badge>
          )}
        </div>

        <WalletAnalyticsDisplay analytics={analytics} />

        <BettingHistory rounds={getRecentRounds()} />
      </div>
    </Card>
  );
};