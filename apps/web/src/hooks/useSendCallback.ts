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
import { usePreconfirmations } from 'pages/Swap'
import { useCallback } from 'react'
import { useTransactionAdder } from 'state/transactions/hooks'
import { trace } from 'tracing/trace'
import { UniverseChainId } from 'uniswap/src/types/chains'
import { sleep } from 'utilities/src/time/timing'
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
  const {
    setPreconfirmedAtSlot,
    setNonceWithPreconfs,
    nonceWithPreconfs,
    preconfirmedAtSlot,
    setIncludedInBlock,
    setNoProposerInTheLookahead,
    setInternalError,
    setBalanceDecrease,
  } = usePreconfirmations()

  return useCallback(
    () =>
      trace({ name: 'Send', op: 'send' }, async (trace) => {
        if (!provider) {
          throw new Error('missing provider')
        }

        const nonce = await provider!.getTransactionCount(account.address!)
        // If nonce is not set, use the one from the provider
        if (!nonceWithPreconfs) setNonceWithPreconfs(nonce)

        const nonceToUse = nonceWithPreconfs || nonce

        console.log('nonceWithPreconfs', nonceToUse)
        console.log('recipient', recipient)

        let txReq = EthereumJS.FeeMarketEIP1559Transaction.fromTxData({
          chainId: UniverseChainId.Helder,
          nonce: nonceToUse,
          gasLimit: 42000,
          maxFeePerGas: parseUnits('1000', 'gwei').toBigInt(),
          maxPriorityFeePerGas: parseUnits('990', 'gwei').toBigInt(),
          to: recipient ?? '0x9d8D7157bc8f4C7569D32CFe63C65dD62D4c846C',
          value: parseUnits('1', 'ether').toBigInt(),
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
                  v: sigSplitted.recoveryParam,
                  r: sigSplitted.r,
                  s: sigSplitted.s,
                })

                const rawTransaction = toHexPrefixed(txReq.serialize())
                const recoveredSender = toHexPrefixed(txReq.getSenderAddress().toBytes())
                if (recoveredSender.toLowerCase() !== account.address!.toLowerCase()) {
                  console.error('Recovered sender does not match account address', recoveredSender, account.address)
                  return
                }
                console.log('rawTransaction', rawTransaction)

                type SidecarResponse = { slot: number; txs: string[]; signature: string; latency?: number }
                const start = Date.now()
                const rpcResponse = await fetch('https://bolt.chainbound.io/rpc', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_sendRawTransaction',
                    params: [rawTransaction],
                    id: 1,
                  }),
                })
                  .then(async (response) => {
                    if (!response.ok) throw new Error(`failed to send transaction: ${await response.text()}`)
                    else return response.json()
                  })
                  .then((res) => res.result as SidecarResponse)
                rpcResponse.latency = Date.now() - start

                return rpcResponse
              } catch (error) {
                if (didUserReject(error)) {
                  walletTrace.setStatus('cancelled')
                  throw new UserRejectedRequestError(`Transfer failed: User rejected signature`)
                } else if (error.message.includes('lookahead')) {
                  setNoProposerInTheLookahead(true)
                  sleep(5_000).then(() => setNoProposerInTheLookahead(false))
                  throw error
                } else if (error.message.includes('nonce')) {
                  setInternalError('nonce mismatch')
                  sleep(5_000).then(() => setInternalError(undefined))
                  throw error
                } else {
                  throw error
                }
              }
            },
          )

          console.log('response from sidecar', response)

          if (!response?.txs) {
            throw new Error('No tx hash returned')
          }

          const rawPreconfirmed = hexToBytes(response.txs[0] as any)
          const txHash = keccak256(rawPreconfirmed)
          console.log('txHash', txHash)

          // Bump the nonce. Note that we assume all transactions are sent using this frontend,
          // therefore it is safe to assume the correct nonce will the previous one just incremented
          setNonceWithPreconfs((prev) => (prev || 0) + 1)
          setBalanceDecrease(txReq.value)

          // show the preconfirmed popup for 5s
          sleep(200).then(() => setPreconfirmedAtSlot({ slot: response.slot, latency: response.latency }))
          sleep(5_500).then(() => setPreconfirmedAtSlot(undefined))

          // now start polling for actual inclusion in a block
          provider!.waitForTransaction(txHash).then(async (receipt) => {
            console.log('receipt', receipt)
            setPreconfirmedAtSlot(undefined)
            setIncludedInBlock({ block: receipt.blockNumber, hash: txHash })
            // make the popup disappear after 10s
            await sleep(10_000)
            setIncludedInBlock(undefined)
          })
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
