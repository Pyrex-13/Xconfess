import { renderHook } from "@testing-library/react";
import { useWalletCTAState } from "@/lib/hooks/useWalletCTAState";
import { useWallet } from "@/lib/hooks/useWallet";
import {
  walletNotInstalled,
  disconnectedWallet,
  connectedWallet,
  wrongNetworkWallet,
  loadingWallet,
  connectedNotReadyWallet,
} from "@/tests/mocks/wallet-fixtures";

jest.mock("@/lib/hooks/useWallet", () => ({ useWallet: jest.fn() }));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

describe("useWalletCTAState", () => {
  afterEach(() => jest.resetAllMocks());

  it("returns loading state", () => {
    mockUseWallet.mockReturnValue(loadingWallet());
    const { result } = renderHook(() => useWalletCTAState());
    expect(result.current).toEqual({
      status: "loading",
      disabled: true,
      guidance: null,
    });
  });

  it("returns not-installed state", () => {
    mockUseWallet.mockReturnValue(walletNotInstalled());
    const { result } = renderHook(() => useWalletCTAState());
    expect(result.current).toEqual({
      status: "not-installed",
      disabled: true,
      guidance: "Install Freighter wallet to continue.",
    });
  });

  it("returns not-connected state", () => {
    mockUseWallet.mockReturnValue(disconnectedWallet());
    const { result } = renderHook(() => useWalletCTAState());
    expect(result.current).toEqual({
      status: "not-connected",
      disabled: false,
      guidance: null,
    });
  });

  it("returns not-ready state for wrong network", () => {
    mockUseWallet.mockReturnValue(wrongNetworkWallet());
    const { result } = renderHook(() => useWalletCTAState());
    expect(result.current).toEqual({
      status: "not-ready",
      disabled: true,
      guidance: "Wrong network. Please switch to TESTNET_SOROBAN",
    });
  });

  it("returns not-ready state for connected but not ready wallet", () => {
    mockUseWallet.mockReturnValue(connectedNotReadyWallet());
    const { result } = renderHook(() => useWalletCTAState());
    expect(result.current).toEqual({
      status: "not-ready",
      disabled: true,
      guidance: "Wallet not ready for transactions",
    });
  });

  it("returns ready state", () => {
    mockUseWallet.mockReturnValue(connectedWallet());
    const { result } = renderHook(() => useWalletCTAState());
    expect(result.current).toEqual({
      status: "ready",
      disabled: false,
      guidance: null,
    });
  });

  it("respects extraDisabled when ready", () => {
    mockUseWallet.mockReturnValue(connectedWallet());
    const { result } = renderHook(() =>
      useWalletCTAState({ extraDisabled: true }),
    );
    expect(result.current).toEqual({
      status: "ready",
      disabled: true,
      guidance: null,
    });
  });

  it("ignores extraDisabled when not ready", () => {
    mockUseWallet.mockReturnValue(wrongNetworkWallet());
    const { result } = renderHook(() =>
      useWalletCTAState({ extraDisabled: false }),
    );
    expect(result.current.disabled).toBe(true);
  });
});
