import { useState, useEffect, useRef } from 'react';
import { PredictionService } from '@/services/prediction';
import { duneService } from '@/services/dune';
import { useToast } from "@/components/ui/use-toast";
import { WalletData } from '../types';
import { supabaseService } from '@/services/supabase';

export const useWalletMonitoring = (
  wallets: WalletData[],
  setWallets: React.Dispatch<React.SetStateAction<WalletData[]>>,
  isSoundEnabled: boolean,
  notificationSound: HTMLAudioElement
) => {
  const { toast } = useToast();
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const [roundResults, setRoundResults] = useState<Record<number, 'bull' | 'bear'>>({});
  const predictionServiceRef = useRef<PredictionService>();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!predictionServiceRef.current) {
      predictionServiceRef.current = new PredictionService();
    }

    const predictionService = predictionServiceRef.current;

    const updateWalletData = async () => {
      // 檢查是否需要更新（每5分鐘更新一次）
      const now = Date.now();
      if (now - lastUpdateRef.current < 5 * 60 * 1000) {
        return;
      }
      
      try {
        const latestWallets = await supabaseService.getWallets();
        
        const updatedWallets = await Promise.all(
          latestWallets.map(async (wallet) => {
            const history = await predictionService.getWalletHistory(wallet.address, 0, 0);
            
            return {
              address: wallet.address,
              note: wallet.note || '',
              history,
              recentBets: [],
              created_at: wallet.created_at || new Date().toISOString(),
            } as WalletData;
          })
        );

        setWallets(updatedWallets);
        lastUpdateRef.current = now;
        
        toast({
          title: "錢包資料已更新",
          description: `已更新 ${updatedWallets.length} 個錢包的資料`,
        });
      } catch (error) {
        console.error('更新錢包資料時發生錯誤:', error);
        toast({
          title: "更新失敗",
          description: "更新錢包資料時發生錯誤",
          variant: "destructive",
        });
      }
    };

    const fetchData = async () => {
      try {
        const epoch = await predictionService.getCurrentEpoch();
        setCurrentEpoch(Number(epoch));

        // 獲取最近5回合的結果
        for (let i = 0; i < 5; i++) {
          const roundEpoch = Number(epoch) - i;
          const roundInfo = await predictionService.getRoundInfo(roundEpoch);
          
          if (roundInfo && roundInfo.closePrice && roundInfo.lockPrice) {
            const result = roundInfo.closePrice > roundInfo.lockPrice ? 'bull' : 'bear';
            setRoundResults(prev => ({ ...prev, [roundEpoch]: result }));
          }
        }

        // 在每一局開始時更新錢包資料
        await updateWalletData();
      } catch (error) {
        console.error('更新資料時發生錯誤:', error);
      }
    };

    const checkAndScheduleNextUpdate = async () => {
      if (!predictionService) return;
      
      try {
        // 獲取距離下一回合的時間（毫秒）
        const timeUntilNextRound = await predictionService.getTimeUntilNextRound();
        console.log('距離下一回合還有（毫秒）:', timeUntilNextRound);
        
        // 設定在下一回合開始時更新資料
        setTimeout(async () => {
          console.log('開始更新新回合資料');
          await fetchData();
          // 遞迴調用以設定下一次更新
          checkAndScheduleNextUpdate();
        }, timeUntilNextRound);

      } catch (error) {
        console.error('檢查下一回合時間時發生錯誤:', error);
        // 如果發生錯誤，2分鐘後重試
        setTimeout(checkAndScheduleNextUpdate, 120000);
      }
    };

    // 立即執行一次
    fetchData();
    checkAndScheduleNextUpdate();

    const cleanupFns = wallets.map(wallet => {
      return predictionService.onNewBet(wallet.address, (bet) => {
        if (isSoundEnabled) {
          notificationSound.play().catch(console.error);
        }

        setWallets(prevWallets => 
          prevWallets.map(w => {
            if (w.address === wallet.address) {
              return {
                ...w,
                recentBets: [bet]
              };
            }
            return w;
          })
        );

        toast({
          title: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)} 新的${bet.type === 'bull' ? '看漲' : '看跌'}下注!`,
          description: `金額: ${bet.amount} BNB，回合: ${bet.epoch}`,
        });
      });
    });

    return () => {
      cleanupFns.forEach(cleanup => cleanup && cleanup());
    };
  }, [wallets, toast, isSoundEnabled, notificationSound]);

  return { currentEpoch, predictionServiceRef, roundResults };
};