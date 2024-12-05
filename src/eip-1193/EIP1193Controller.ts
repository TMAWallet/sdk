import EventEmitter from 'eventemitter3';
import { ethers, JsonRpcProvider } from 'ethers';
import { Eip1193Bridge } from '@ethersproject/experimental';
import { ProviderMessage, ProviderRpcError, ProviderConnectInfo, Address } from 'eip1193-types';

import { TMAWalletClient } from '../TMAWallet.Client';

export interface EIP1193Events {
	connect: (info: ProviderConnectInfo) => void;
	disconnect: (error: ProviderRpcError) => void;
	close: (error: Error) => void;
	chainChanged: (chainId: string) => void;
	networkChanged: (networkId: string) => void;
	accountsChanged: (accounts: Address[]) => void;
	message: (message: ProviderMessage) => void;
	notification: (payload: ProviderMessage) => void;
}

export class EIP1193Controller extends EventEmitter<keyof EIP1193Events> {
	private walletAddress: string | null = null;

	constructor(private readonly client: TMAWalletClient, private readonly provider: JsonRpcProvider) {
		super();

		this.client.on('walletChanged', walletAddress => {
			if (walletAddress !== this.walletAddress) {
				this.walletAddress = walletAddress;
				this.emit('accountsChanged', walletAddress ? [walletAddress] : []);
			}
		});
	}

	// Handle RPC requests
	async handleRequest(method: string, params: any[]): Promise<any> {
		switch (method) {
			case 'eth_requestAccounts':
				return this.getAccounts();
			case 'eth_accounts':
				return this.getAccounts();
			case 'eth_chainId':
				return this.getChainId();
			case 'eth_sign':
				return this.signMessage(params[0], params[1]);
			case 'personal_sign':
				return this.signMessage(params[1], params[0]);
			case 'eth_sendTransaction':
				return this.sendTransaction(params[0]);
			default:
				// console.log('Executing bridge');
				try {
					const bridge = new Eip1193Bridge(
						this.client.getEthersSigner(this.provider) as any,
						this.provider as any,
					);
					return await bridge.request({ method, params });
				} catch (error) {
					// console.error('Error executing bridge', error);
					throw new Error(`Unsupported method: ${method}`);
				}
		}
	}

	private async getAccounts(): Promise<string[]> {
		if (this.client.isBundleExists && this.client.walletAddress) {
			return [this.client.walletAddress];
		} else {
			return [];
		}
	}

	async getChainId(): Promise<string> {
		return ethers.toBeHex((await this.provider.getNetwork()).chainId);
	}

	private async signMessage(address: string, message: string): Promise<string> {
		if (!this.client.isBundleExists || !this.client.walletAddress) throw new Error('Wallet not initialized');
		if (address.toLowerCase() !== this.client.walletAddress.toLowerCase()) {
			throw new Error('Address mismatch');
		}
		const signer = this.client.getEthersSigner(this.provider);
		return signer.signMessage(message);
	}

	private async sendTransaction(tx: any): Promise<string> {
		if (!this.client.isBundleExists || !this.client.walletAddress) throw new Error('Wallet not initialized');
		const signer = this.client.getEthersSigner(this.provider);
		const txResponse = await signer.sendTransaction(tx);
		return txResponse.hash;
	}
}
