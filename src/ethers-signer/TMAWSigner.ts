import {
	assert,
	assertArgument,
	computeAddress,
	copyRequest,
	ethers,
	getAddress,
	hashMessage,
	resolveAddress,
	resolveProperties,
	Transaction,
	TransactionLike,
	TypedDataEncoder,
} from 'ethers';

import type { TMAWalletClient } from '../TMAWallet.Client';

export class TMAWalletSigner extends ethers.AbstractSigner {
	constructor(private readonly client: TMAWalletClient, provider?: null | ethers.Provider) {
		super(provider);
	}

	async getAddress(): Promise<string> {
		const privateKey = await this.client.accessPrivateKey();
		const signingKey = new ethers.SigningKey(privateKey);
		const address = computeAddress(signingKey.publicKey);
		return address;
	}

	connect(_provider: null | ethers.Provider): TMAWalletSigner {
		return new TMAWalletSigner(this.client, _provider);
	}

	async signTransaction(tx: ethers.TransactionRequest): Promise<string> {
		const privateKey = await this.client.accessPrivateKey();
		const signingKey = new ethers.SigningKey(privateKey);
		const address = computeAddress(signingKey.publicKey);

		tx = copyRequest(tx);

		// Replace any Addressable or ENS name with an address
		const { to, from } = await resolveProperties({
			to: tx.to ? resolveAddress(tx.to, this.provider) : undefined,
			from: tx.from ? resolveAddress(tx.from, this.provider) : undefined,
		});

		if (to != null) {
			tx.to = to;
		}
		if (from != null) {
			tx.from = from;
		}

		if (tx.from != null) {
			assertArgument(
				getAddress(<string>tx.from) === address,
				'transaction from address mismatch',
				'tx.from',
				tx.from,
			);
			delete tx.from;
		}

		// Build the transaction
		const btx = Transaction.from(<TransactionLike<string>>tx);
		btx.signature = signingKey.sign(btx.unsignedHash);

		return btx.serialized;
	}

	async signMessage(message: string | Uint8Array): Promise<string> {
		const privateKey = await this.client.accessPrivateKey();
		const signingKey = new ethers.SigningKey(privateKey);
		return signingKey.sign(hashMessage(message)).serialized;
	}

	async signTypedData(
		domain: ethers.TypedDataDomain,
		types: Record<string, Array<ethers.TypedDataField>>,
		value: Record<string, any>,
	): Promise<string> {
		const privateKey = await this.client.accessPrivateKey();
		const signingKey = new ethers.SigningKey(privateKey);
		// Populate any ENS names
		const populated = await TypedDataEncoder.resolveNames(domain, types, value, async (name: string) => {
			// @TODO: this should use resolveName; addresses don't
			//        need a provider

			assert(this.provider != null, 'cannot resolve ENS names without a provider', 'UNSUPPORTED_OPERATION', {
				operation: 'resolveName',
				info: { name },
			});

			const address = await this.provider.resolveName(name);
			assert(address != null, 'unconfigured ENS name', 'UNCONFIGURED_NAME', {
				value: name,
			});

			return address;
		});

		return signingKey.sign(TypedDataEncoder.hash(populated.domain, types, populated.value)).serialized;
	}
}
