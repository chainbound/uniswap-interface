import * as EthereumJS from '@ethereumjs/tx'
import { TransactionRequest } from '@ethersproject/abstract-provider'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useSupportedChainId } from 'constants/chains'
import { keccak256, parseUnits, splitSignature } from 'ethers/lib/utils'
import { useAccount } from 'hooks/useAccount'
import { useEthersProvider } from 'hooks/useEthersProvider'
import { useSwitchChain } from 'hooks/useSwitchChain'
import { GasFeeResult } from 'hooks/useTransactionGasFee'
import { toHexPrefixed } from 'lib/utils/hex'
import { useCallback } from 'react'
import { useTransactionAdder } from 'state/transactions/hooks'
import { trace } from 'tracing/trace'
import { UniverseChainId } from 'uniswap/src/types/chains'
import { UserRejectedRequestError, toReadableError } from 'utils/errors'
import { didUserReject } from 'utils/swapErrorToUserReadableMessage'
import { hexToBytes } from 'viem'

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

        const nonce = await provider!.getTransactionCount(account.address!)

        let txReq = EthereumJS.FeeMarketEIP1559Transaction.fromTxData({
          chainId: UniverseChainId.Helder,
          nonce,
          gasLimit: 42000,
          maxFeePerGas: parseUnits('2', 'gwei').toBigInt(),
          maxPriorityFeePerGas: parseUnits('1', 'gwei').toBigInt(),
          to: '0xaf05f88369c4febf96f2b2fa046e831de174ee95',
          value: parseUnits('0.001', 'ether').toBigInt(),
          data: '0xb017b017b017b017b017b017b017b017b017b017b017b017b017',
        })

        try {
          const response = await trace.child(
            { name: 'Send transaction', op: 'wallet.send_transaction' },
            async (walletTrace) => {
              try {
                // if (account.chainId !== supportedTransactionChainId) {
                //   await switchChain(supportedTransactionChainId!)
                // }

                const signer = provider!.getSigner()

                // https://eips.ethereum.org/EIPS/eip-1559
                // The signature_y_parity, signature_r, signature_s elements of this transaction represent a secp256k1 signature over
                // keccak256(0x02 || rlp([chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas, gas_limit, destination, amount, data, access_list])).
                const serializedTx = txReq.getMessageToSign()
                const keccakSerializedTx = hexToBytes(keccak256(serializedTx) as any)
                const signature = await signer._legacySignMessage(keccakSerializedTx)
                console.log('signature', signature)

                const sigSplitted = splitSignature(signature)

                txReq = EthereumJS.FeeMarketEIP1559Transaction.fromTxData({
                  ...txReq,
                  v: 0,
                  r: sigSplitted.r,
                  s: sigSplitted.s,
                })

                const rawTransaction = toHexPrefixed(txReq.serialize())
                const recoveredSender = toHexPrefixed(txReq.getSenderAddress().toBytes())
                if (recoveredSender.toLowerCase() !== account.address!.toLowerCase()) {
                  console.error('Recovered sender does not match account address', recoveredSender, account.address)
                  return
                }

                const hash: string = await provider?.send('eth_sendRawTransaction', [rawTransaction])
                console.log('tx hash', hash)
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
          // const sendInfo: SendTransactionInfo = {
          //   type: TransactionType.SEND,
          //   currencyId: currencyId(currencyAmount!.currency),
          //   amount: currencyAmount!.quotient.toString(),
          //   recipient: recipient!,
          // }
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
