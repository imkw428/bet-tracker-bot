import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface WalletInputProps {
  onAddWallet: (address: string) => void;
}

export const WalletInput = ({ onAddWallet }: WalletInputProps) => {
  const [address, setAddress] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 簡單的地址格式驗證
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "錯誤",
        description: "請輸入有效的錢包地址",
        variant: "destructive",
      });
      return;
    }

    onAddWallet(address.toLowerCase());
    setAddress('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <Input
        type="text"
        placeholder="輸入錢包地址 (0x...)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="flex-1"
      />
      <Button type="submit">
        添加監控
      </Button>
    </form>
  );
};