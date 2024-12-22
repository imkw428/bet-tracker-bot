import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from 'lucide-react';
import { supabaseService } from '@/services/supabase';
import { toast } from "@/components/ui/use-toast";

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
  const [newAddress, setNewAddress] = useState('');

  const addWallet = async () => {
    if (!newAddress) {
      toast({
        title: "錯誤",
        description: "請輸入錢包地址",
        variant: "destructive",
      });
      return;
    }

    if (wallets.some(w => w.address.toLowerCase() === newAddress.toLowerCase())) {
      toast({
        title: "錯誤",
        description: "此錢包地址已在監控列表中",
        variant: "destructive",
      });
      return;
    }

    const newWallet = await supabaseService.addWallet(newAddress);
    if (newWallet) {
      onWalletAdd(newWallet);
      setNewAddress('');
    }
  };

  return (
    <div className="mb-8 space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="輸入錢包地址"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          className="flex-1"
        />
        <Button onClick={addWallet} disabled={monitoring}>
          添加錢包
        </Button>
      </div>

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