import { useState, useEffect, useRef } from 'react';
import { PredictionService } from '@/services/prediction';
import { duneService } from '@/services/dune';
import { useToast } from "@/components/ui/use-toast";
import { WalletData } from '../types';

const POLLING_INTERVAL = 5 * 60 * 1000; // 5分鐘

export const useWalletMonitoring = (
  wallets: WalletData[],
  setWallets: React.Dispatch<React.SetStateAction<WalletData[]>>,
  isSoundEnabled: boolean,
  notificationSound: HTMLAudioElement
) => {
  const { toast } = useToast();
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const predictionServiceRef = useRef<PredictionService>();

  useEffect(() => {
    if (!predictionServiceRef.current) return;

    let interval: NodeJS.Timeout;
    const predictionService = predictionServiceRef.current;

    const fetchData = async () => {
      try {
        const epoch = await predictionService.getCurrentEpoch();
        setCurrentEpoch(Number(epoch));

        for (const wallet of wallets) {
          const history = await predictionService.getWalletHistory(wallet.address, 0, 0);
          setWallets(prevWallets =>
            prevWallets.map(w => {
              if (w.address === wallet.address) {
                return { ...w, history };
              }
              return w;
            })
          );
        }
      } catch (error) {
        console.error('更新資料時發生錯誤:', error);
      }
    };

    // 立即執行一次
    fetchData();

    // 設定5分鐘定時器
    interval = setInterval(fetchData, POLLING_INTERVAL);

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
      clearInterval(interval);
      cleanupFns.forEach(cleanup => cleanup && cleanup());
    };
  }, [wallets, toast, isSoundEnabled, notificationSound]);

  return { currentEpoch, predictionServiceRef };
};