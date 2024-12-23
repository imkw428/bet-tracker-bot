import { WalletCard } from "../WalletCard";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';

interface WalletListProps {
  wallets: Array<{
    address: string;
    history: {
      bulls: { epoch: number; amount: string; }[];
      bears: { epoch: number; amount: string; }[];
      claims: { epoch: number; amount: string; }[];
    } | null;
    recentBets: Array<{
      type: 'bull' | 'bear';
      epoch: number;
      amount: string;
    }>;
  }>;
  onRemoveWallet: (address: string) => void;
  isPaused: boolean;
}

export const WalletList = ({ wallets, onRemoveWallet, isPaused }: WalletListProps) => {
  return (
    <div className="space-y-2">
      {wallets.map(wallet => (
        <div key={wallet.address} className="flex items-center gap-2 bg-muted/50 p-2 rounded">
          <span>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => onRemoveWallet(wallet.address)}
            disabled={!isPaused}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};