import { randomBytes } from '@ylide/sdk';
import { SmartBuffer } from '@ylide/smart-buffer';
import { AbstractStorage } from '../storage/AbstractStorage';

export interface IClientBundle {
	timestamp: number;
	clientPublicKey: Uint8Array;
	clientSecretKey: Uint8Array;
}

export class ClientBundleController {
	constructor(private readonly storage: AbstractStorage) {
		//
	}

	async getClientBundle(): Promise<IClientBundle | null> {
		const values = await this.storage.getItems([
			'tmaw_registered_at',
			'tmaw_client_public_key',
			'tmaw_client_secret_key',
		]);
		if (!values || typeof values !== 'object') {
			return null;
		}
		const { tmaw_registered_at, tmaw_client_public_key, tmaw_client_secret_key } = values;
		if (
			typeof tmaw_registered_at !== 'string' ||
			typeof tmaw_client_public_key !== 'string' ||
			typeof tmaw_client_secret_key !== 'string'
		) {
			return null;
		}
		if (tmaw_client_public_key.length !== 64 || tmaw_client_secret_key.length !== 64) {
			return null;
		}
		const timestamp = Number(tmaw_registered_at);
		if (isNaN(timestamp) || timestamp <= 0) {
			return null;
		}
		return {
			timestamp,
			clientPublicKey: SmartBuffer.ofHexString(tmaw_client_public_key).bytes,
			clientSecretKey: SmartBuffer.ofHexString(tmaw_client_secret_key).bytes,
		};
	}

	async createNewBundle(): Promise<IClientBundle> {
		const clientPublicKey = randomBytes(32);
		const clientSecretKey = randomBytes(32);

		const clientPublicKeyHex = new SmartBuffer(clientPublicKey).toHexString();
		const clientSecretKeyHex = new SmartBuffer(clientSecretKey).toHexString();

		const timestamp = Date.now();

		await this.storage.setItems({
			tmaw_registered_at: timestamp.toString(),
			tmaw_client_public_key: clientPublicKeyHex,
			tmaw_client_secret_key: clientSecretKeyHex,
		});

		return {
			timestamp,
			clientPublicKey,
			clientSecretKey,
		};
	}

	async clearClientBundle() {
		await this.storage.removeItems(['tmaw_registered_at', 'tmaw_client_public_key', 'tmaw_client_secret_key']);
	}
}
