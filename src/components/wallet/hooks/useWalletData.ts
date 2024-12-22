import { useState, useEffect } from 'react';
import { PredictionService } from '@/services/prediction';
import { supabaseService } from '@/services/supabase';
import { WalletData } from '../types';
import { useToast } from "@/components/ui/use-toast";

export const useWalletData = () => {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWallets = async () => {
      try {
        setIsLoading(true);
        const savedWallets = await supabaseService.getWallets();
        console.log('Loaded wallets:', savedWallets);
        
        const walletsWithHistory = await Promise.all(
          savedWallets.map(async w => {
            const predictionService = new PredictionService();
            const history = await predictionService.getWalletHistory(w.address, 0, 0);
            return {
              address: w.address,
              note: w.note || '',
              history,
              recentBets: [],
              created_at: w.created_at || new Date().toISOString(),
            };
          })
        );
        
        console.log('Wallets with history:', walletsWithHistory);
        setWallets(walletsWithHistory);
      } catch (error) {
        console.error('載入錢包時發生錯誤:', error);
        toast({
          title: "錯誤",
          description: "載入錢包資料時發生錯誤",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadWallets();
  }, [toast]);

  const handleWalletAdd = async (newWallet: any) => {
    try {
      const predictionService = new PredictionService();
      const history = await predictionService.getWalletHistory(newWallet.address, 0, 0);
      
      const walletData = {
        address: newWallet.address,
        note: newWallet.note || '',
        history,
        recentBets: [],
        created_at: newWallet.created_at,
      };
      
      setWallets(prev => [...prev, walletData]);
      
      toast({
        title: "成功",
        description: "已成功添加新錢包到監控列表",
      });
    } catch (error) {
      console.error('添加錢包時發生錯誤:', error);
      toast({
        title: "錯誤",
        description: "添加錢包時發生錯誤",
        variant: "destructive",
      });
    }
  };

  return {
    wallets,
    setWallets,
    handleWalletAdd,
    isLoading
  };
};