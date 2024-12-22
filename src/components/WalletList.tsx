import { Textarea } from "@/components/ui/textarea";
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface WalletListProps {
  wallets: any[];
  monitoring: boolean;
  onWalletAdd: (wallet: any) => void;
  onWalletRemove: (address: string) => void;
  onWalletNoteUpdate: (address: string, note: string) => void;
}

export const WalletList = ({
  wallets,
  monitoring,
  onWalletAdd,
  onWalletRemove,
  onWalletNoteUpdate
}: WalletListProps) => {
  return (
    <div className="mb-8 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map(wallet => (
          <div key={wallet.address} className="space-y-2">
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded">
              <span className="text-sm">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={() => onWalletRemove(wallet.address)}
                disabled={monitoring}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="添加備註..."
              value={wallet.note}
              onChange={(e) => onWalletNoteUpdate(wallet.address, e.target.value)}
              className="text-sm h-20"
              disabled={monitoring}
            />
          </div>
        ))}
      </div>
    </div>
  );
};