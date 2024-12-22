import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface WalletListProps {
  wallets: any[];
  monitoring: boolean;
  onWalletRemove: (address: string) => void;
}

export const WalletList = ({
  wallets,
  monitoring,
  onWalletRemove,
}: WalletListProps) => {
  return (
    <div className="mb-8 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map(wallet => (
          <div key={wallet.address} className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onWalletRemove(wallet.address)}
              disabled={monitoring}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};