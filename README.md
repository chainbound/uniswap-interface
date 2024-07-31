# Uniswap Labs: Front End Interfaces

An open source repository for all Uniswap front end interfaces maintained by Uniswap Labs. Uniswap is a protocol for decentralized exchange of Ethereum tokens.

## Interfaces

- Web: [app.uniswap.org](https://app.uniswap.org)
- Wallet: [wallet.uniswap.org](https://wallet.uniswap.org)

## Socials / Contact

- Twitter: [@Uniswap](https://twitter.com/Uniswap)
- Reddit: [/r/Uniswap](https://www.reddit.com/r/Uniswap/)
- Email: [contact@uniswap.org](mailto:contact@uniswap.org)
- Discord: [Uniswap](https://discord.gg/FCfyBSbCU5)

## Uniswap Links

- Website: [uniswap.org](https://uniswap.org/)
- Docs: [uniswap.org/docs/](https://docs.uniswap.org/)

## Whitepapers

- [V3](https://uniswap.org/whitepaper-v3.pdf)
- [V2](https://uniswap.org/whitepaper.pdf)
- [V1](https://hackmd.io/C-DvwDSfSxuh-Gd4WKE_ig)

## Apps

For instructions per application or package, see the README published for each application:

- [Web](apps/web/README.md)
- [Mobile](apps/mobile/README.md)

## Releases

All interface releases are tagged and published to this repository. To browse them easily, see the [Github releases tab](https://github.com/Uniswap/interface/releases).

## Translations

Translations for our applications are done through [crowdin](https://crowdin.com).

| App     | Coverage |
| ------- | -------- |
| web     | [![Crowdin](https://badges.crowdin.net/uniswap-interface/localized.svg)](https://crowdin.com/project/uniswap-interface) |
| mobile  | [![Crowdin](https://badges.crowdin.net/uniswap-wallet/localized.svg)](https://crowdin.com/project/uniswap-wallet) |

## 🗂 Directory Structure

| Folder      | Contents                                                                       |
| ----------- | ------------------------------------------------------------------------------ |
| `apps/`     | The home for each standalone application.                                      |
| `config/`   | Shared infrastructure packages and configurations.                             |
| `packages/` | Shared code packages covering UI, shared functionality, and shared utilities.  |

## Running the interface locally
See the README in the `apps/web` directory for instructions on how to run the interface locally.

## Sending Preconfirmations from this demo
This demo is a work-in-progress, and as of now the quickest way we've found to enable sending preconfirmantions
from a wallet like MetaMask is by enabling the `eth_sign` method in the "advanced" settings of MetaMask.

Metamask will warn you every time you're signing something with this method, but be sure to disable it when you're done testing.
It is also highly recommended to just use this method for the Helder Testnet and not in any production environment.
