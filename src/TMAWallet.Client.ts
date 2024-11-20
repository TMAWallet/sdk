import { ethers } from 'ethers';

import { hmacSha256 } from './utils/hmac-sha256';
import { IClientBundle } from './client/ClientBundleController';
import { ClientBundleController } from './client/ClientBundleController';
import { WalletBundleController } from './client/WalletBundleController';
import { AbstractStorage } from './storage/AbstractStorage';
import { TelegramCloudStorage } from './storage/TelegramCloudStorage';
import { SmartBuffer } from '@ylide/smart-buffer';
import WebApp from '@twa-dev/sdk';
import { TMAWalletSigner } from './ethers-signer/TMAWSigner';

const MAIN_ENDPOINT = 'https://haddock-crack-gelding.ngrok-free.app/tmawallet';

export interface ITMAWClientOptions {
	storage?: AbstractStorage;
	endpoint?: string;
	telegramInitData?: string;
}

export class TMAWalletClient {
	private _bundle: IClientBundle | null = null;
	private _walletAddress: string | null = null;

	private readonly telegramInitData: string;
	private readonly storage: AbstractStorage;
	private readonly endpoint: string;
	private clientBundleController: ClientBundleController;
	private walletBundleController: WalletBundleController;

	constructor(public readonly projectPublicToken: string, options: ITMAWClientOptions = {}) {
		this.endpoint = options.endpoint ?? MAIN_ENDPOINT;
		this.telegramInitData = options.telegramInitData || WebApp.initData;
		this.storage = options.storage ?? new TelegramCloudStorage();

		this.clientBundleController = new ClientBundleController(this.storage);
		this.walletBundleController = new WalletBundleController(this.storage);
	}

	async init() {
		this._bundle = await this.clientBundleController.getClientBundle();
		if (this._bundle) {
			this._walletAddress = await this.walletBundleController.getWalletAddress(this._bundle.clientPublicKey);
		} else {
			this._walletAddress = null;
		}
		return this.state;
	}

	async authenticate() {
		await this.init();
		if (!this._bundle) {
			await this.createBundle();
		} else {
			if (!this._walletAddress) {
				await this.initWallet();
			}
		}
	}

	getEthersSigner(provider?: null | ethers.Provider) {
		if (!this._bundle) {
			throw new Error('Client bundle does not exist');
		}
		return new TMAWalletSigner(this, provider);
	}

	get state() {
		if (!this._bundle) {
			return { registered: false, walletAddress: null } as const;
		} else {
			return { registered: true, walletAddress: this._walletAddress } as const;
		}
	}

	get walletAddress() {
		return this._walletAddress;
	}

	get isBundleExists() {
		return !!this._bundle;
	}

	async createBundle() {
		if (this._bundle) {
			throw new Error('Client bundle already exists');
		}
		this._bundle = await this.clientBundleController.createNewBundle();
		return this.state;
	}

	private async getIntermediaryKey(telegramInitData: string, clientPublicKey: Uint8Array): Promise<Uint8Array> {
		const response = await fetch(`${this.endpoint}/wallet/access`, {
			method: 'POST',
			body: JSON.stringify({
				projectPublicToken: this.projectPublicToken,
				telegramInitData,
				clientPublicKey: new SmartBuffer(clientPublicKey).toHexString(),
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const responseData = (await response.json()) as
			| {
					result: true;
					data: {
						intermediaryKey: string;
					};
			  }
			| {
					result: false;
					error: string;
			  };

		if (responseData.result) {
			const intermediaryKey = SmartBuffer.ofHexString(responseData.data.intermediaryKey).bytes;
			return intermediaryKey;
		} else {
			throw new Error(responseData.error);
		}
	}

	private async restorePrivateKey(initData: string) {
		if (!this._bundle) {
			throw new Error('Client bundle does not exist');
		}

		const intermediaryKey = await this.getIntermediaryKey(initData, this._bundle.clientPublicKey);
		const privateKey = await hmacSha256(intermediaryKey, this._bundle.clientSecretKey);

		return privateKey;
	}

	async accessPrivateKey() {
		if (!this._bundle) {
			throw new Error('Client bundle does not exist');
		}

		const privateKey = await this.restorePrivateKey(this.telegramInitData);
		return privateKey;
	}

	async initWallet() {
		if (!this._bundle) {
			throw new Error('Client bundle does not exist');
		}

		const privateKey = await this.restorePrivateKey(this.telegramInitData);

		const signingKey = new ethers.SigningKey(privateKey);
		const signer = new ethers.Wallet(signingKey);
		const walletAddress = await signer.getAddress();

		await this.walletBundleController.storeWalletAddress(this._bundle.clientPublicKey, walletAddress);
		this._walletAddress = walletAddress;

		return this.state;
	}

	async clearLocalWalletAddress() {
		await this.walletBundleController.clearWalletAddress();
		this._walletAddress = null;
		return this.state;
	}

	async destroyBundleAndLoseWalletAccessForever() {
		await this.clientBundleController.clearClientBundle();
		this._bundle = null;
		this._walletAddress = null;
		return this.state;
	}
}
