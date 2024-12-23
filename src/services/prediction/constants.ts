export const PREDICTION_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp, int256 lockPrice, int256 closePrice, uint256 lockOracleId, uint256 closeOracleId, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount, uint256 rewardBaseCalAmount, uint256 rewardAmount, bool oracleCalled)",
  "event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event Claim(address indexed sender, uint256 indexed epoch, uint256 amount)",
];

export const PREDICTION_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";

export const BLOCKS_PER_QUERY = 100; // 降低每次查詢的區塊數量

export const REQUEST_DELAY = 3000; // 增加請求延遲到 3 秒

// 更新 RPC 節點列表，使用更穩定的節點
export const RPC_ENDPOINTS = [
  "https://bsc.publicnode.com",
  "https://1rpc.io/bnb",
  "https://bsc.meowrpc.com",
  "https://binance.nodereal.io",
  "https://bsc-mainnet.public.blastapi.io",
  "https://bsc-rpc.gateway.pokt.network"
];
