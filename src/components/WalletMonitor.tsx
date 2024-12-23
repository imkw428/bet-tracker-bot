import { useState } from 'react';
import { WalletDashboard } from './WalletDashboard';
import { useWalletData } from './wallet/hooks/useWalletData';
import { useWalletMonitoring } from './wallet/hooks/useWalletMonitoring';
import { MonitorHeader } from './wallet/components/MonitorHeader';
import { WalletInput } from './wallet/components/WalletInput';
import { useToast } from "@/components/ui/use-toast";
import { supabaseService } from '@/services/supabase';

export const WalletMonitor = () => {
  const [monitoring] = useState(true);
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [isSoundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  
  const {
    wallets,
    setWallets,
    handleWalletAdd,
    isLoading
  } = useWalletData();

  const { currentEpoch, predictionServiceRef, roundResults } = useWalletMonitoring(
    wallets,
    setWallets,
    isSoundEnabled,
    notificationSound
  );

  const handleAddWallet = async (address: string) => {
    try {
      console.log('Starting wallet addition process for:', address);
      
      // 檢查是否已存在
      const exists = wallets.some(w => w.address.toLowerCase() === address.toLowerCase());
      if (exists) {
        toast({
          title: "錯誤",
          description: "此錢包已在監控列表中",
          variant: "destructive",
        });
        return;
      }

      const wallet = await supabaseService.addWallet(address);
      console.log('Wallet added to Supabase:', wallet);
      
      if (wallet) {
        await handleWalletAdd(wallet);
        console.log('Wallet added to local state');
        
        toast({
          title: "成功",
          description: "已成功添加新錢包到監控列表",
        });
      }
    } catch (error) {
      console.error('添加錢包時發生錯誤:', error);
      toast({
        title: "錯誤",
        description: "添加錢包時發生錯誤，請稍後再試",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWallet = async (address: string) => {
    try {
      const success = await supabaseService.deleteWallet(address);
      if (success) {
        setWallets(prev => prev.filter(w => w.address !== address));
        toast({
          title: "成功",
          description: "已成功從監控列表中移除錢包",
        });
      }
    } catch (error) {
      console.error('刪除錢包時發生錯誤:', error);
      toast({
        title: "錯誤",
        description: "刪除錢包時發生錯誤",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 font-mono">
        <div className="text-center">載入中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 font-mono">
      <MonitorHeader />
      
      <WalletInput onAddWallet={handleAddWallet} />

      <WalletDashboard
        currentEpoch={currentEpoch}
        wallets={wallets}
        monitoring={monitoring}
        roundResults={roundResults}
        onDeleteWallet={handleDeleteWallet}
      />
    </div>
  );
};