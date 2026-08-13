import { env } from '$env/dynamic/private';

const GRAPH_URL = 'https://graph.facebook.com/v20.0';

export function whatsappConfigurado(): boolean {
	return Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);
}

export async function waSend(to: string, text: string): Promise<void> {
	await waPost(to, { type: 'text', text: { body: text, preview_url: false } });
}

async function waPost(to: string, payload: object): Promise<void> {
	const res = await fetch(`${GRAPH_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
		},
		body: JSON.stringify({ messaging_product: 'whatsapp', to, ...payload })
	});

	if (!res.ok) {
		const err = await res.text();
		console.error('[WhatsApp API]', res.status, err);
		throw new Error(`WhatsApp API ${res.status}`);
	}
}
