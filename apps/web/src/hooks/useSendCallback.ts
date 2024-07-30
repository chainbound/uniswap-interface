import { TransactionRequest } from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import { left } from '@popperjs/core'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useSupportedChainId } from 'constants/chains'
import { utils } from 'ethers'
import { hexlify, keccak256, parseUnits, recoverAddress, recoverPublicKey, RLP, splitSignature } from 'ethers/lib/utils'
import { useAccount } from 'hooks/useAccount'
import { useEthersProvider } from 'hooks/useEthersProvider'
import { useSwitchChain } from 'hooks/useSwitchChain'
import { GasFeeResult } from 'hooks/useTransactionGasFee'
import { toEvenLengthHex, toHexPrefixed } from 'lib/utils/hex'
import { useCallback, useState } from 'react'
import { useTransactionAdder } from 'state/transactions/hooks'
import { trace } from 'tracing/trace'
import { UniverseChainId } from 'uniswap/src/types/chains'
import { UserRejectedRequestError, toReadableError } from 'utils/errors'
import { didUserReject } from 'utils/swapErrorToUserReadableMessage'
import * as EthereumJS from "@ethereumjs/tx"
import { recoverTransactionAddress } from 'viem'
import { signTransaction } from 'viem/_types/accounts/utils/signTransaction'
import { getWalletClient } from 'wagmi/actions'
import { useWalletClient } from 'wagmi'

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
  const [nonceWithPreconfs, setNonceWithPreconfs] = useState(0);
  const walletClient = useWalletClient();

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
        if (nonceWithPreconfs === 0) setNonceWithPreconfs(nonce)

        console.log("nonceWithPreconfs", nonceWithPreconfs)


        let txReq = EthereumJS.FeeMarketEIP1559Transaction.fromTxData({
          chainId: UniverseChainId.Helder,
          nonce: nonce,
          gasLimit: 42000,
          maxFeePerGas: parseUnits('2', 'gwei').toBigInt(),
          maxPriorityFeePerGas: parseUnits('1', 'gwei').toBigInt(),
          to: '0xaF05F88369c4fEbF96f2B2fa046E831De174Ee95',
          value: parseUnits('0.001', 'ether').toBigInt(),
          data: '0xB017B017B017B017B017B017B017B017B017B017B017B017B017',
        })

        try {
          const response = await trace.child(
            { name: 'Send transaction', op: 'wallet.send_transaction' },
            async (walletTrace) => {
              try {
                // if (account.chainId !== supportedTransactionChainId) {j
                //   await switchChain(supportedTransactionChainId!)
                // }

                const preparedTxRequest = await walletClient.data!.prepareTransactionRequest({
                  account: account.address,
                  chainId: account.chainId,
                  maxFeePerGas: parseUnits('2', 'gwei').toBigInt(),
                  to: '0xaF05F88369c4fEbF96f2B2fa046E831De174Ee95',
                  maxPriorityFeePerGas: parseUnits('1', 'gwei').toBigInt(),
                  value: parseUnits('0.001', 'ether').toBigInt(),
                  data: '0xB017B017B017B017B017B017B017B017B017B017B017B017B017',
                  nonce: nonce,
                })
                console.log("before signTransaction", preparedTxRequest)
                const rawTransaction = await walletClient.data!.signTransaction(preparedTxRequest)
                console.log("rawTransaction", rawTransaction)

                // const signer = provider!.getSigner()
                // // 0x02f88f8501a2140cff038503b9aca0008503b9aca00082520894af05f88369c4febf96f2b2fa046e831de174ee9584010000009ab017b017b017b017b017b017b017b017b017b017b017b017b017c001a0d2f19f42e52656f1886c42bdc588297cbb812041c3bbcf76cf4e2a833fb80cfaa048dc78ad6177223a85eab12e735a3e5afcfdb56add259430c764c6003364408

                // // https://eips.ethereum.org/EIPS/eip-1559
                // // The signature_y_parity, signature_r, signature_s elements of this transaction represent a secp256k1 signature over 
                // // keccak256(0x02 || rlp([chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas, gas_limit, destination, amount, data, access_list])).
                // const serializedTx = txReq.getMessageToSign();
                // console.log("serializedTx", toHexPrefixed(serializedTx), "txreq", txReq)
                // const keccakSerializedTx = keccak256(serializedTx);
                // console.log("keccakSerializedTx", keccakSerializedTx)

                // const sig = await signer.signMessage(keccakSerializedTx);
                // const sigSplitted = splitSignature(sig);

                // console.log('sigSplitted', sigSplitted);

                // txReq = EthereumJS.FeeMarketEIP1559Transaction.fromTxData({ ...txReq, v: sigSplitted.recoveryParam, r: sigSplitted.r, s: sigSplitted.s });

                // const rawTransaction = toHexPrefixed(txReq.serialize())
                // console.log('rawTransaction', rawTransaction);
                // console.log("sender", toHexPrefixed(txReq.getSenderAddress().toBytes()))


                const hash: string = await provider?.send('eth_sendRawTransaction', [rawTransaction]);
                setNonceWithPreconfs((prev) => prev + 1)
                console.log("hash", hash)
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
