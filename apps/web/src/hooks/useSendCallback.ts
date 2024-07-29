import { TransactionRequest } from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useSupportedChainId } from 'constants/chains'
import { useAccount } from 'hooks/useAccount'
import { useEthersProvider } from 'hooks/useEthersProvider'
import { useSwitchChain } from 'hooks/useSwitchChain'
import { GasFeeResult } from 'hooks/useTransactionGasFee'
import { useCallback } from 'react'
import { useTransactionAdder } from 'state/transactions/hooks'
import { SendTransactionInfo, TransactionType } from 'state/transactions/types'
import { trace } from 'tracing/trace'
import { UniverseChainId } from 'uniswap/src/types/chains'
import { currencyId } from 'utils/currencyId'
import { UserRejectedRequestError, toReadableError } from 'utils/errors'
import { didUserReject } from 'utils/swapErrorToUserReadableMessage'

export function useSendCallback({
  currencyAmount,
  recipient,
  transactionRequest,
  gasFee,
}: {
  currencyAmount?: CurrencyAmount<Currency>
  recipient?: string
  transactionRequest?: TransactionRequest
  gasFee?: GasFeeResult
}) {
  const account = useAccount()
  console.log('account inside useSendCallback', account)
  const provider = useEthersProvider({ chainId: account.chainId })
  const addTransaction = useTransactionAdder()
  const switchChain = useSwitchChain()
  const supportedTransactionChainId = useSupportedChainId(transactionRequest?.chainId)

  return useCallback(
    () =>
      trace({ name: 'Send', op: 'send' }, async (trace) => {
        // if (account.status !== 'connected') {
        //   throw new Error('wallet must be connected to send')
        // }
        // if (!provider) {
        //   throw new Error('missing provider')
        // }
        // if (!transactionRequest) {
        //   throw new Error('missing to transaction to execute')
        // }
        // if (!currencyAmount) {
        //   throw new Error('missing currency amount to send')
        // }
        // if (!recipient) {
        //   throw new Error('missing recipient')
        // }
        // if (!supportedTransactionChainId) {
        //   throw new Error('missing chainId in transactionRequest')
        // }

        console.log('past checks in useSendCallback')

        const nonce = await provider!.getTransactionCount(account.address!)
        console.log('nonce', nonce)

        const defaultTransactionRequest: TransactionRequest = {
          chainId: UniverseChainId.Helder,
          to: '0xaF05F88369c4fEbF96f2B2fa046E831De174Ee95',
          value: '0x1000000',
          data: '0xB017B017B017B017B017B017B017B017B017B017B017B017B017',
          nonce: BigNumber.from(nonce),
          gasLimit: '0x5208',
          gasPrice: '0x3B9ACA000',
        }

        try {
          const response = await trace.child(
            { name: 'Send transaction', op: 'wallet.send_transaction' },
            async (walletTrace) => {
              try {
                // if (account.chainId !== supportedTransactionChainId) {
                //   await switchChain(supportedTransactionChainId!)
                // }
                console.log('prompting wallet to send tx')
                const signer = provider!.getSigner()
                const hash = await signer.sendUncheckedTransaction({
                  ...defaultTransactionRequest,
                })
                console.log('hash', hash)
                return hash
              } catch (error) {
                if (didUserReject(error)) {
                  walletTrace.setStatus('cancelled')
                  throw new UserRejectedRequestError(`Transfer failed: User rejected signature`)
                } else {
                  throw error
                }
              }
            },
          )
          console.log('response', response)
          const sendInfo: SendTransactionInfo = {
            type: TransactionType.SEND,
            currencyId: currencyId(currencyAmount!.currency),
            amount: currencyAmount!.quotient.toString(),
            recipient: recipient!,
          }
          console.log('sendInfo', sendInfo)
          // addTransaction(response, sendInfo)
        } catch (error) {
          if (error instanceof UserRejectedRequestError) {
            trace.setStatus('cancelled')
            throw error
          } else {
            throw toReadableError(`Transfer failed:`, error)
          }
        }
      }),
    [
      account.status,
      account.chainId,
      provider,
      transactionRequest,
      currencyAmount,
      recipient,
      addTransaction,
      gasFee?.params,
      supportedTransactionChainId,
      switchChain,
    ],
  )
}
