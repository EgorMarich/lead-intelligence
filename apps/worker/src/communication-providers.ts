export type ProviderResult = { providerMessageId: string; metadata?: Record<string, unknown> };

export async function sendTelegram(recipient: string, body: string): Promise<ProviderResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN; if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ chat_id: recipient, text: body }) });
  const data: any = await res.json(); if (!res.ok || !data.ok) throw new Error(data?.description ?? `Telegram HTTP ${res.status}`);
  return { providerMessageId: String(data.result?.message_id), metadata: { provider: 'telegram' } };
}

export async function sendVk(recipient: string, body: string): Promise<ProviderResult> {
  const token = process.env.VK_ACCESS_TOKEN; const groupId = process.env.VK_GROUP_ID;
  if (!token || !groupId) throw new Error('VK_ACCESS_TOKEN/VK_GROUP_ID are not configured');
  const params = new URLSearchParams({ access_token: token, v: process.env.VK_API_VERSION ?? '5.199', peer_id: recipient, random_id: String(Math.floor(Math.random()*2_000_000_000)), message: body });
  const res = await fetch('https://api.vk.com/method/messages.send', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body: params.toString() });
  const data:any = await res.json(); if (!res.ok || data.error) throw new Error(data?.error?.error_msg ?? `VK HTTP ${res.status}`);
  return { providerMessageId: String(data.response), metadata: { provider:'vk', groupId } };
}

export async function sendWhatsApp(recipient: string, body: string): Promise<ProviderResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN; const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error('WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are not configured');
  const version = process.env.WHATSAPP_GRAPH_VERSION ?? 'v23.0';
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${token}`}, body: JSON.stringify({ messaging_product:'whatsapp', recipient_type:'individual', to:recipient, type:'text', text:{ body } }) });
  const data:any = await res.json(); if (!res.ok || data.error) throw new Error(data?.error?.message ?? `WhatsApp HTTP ${res.status}`);
  return { providerMessageId: String(data.messages?.[0]?.id ?? ''), metadata: { provider:'whatsapp', phoneNumberId } };
}
