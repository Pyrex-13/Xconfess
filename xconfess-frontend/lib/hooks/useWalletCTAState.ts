import { useWallet } from "@/lib/hooks/useWallet";

export type WalletCTAStatus =
  | "not-installed"
  | "not-connected"
  | "not-ready"
  | "ready"
  | "loading";

export interface WalletCTAState {
  status: WalletCTAStatus;
  disabled: boolean;
  guidance: string | null;
}

export function useWalletCTAState(opts?: {
  extraDisabled?: boolean;
}): WalletCTAState {
  const { isFreighterInstalled, isConnected, isReady, readinessError, isLoading } = useWallet();

  if (isLoading) {
    return { status: "loading", disabled: true, guidance: null };
  }

  if (!isFreighterInstalled) {
    return {
      status: "not-installed",
      disabled: true,
      guidance: "Install Freighter wallet to continue.",
    };
  }

  if (!isConnected) {
    return { status: "not-connected", disabled: false, guidance: null };
  }

  if (!isReady) {
    return {
      status: "not-ready",
      disabled: true,
      guidance: readinessError || "Wallet not ready.",
    };
  }

  return {
    status: "ready",
    disabled: opts?.extraDisabled ?? false,
    guidance: null,
  };
}
