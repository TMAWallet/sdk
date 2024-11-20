import { simpleHash } from '../utils/simpleHash';
import { AbstractStorage } from '../storage/AbstractStorage';

export class WalletBundleController {
	constructor(private readonly storage: AbstractStorage) {
		//
	}

	async getWalletAddress(clientPublicKey: Uint8Array) {
		const walletData = await this.storage.getItem('tmaw_wallet_address');
		if (walletData) {
			const [publicKeyHash, walletAddress] = walletData.split('|$|');
			const hash = simpleHash(clientPublicKey).toString(16);
			if (publicKeyHash === hash) {
				return walletAddress;
			}
		}
		return null;
	}

	async storeWalletAddress(clientPublicKey: Uint8Array, walletAddress: string) {
		const hash = simpleHash(clientPublicKey).toString(16);
		await this.storage.setItem('tmaw_wallet_address', `${hash}|$|${walletAddress}`);
	}

	async clearWalletAddress() {
		await this.storage.removeItem('tmaw_wallet_address');
	}
}
