import { ethers } from 'ethers';
import EventEmitter from 'eventemitter3';
import WebApp from '@twa-dev/sdk';

import { hmacSha256 } from './utils/hmacSha256';
import { hexToUint8Array } from './utils/hexToUint8Array';
import { uint8ArrayToHex } from './utils/uint8ArrayToHex';

import { IClientBundle } from './client/ClientBundleController';
import { ClientBundleController } from './client/ClientBundleController';
import { WalletBundleController } from './client/WalletBundleController';

import { AbstractStorage } from './storage/AbstractStorage';
import { TelegramCloudStorage } from './storage/TelegramCloudStorage';

import { TMAWalletSigner } from './ethers-signer/TMAWSigner';

const MAIN_ENDPOINT = 'https://api.tmawallet.com';

export interface ITMAWClientOptions {
	storage?: AbstractStorage;
	endpoint?: string;
	telegramInitData?: string;
}

export type TMAWalletClientEvents = 'walletChanged';

export class TMAWalletClient extends EventEmitter<TMAWalletClientEvents> {
	private _bundle: IClientBundle | null = null;
	private _walletAddress: string | null = null;

	private readonly telegramInitData: string;
	private readonly storage: AbstractStorage;
	private readonly endpoint: string;
	private clientBundleController: ClientBundleController;
	private walletBundleController: WalletBundleController;

	private lastReportedWalletAddress: string | null = null;

	constructor(public readonly projectPublicToken: string, options: ITMAWClientOptions = {}) {
		super();

		this.endpoint = options.endpoint ?? MAIN_ENDPOINT;
		this.telegramInitData = options.telegramInitData || WebApp.initData;
		this.storage = options.storage ?? new TelegramCloudStorage();

		this.clientBundleController = new ClientBundleController(this.storage);
		this.walletBundleController = new WalletBundleController(this.storage);
	}

	get state() {
		if (!this._bundle) {
			return { registered: false, walletAddress: null } as const;
		} else {
			console.log('state.walletAddress: ', this._walletAddress);
			return { registered: true, walletAddress: this._walletAddress } as const;
		}
	}

	get walletAddress() {
		return this._walletAddress;
	}

	get isBundleExists() {
		return !!this._bundle;
	}

	private async _init() {
		this._bundle = await this.clientBundleController.getClientBundle();
		if (this._bundle) {
			this._walletAddress = await this.walletBundleController.getWalletAddress(this._bundle.clientPublicKey);
		} else {
			this._walletAddress = null;
		}
	}

	private async _createBundle() {
		if (this._bundle) {
			throw new Error('Client bundle already exists');
		}
		this._bundle = await this.clientBundleController.createNewBundle();
	}

	private async _initWallet() {
		if (!this._bundle) {
			throw new Error('Client bundle does not exist');
		}

		const privateKey = await this.accessPrivateKey();

		const signingKey = new ethers.SigningKey(privateKey);
		const signer = new ethers.Wallet(signingKey);
		const walletAddress = await signer.getAddress();

		await this.walletBundleController.storeWalletAddress(this._bundle.clientPublicKey, walletAddress);
		this._walletAddress = walletAddress;

		try {
			await fetch(`${this.endpoint}/wallet/address`, {
				method: 'POST',
				body: JSON.stringify({
					projectPublicToken: this.projectPublicToken,
					telegramInitData: this.telegramInitData,
					walletAddress,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} catch (error) {
			console.warn('Error reporting wallet address: ', error);
		}
	}

	private _checkStateChanged() {
		if (this.lastReportedWalletAddress !== this._walletAddress) {
			this.lastReportedWalletAddress = this._walletAddress;
			this.emit('walletChanged', this._walletAddress);
		}
	}

	async init() {
		await this._init();
		this._checkStateChanged();
		return this.state;
	}

	async createBundle() {
		await this._createBundle();
		this._checkStateChanged();
		return this.state;
	}

	async authenticate() {
		await this._init();
		if (!this._bundle) {
			await this._createBundle();
		} else {
			if (!this._walletAddress) {
				await this._initWallet();
			}
		}
		this._checkStateChanged();
		return this.state;
	}

	async initWallet() {
		await this._initWallet();
		this._checkStateChanged();
		return this.state;
	}

	async clearLocalWalletAddress() {
		await this.walletBundleController.clearWalletAddress();
		this._walletAddress = null;
		this._checkStateChanged();
		return this.state;
	}

	async destroyBundleAndLoseWalletAccessForever() {
		await this.clientBundleController.clearClientBundle();
		this._bundle = null;
		this._walletAddress = null;
		this._checkStateChanged();
		return this.state;
	}

	getEthersSigner(provider?: null | ethers.Provider) {
		if (!this._bundle) {
			throw new Error('Client bundle does not exist');
		}
		return new TMAWalletSigner(this, provider);
	}

	private async getIntermediaryKey(telegramInitData: string, clientPublicKey: Uint8Array): Promise<Uint8Array> {
		const response = await fetch(`${this.endpoint}/wallet/access`, {
			method: 'POST',
			body: JSON.stringify({
				projectPublicToken: this.projectPublicToken,
				telegramInitData,
				clientPublicKey: uint8ArrayToHex(clientPublicKey),
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
			const intermediaryKey = hexToUint8Array(responseData.data.intermediaryKey);
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
}
