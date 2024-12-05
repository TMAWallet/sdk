export const hmacSha256 = async (data: Uint8Array, key: Uint8Array): Promise<Uint8Array> => {
	const importedKey = await crypto.subtle.importKey(
		'raw', // raw format of the key - should be Uint8Array
		key,
		{
			// algorithm details
			name: 'HMAC',
			hash: { name: 'SHA-256' },
		},
		false, // export = false
		['sign', 'verify'], // what this key can do
	);
	const signature = await crypto.subtle.sign('HMAC', importedKey, data);
	return new Uint8Array(signature);
};
