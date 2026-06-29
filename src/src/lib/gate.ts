/**
 * CLAWDGate — wallet gating for paid tier
 *
 * This file is a stub. When you're ready to add wallet gating:
 *
 * 1. Set env vars in .env.local:
 *    CLAWD_GATE_CONTRACT=0xc22B7b983EC81523c969753c2385106835E8CfCE
 *    CLAWD_TOKEN_ADDRESS=0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07
 *    CLAWD_MINIMUM_BALANCE=10000000
 *    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id
 *
 * 2. Install: npm install wagmi viem @rainbow-me/rainbowkit
 *
 * 3. Replace the stub below with real balance checks against
 *    CLAWD_TOKEN_ADDRESS on Base (chainId 8453).
 *
 * The rest of the app reads from GateStatus.isUnlocked — nothing else
 * needs to change when this stub becomes real.
 */

import type { GateStatus } from '@/types'

export async function checkGateStatus(
  _walletAddress?: string,
): Promise<GateStatus> {
  // Gate is disabled until CLAWDGate is wired in
  return {
    enabled: false,
    isUnlocked: false,
  }
}

export function isPaidFeature(_feature: 'sector-scores' | 'deep-research'): boolean {
  // All features are free until gate is enabled
  return false
}
