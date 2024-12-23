import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface WalletInputProps {
  onAddWallet: (address: string) => void;
}

export const WalletInput = ({ onAddWallet }: WalletInputProps) => {
  const [address, setAddress] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 基本地址格式驗證
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        toast({
          title: "錯誤",
          description: "請輸入有效的錢包地址 (0x...)",
          variant: "destructive",
        });
        return;
      }

      console.log('Attempting to add wallet:', address);
      await onAddWallet(address.toLowerCase());
      setAddress('');
      
    } catch (error) {
      console.error('添加錢包時發生錯誤:', error);
      toast({
        title: "錯誤",
        description: "添加錢包失敗，請稍後再試",
        variant: "destructive",
      });
    }
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