import { Card } from "@/components/ui/card";
import { WalletCard } from './WalletCard';

interface WalletDashboardProps {
  currentEpoch: number | null;
  wallets: any[];
  monitoring: boolean;
  roundResults: Record<number, 'bull' | 'bear'>;
  onDeleteWallet: (address: string) => void;
}

export const WalletDashboard = ({ 
  currentEpoch, 
  wallets, 
  monitoring, 
  roundResults,
  onDeleteWallet 
}: WalletDashboardProps) => {
  if (!monitoring) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="p-4 col-span-full bg-white dark:bg-gray-900 shadow-lg border border-emerald-100 dark:border-emerald-800">
        <h2 className="text-lg font-bold mb-4 text-emerald-600 dark:text-emerald-400">當前狀態</h2>
        <div className="space-y-2">
          <p className="text-sm">當前回合: <span className="animate-blink">{currentEpoch}</span></p>
          <p className="text-sm">監控錢包數量: {wallets.length}</p>
        </div>
      </Card>

      {wallets.map(wallet => (
        <WalletCard
          key={wallet.address}
          address={wallet.address}
          history={wallet.history}
          recentBets={wallet.recentBets}
          note={wallet.note}
          totalTimeOnList={wallet.total_time_on_list || 0}
          currentEpoch={currentEpoch || 0}
          roundResults={roundResults}
          onDelete={onDeleteWallet}
        />
      ))}
    </div>
  );
};