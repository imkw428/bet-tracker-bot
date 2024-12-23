import { Card } from "@/components/ui/card";
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
}

export const WalletCard = ({ address, history, recentBets }: WalletCardProps) => {
  const winningEpochs = history?.claims.map(claim => claim.epoch) || [];
  const latestBullBet = recentBets.find(bet => bet.type === 'bull');
  const latestBearBet = recentBets.find(bet => bet.type === 'bear');

  // 格式化金額到小數點後三位
  const formatAmount = (amount: string) => {
    return Number(amount).toFixed(3);
  };

  // 過濾重複的下注，只保留每個回合最新的一筆
  const uniqueRecentBets = recentBets.reduce((acc: Bet[], current) => {
    const existingBetIndex = acc.findIndex(bet => bet.epoch === current.epoch);
    if (existingBetIndex === -1) {
      acc.push(current);
    } else {
      acc[existingBetIndex] = current;
    }
    return acc;
  }, []);

  return (
    <Card className="p-4">
      <h2 className="text-xl font-bold mb-4">
        錢包 {address.slice(0, 6)}...{address.slice(-4)}
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-bold mb-2">贏得的回合</h3>
          <div className="flex flex-wrap gap-2">
            {winningEpochs.map((epoch) => (
              <Badge key={epoch} variant="default" className="bg-win text-white">
                回合 {epoch}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2">最近下注</h3>
          <div className="space-y-2">
            {uniqueRecentBets.map((bet, i) => (
              <div
                key={`${bet.epoch}-${i}`}
                className={`p-2 rounded ${
                  bet.type === 'bull' ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'
                }`}
              >
                {bet.type === 'bull' ? '看漲' : '看跌'} - {formatAmount(bet.amount)} BNB (回合 {bet.epoch})
              </div>
            ))}
          </div>
        </div>

        {history && (
          <div>
            <h3 className="font-bold mb-2">歷史記錄</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-bold text-win mb-2">
                  看漲下注 
                  {latestBullBet && (
                    <span className="ml-2 text-sm">
                      (最新: 回合 {latestBullBet.epoch})
                    </span>
                  )}
                </h4>
                {history.bulls.map((bet, i) => (
                  <div key={i} className="text-sm">
                    回合 {bet.epoch}: {formatAmount(bet.amount)} BNB
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-loss mb-2">
                  看跌下注
                  {latestBearBet && (
                    <span className="ml-2 text-sm">
                      (最新: 回合 {latestBearBet.epoch})
                    </span>
                  )}
                </h4>
                {history.bears.map((bet, i) => (
                  <div key={i} className="text-sm">
                    回合 {bet.epoch}: {formatAmount(bet.amount)} BNB
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-neutral mb-2">獲勝領取</h4>
                {history.claims.map((claim, i) => (
                  <div key={i} className="text-sm">
                    回合 {claim.epoch}: {formatAmount(claim.amount)} BNB
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};