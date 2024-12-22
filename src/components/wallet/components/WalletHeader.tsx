interface WalletHeaderProps {
  address: string;
  hasHistory: boolean;
  totalTimeOnList: number;
}

export const WalletHeader = ({ 
  address,
  hasHistory,
  totalTimeOnList
}: WalletHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold">
          {`${address.slice(0, 6)}...${address.slice(-4)}`}
        </h3>
        <span className="text-sm text-gray-500">
          {`On List Time: ${totalTimeOnList} min`}
        </span>
      </div>
    </div>
  );
};