# Multi-Party Non-Custodial Wallet for Telegram Mini Apps

## **What is TMAWallet?**

TMAWallet is a wallet-as-a-service SDK designed to simplify wallet integration for Telegram mini-apps. Built using Multi-Party Computation (MPC) technology, TMAWallet provides a secure and seamless solution for developers to embed blockchain wallets directly into Telegram-based applications. With a focus on both ease of use and security, TMAWallet empowers developers to create decentralized applications (dApps) with minimal friction for end-users.

Most wallets available today are custodial, semi-custodial, or rely on your phone to stay functional—lose your phone, lose your wallet. TMA Wallet is built differently.

## **Why Use TMAWallet?**

1. **Secure by Design**: Neither our servers (nor yours), nor any third party (e.g., Telegram), have access to the user’s private key.
2. **As Seamless as Possible**: Designed specifically for Telegram Mini Apps, this wallet uses Telegram's frictionless mini-app authentication for effortless access.
3. **Truly Non-Custodial**: The user’s private key never leaves their device and only exists in memory for nanoseconds while signing transactions.
4. **Multi-Party Recovery**: Wallet recovery involves a six-step computational process using the user’s secret key stored in Telegram CloudStorage, a server-side secret key, and advanced cryptography (details in the footer).
5. **Open Source**: The code is fully auditable, ensuring complete transparency.
6. **Improved User Experience**: Whether on desktop or mobile, users logged into the same account can access the same wallet seamlessly.
7. **Familiar Interface**: TMA Wallet supports ethers.js out of the box, so you can use it as a drop-in replacement for other wallets.
8. **No privacy compromises**: TMA Wallet supports new Telegram Ed25519-signature scheme, so you don't need to give your bot token to us. We cryptographically validate user's authorization using Telegram Public Key and your public bot id.

## **Getting Started**

```bash
npm install --save @tmawallet/sdk
```

## Example Usage

```typescript
import { TMAWalletClient } from '@tmawallet/sdk';
import { ethers } from 'ethers';

const myApiKey = '1234567812345678'; // Replace with your API key from the TMA Wallet Dashboard

const client = new TMAWalletClient(myApiKey);
await client.authenticate(); // Automatically loads an existing user and wallet, or creates a new one if needed

console.log('Your wallet address: ', client.walletAddress);

const provider = new ethers.JsonRpcProvider();
const signer = client.getEthersSigner(provider); // Use TMA Wallet seamlessly with ethers.js and any provider

const tx = await signer.sendTransaction({
	to: '0x...',
	value: ethers.parseEther('1'),
});
```

## FAQ

### Is it safe?

Yes, it is safe. TMA Wallet is built using Multi-Party Computation (MPC) technology, which ensures that neither our servers (nor yours), nor any third party (e.g., Telegram), have access to the user’s private key.

### Which blockchain does it support?

Our solution is blockchain agnostic. As far as your blockchain supports private key based wallets, you can use TMA Wallet with it.

In this SDK we provide out-of-the-box ethers.js support, so you can use any blockchain that ethers.js supports (basically, any EVM-compatible blockchain).

If you want to use any other blockchain (or maybe even non-blockchain solution at all), you can do it by directly using `accessPrivateKey` method.

### How does it work?

It works in six steps:

1. We generate `ClientPublicKey` and `ClientSecretKey` 32-byte keys on the user's device and save them in the Telegram CloudStorage.
2. We send `ClientPublicKey` to the server along with Telegram-signed `initData` (current user's authorization data).
3. Server validates user's authorization (using new Telegram Ed25519-signature scheme) and checks second factor authentication (if it is enabled).
4. Then, server generates `IntermediaryKey` by signing (`ClientPublicKey` + `telegramUserId`) with `ServerSecretKey` (unique for your project).
5. Asymmetrically-encrypted `IntermediaryKey` is sent back to the device and decrypted.
6. Finally, `IntermediaryKey` is signed by `ClientSecretKey` and used as a `WalletPrivateKey`.

### Can user access their wallet from other devices?

Yes, user can access their wallet from any other device where they have the same Telegram account.

### What if user loses their device?

While user still has access to their Telegram account, they can get access to their wallet.

### Can user backup their wallet?

Yes, user can backup their wallet if you allow them to export `WalletPrivateKey` in your interface. However, please consider that wallet backup is usually used for the wallets that could not be recovered in case of device loss. As far as TMA Wallet tied to the Telegram account, it could be easily recovered in case of device loss. But anyway, we won't stop you from allowing users to export `WalletPrivateKey` if you really need it.
