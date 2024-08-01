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
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useState } from 'react'
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

const PreconfirmationsContext = createContext<{
  preconfirmedAtSlot?: number
  nonceWithPreconfs?: number
  includedInBlock?: { block: number; hash: string }
  noProposerInTheLookahead: boolean
  internalError?: string
  setPreconfirmedAtSlot: Dispatch<SetStateAction<number | undefined>>
  setNonceWithPreconfs: Dispatch<SetStateAction<number | undefined>>
  setIncludedInBlock: Dispatch<SetStateAction<{ block: number; hash: string } | undefined>>
  setNoProposerInTheLookahead: Dispatch<SetStateAction<boolean>>
  setInternalError: Dispatch<SetStateAction<string | undefined>>
}>({
  noProposerInTheLookahead: false,
  setPreconfirmedAtSlot: () => null,
  setNonceWithPreconfs: () => null,
  setIncludedInBlock: () => null,
  setNoProposerInTheLookahead: () => null,
  setInternalError: () => null,
})
export const PreconfirmedProvider = ({ children }: any) => {
  const [preconfirmedAtSlot, setPreconfirmedAtSlot] = useState<number | undefined>()
  const [nonceWithPreconfs, setNonceWithPreconfs] = useState<number | undefined>()
  const [includedInBlock, setIncludedInBlock] = useState<{ block: number; hash: string } | undefined>()
  const [noProposerInTheLookahead, setNoProposerInTheLookahead] = useState(false)
  const [internalError, setInternalError] = useState<string | undefined>()

  return (
    <PreconfirmationsContext.Provider
      value={{
        preconfirmedAtSlot,
        noProposerInTheLookahead,
        setNoProposerInTheLookahead,
        setPreconfirmedAtSlot,
        nonceWithPreconfs,
        setNonceWithPreconfs,
        includedInBlock,
        setIncludedInBlock,
        internalError,
        setInternalError,
      }}
    >
      {children}
    </PreconfirmationsContext.Provider>
  )
}
export const usePreconfirmations = () => useContext(PreconfirmationsContext)

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
      <ShowIncludedComponent />
      <ShowBadLuckComponent />
      <ShowInternalErrorComponent />

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

const DORA_URL = (slot?: number) => `https://dora.helder-devnets.xyz/slot/${slot}`
const BLOCKSCOUT_URL = (tx?: string) => `https://blockscout.helder-devnets.xyz/tx/${tx}`

function ShowPreconfirmedComponent() {
  const { preconfirmedAtSlot } = usePreconfirmations()

  return (
    <div style={{ display: preconfirmedAtSlot ? 'block' : 'none' }}>
      <div
        style={{
          position: 'fixed',
          top: '90px',
          right: '15px',
          display: 'flex',
          justifyContent: 'end',
          zIndex: 999,
        }}
      >
        <PopupContainer show>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <img src="/images/bolt_mascot_smile.png" alt="bolt mascot" style={{ width: '60px', height: '60px' }} />
            <div
              style={{
                display: 'flex',
                marginTop: '-12px',
                flexDirection: 'column',
                gap: '8px',
                lineHeight: 0,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <p style={{ fontWeight: '500', width: '200px', textAlign: 'center' }}>Transaction preconfirmed!</p>
              <a
                style={{
                  cursor: 'pointer',
                  fontSize: 'small',
                  color: '#FC72FF',
                  fontWeight: '400',
                }}
                href={DORA_URL(preconfirmedAtSlot)}
                target="_blank"
              >
                It will be included soon™️
              </a>
            </div>
          </div>
        </PopupContainer>
      </div>
    </div>
  )
}

function ShowIncludedComponent() {
  const { includedInBlock } = usePreconfirmations()

  return (
    <div style={{ display: !!includedInBlock ? 'block' : 'none' }}>
      <div
        style={{
          position: 'fixed',
          top: '90px',
          right: '15px',
          display: 'flex',
          justifyContent: 'end',
          zIndex: 999,
        }}
      >
        <PopupContainer show>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* <img src="/images/bolt_mascot_happy.png" alt="bolt mascot" style={{ width: '60px', height: '60px' }} /> */}
            <div
              style={{
                display: 'flex',
                marginTop: '-12px',
                flexDirection: 'column',
                gap: '8px',
                lineHeight: 0,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <p style={{ fontWeight: '500', width: '200px', textAlign: 'center' }}>Transaction included!</p>
              <a
                style={{
                  cursor: 'pointer',
                  fontSize: 'small',
                  color: '#FC72FF',
                  fontWeight: '400',
                }}
                href={BLOCKSCOUT_URL(includedInBlock?.hash)}
                target="_blank"
              >
                View on Blockscout
              </a>
            </div>
          </div>
        </PopupContainer>
      </div>
    </div>
  )
}

function ShowBadLuckComponent() {
  const { noProposerInTheLookahead } = usePreconfirmations()

  return (
    <div style={{ display: noProposerInTheLookahead ? 'block' : 'none' }}>
      <div
        style={{
          position: 'fixed',
          top: '90px',
          right: '15px',
          display: 'flex',
          justifyContent: 'end',
          zIndex: 999,
        }}
      >
        <PopupContainer show>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <img src="/images/bolt_mascot_unhappy.png" alt="bolt mascot" style={{ width: '60px', height: '60px' }} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                lineHeight: 0,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <p
                style={{
                  fontWeight: '500',
                  lineHeight: '1.25',
                  textAlign: 'center',
                  marginTop: '0px',
                  marginBottom: '0px',
                }}
              >
                No luck this time, please try again later!
              </p>
            </div>
          </div>
        </PopupContainer>
      </div>
    </div>
  )
}

function ShowInternalErrorComponent() {
  const { internalError } = usePreconfirmations()

  return (
    <div style={{ display: internalError ? 'block' : 'none' }}>
      <div
        style={{
          position: 'fixed',
          top: '90px',
          right: '15px',
          display: 'flex',
          justifyContent: 'end',
          zIndex: 999,
        }}
      >
        <PopupContainer show>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <img src="/images/bolt_mascot_unhappy.png" alt="bolt mascot" style={{ width: '60px', height: '60px' }} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                lineHeight: 0,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <p
                style={{
                  fontWeight: '500',
                  lineHeight: '1.25',
                  textAlign: 'center',
                  marginTop: '0px',
                  marginBottom: '0px',
                }}
              >
                Something went wrong: {internalError}
              </p>
            </div>
          </div>
        </PopupContainer>
      </div>
    </div>
  )
}
