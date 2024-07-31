import { InterfacePageName } from '@uniswap/analytics-events'
import { Currency } from '@uniswap/sdk-core'
import { PopupContainer } from 'components/Banner/shared/styled'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import SwapHeader from 'components/swap/SwapHeader'
import { PageWrapper, SwapWrapper } from 'components/swap/styled'
import { useSupportedChainId } from 'constants/chains'
import { useScreenSize } from 'hooks/screenSize'
import { useAccount } from 'hooks/useAccount'
import { BuyForm } from 'pages/Swap/Buy/BuyForm'
import { LimitFormWrapper } from 'pages/Swap/Limit/LimitForm'
import { SendForm } from 'pages/Swap/Send/SendForm'
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { InterfaceTrade, TradeState } from 'state/routing/types'
import { isPreviewTrade } from 'state/routing/utils'
import { SwapAndLimitContextProvider, SwapContextProvider } from 'state/swap/SwapContext'
import { useInitialCurrencyState } from 'state/swap/hooks'
import { CurrencyState, SwapAndLimitContext } from 'state/swap/types'
import { useIsDarkMode } from 'theme/components/ThemeToggle'
import { Flex } from 'ui/src'
import { FeatureFlags } from 'uniswap/src/features/gating/flags'
import { useFeatureFlag } from 'uniswap/src/features/gating/hooks'
import Trace from 'uniswap/src/features/telemetry/Trace'
import { InterfaceChainId } from 'uniswap/src/types/chains'
import { SwapTab } from 'uniswap/src/types/screens/interface'

export function getIsReviewableQuote(
  trade: InterfaceTrade | undefined,
  tradeState: TradeState,
  swapInputError?: ReactNode,
): boolean {
  if (swapInputError) {
    return false
  }
  // if the current quote is a preview quote, allow the user to progress to the Swap review screen
  if (isPreviewTrade(trade)) {
    return true
  }

  return Boolean(trade && tradeState === TradeState.VALID)
}

export default function SwapPage({ className }: { className?: string }) {
  const location = useLocation()
  const multichainUXEnabled = useFeatureFlag(FeatureFlags.MultichainUX)

  const { initialInputCurrency, initialOutputCurrency, initialChainId } = useInitialCurrencyState()
  const isUnsupportedConnectedChain = useSupportedChainId(useAccount().chainId) === undefined
  const shouldDisableTokenInputs = multichainUXEnabled ? false : isUnsupportedConnectedChain

  return (
    <Trace logImpression page={InterfacePageName.SWAP_PAGE}>
      <PageWrapper>
        <Swap
          className={className}
          chainId={initialChainId}
          multichainUXEnabled={multichainUXEnabled}
          disableTokenInputs={shouldDisableTokenInputs}
          initialInputCurrency={initialInputCurrency}
          initialOutputCurrency={initialOutputCurrency}
          syncTabToUrl={true}
        />
      </PageWrapper>
      {location.pathname === '/swap' && <SwitchLocaleLink />}
    </Trace>
  )
}

const ShowPreconfirmedContext = createContext<
  { showPreconfirmedSlot: number | undefined, setShowPreconfirmedSlot: Dispatch<SetStateAction<number | undefined>> }
>({ showPreconfirmedSlot: undefined, setShowPreconfirmedSlot: () => null });
export const PreconfirmedProvider = ({ children }: any) => {
  const [showPreconfirmedSlot, setShowPreconfirmedSlot] = useState<number | undefined>();

  return (
    <ShowPreconfirmedContext.Provider value={{ showPreconfirmedSlot, setShowPreconfirmedSlot }}>
      {children}
    </ShowPreconfirmedContext.Provider>
  );
};
export const useShowPreconfirmed = () => useContext(ShowPreconfirmedContext);

/**
 * The swap component displays the swap interface, manages state for the swap, and triggers onchain swaps.
 *
 * In most cases, chainId should refer to the connected chain, i.e. `useAccount().chainId`.
 * However if this component is being used in a context that displays information from a different, unconnected
 * chain (e.g. the TDP), then chainId should refer to the unconnected chain.
 */
export function Swap({
  className,
  initialInputCurrency,
  initialOutputCurrency,
  chainId,
  onCurrencyChange,
  multichainUXEnabled = false,
  disableTokenInputs = false,
  compact = false,
  syncTabToUrl,
}: {
  className?: string
  chainId?: InterfaceChainId
  onCurrencyChange?: (selected: CurrencyState) => void
  disableTokenInputs?: boolean
  initialInputCurrency?: Currency
  initialOutputCurrency?: Currency
  compact?: boolean
  syncTabToUrl: boolean
  multichainUXEnabled?: boolean
}) {
  const isDark = useIsDarkMode()
  const screenSize = useScreenSize()
  const forAggregatorEnabled = useFeatureFlag(FeatureFlags.ForAggregatorWeb)

  return (
    <PreconfirmedProvider>

      <ShowPreconfirmedComponent />

      <SwapAndLimitContextProvider
        initialChainId={chainId}
        initialInputCurrency={initialInputCurrency}
        initialOutputCurrency={initialOutputCurrency}
        multichainUXEnabled={multichainUXEnabled}
      >
        {/* TODO: Move SwapContextProvider inside Swap tab ONLY after SwapHeader removes references to trade / autoSlippage */}
        <SwapAndLimitContext.Consumer>
          {({ currentTab }) => (
            <SwapContextProvider multichainUXEnabled={multichainUXEnabled}>
              <Flex width="100%">
                <SwapWrapper isDark={isDark} className={className} id="swap-page">
                  <SwapHeader compact={compact || !screenSize.sm} syncTabToUrl={syncTabToUrl} />
                  {currentTab === SwapTab.Limit && <LimitFormWrapper onCurrencyChange={onCurrencyChange} />}
                  {currentTab === SwapTab.Send && (
                    <SendForm disableTokenInputs={disableTokenInputs} onCurrencyChange={onCurrencyChange} />
                  )}
                  {currentTab === SwapTab.Buy && forAggregatorEnabled && <BuyForm disabled={disableTokenInputs} />}
                </SwapWrapper>
                <NetworkAlert />
              </Flex>
            </SwapContextProvider>
          )}
        </SwapAndLimitContext.Consumer>
      </SwapAndLimitContextProvider>
    </PreconfirmedProvider>
  )
}

function ShowPreconfirmedComponent() {
  const { showPreconfirmedSlot } = useShowPreconfirmed();
  console.log("showPreconfirmed in component", showPreconfirmedSlot);

  return (
    <div style={{ display: showPreconfirmedSlot ? 'block' : 'none' }}>
      <div style={{
        width: '100%', position: "fixed", top: '90px',
        right: "15px", display: 'flex', justifyContent: 'end', zIndex: 999
      }}>
        <PopupContainer show>
          <div style={{
            display: 'flex', marginTop: '-12px', flexDirection: 'column', paddingBottom: '4px',
            gap: '8px', lineHeight: 0, justifyContent: 'center', alignItems: 'center'
          }}>
            <p style={{ fontWeight: '500' }}>Transaction preconfirmed ✨</p>
            <a style={{
              cursor: 'pointer', fontSize: 'small', color: '#FC72FF',
              textDecoration: 'underline', fontWeight: '400'
            }} href={`https://dora.helder-devnets.xyz/slot/${showPreconfirmedSlot}`} target='_blank'>Will be included soon™️</a>
          </div>
        </PopupContainer>
      </div >
    </div>
  )
}