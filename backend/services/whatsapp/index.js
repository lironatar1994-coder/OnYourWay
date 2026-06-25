import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, 'auth');
const RECONNECT_DELAY_MS = Number(process.env.WHATSAPP_RECONNECT_DELAY_MS || 5000);

const logger = pino({
  level: process.env.WHATSAPP_LOG_LEVEL || 'info',
});

let socket;
let isStarting = false;
let reconnectTimer;

function getDisconnectStatusCode(lastDisconnect) {
  return lastDisconnect?.error?.output?.statusCode;
}

function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    startWhatsAppService().catch((error) => {
      console.error('[whatsapp] Reconnect failed:', error);
      scheduleReconnect();
    });
  }, RECONNECT_DELAY_MS);
}

export async function startWhatsAppService() {
  if (isStarting) {
    return socket;
  }

  isStarting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    socket = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      logger,
      markOnlineOnConnect: false,
      version,
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('[whatsapp] QR code received. Scan it from WhatsApp > Linked devices.');
        try {
          const terminalQr = await QRCode.toString(qr, {
            small: true,
            type: 'terminal',
          });
          console.log(terminalQr);
        } catch (error) {
          console.error('[whatsapp] Failed to render QR code:', error);
        }
      }

      if (connection === 'open') {
        console.log('[whatsapp] Connected.');
      }

      if (connection === 'close') {
        socket = undefined;

        const statusCode = getDisconnectStatusCode(lastDisconnect);
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(
          `[whatsapp] Connection closed. status=${statusCode || 'unknown'} reconnect=${shouldReconnect}`,
        );

        if (shouldReconnect) {
          scheduleReconnect();
        } else {
          console.log('[whatsapp] Logged out. Delete auth state and restart to pair again.');
        }
      }
    });

    console.log('[whatsapp] Service initialized.');
    return socket;
  } finally {
    isStarting = false;
  }
}

function toWhatsAppJid(provider) {
  if (provider.whatsappJid) {
    return provider.whatsappJid;
  }

  const digits = provider.phoneNumber?.replace(/\D/g, '');
  return digits ? `${digits}@s.whatsapp.net` : undefined;
}

export async function notifyProviderOfLead(provider, lead) {
  const jid = toWhatsAppJid(provider);

  if (!jid) {
    const error = 'Provider has no WhatsApp destination.';
    console.warn(`[whatsapp] ${error} provider=${provider.id}`);
    return {
      error,
      status: 'SKIPPED',
    };
  }

  if (!socket?.user) {
    const error = 'WhatsApp socket is not connected.';
    console.warn(`[whatsapp] ${error} Skipping lead ${lead.id} notification.`);
    return {
      error,
      status: 'SKIPPED',
    };
  }

  await socket.sendMessage(jid, {
    text: [
      'New On The Way lead',
      `Name: ${lead.fullName}`,
      `Phone: ${lead.phoneNumber}`,
      `Service: ${lead.serviceType}`,
      lead.requestText ? `Request: ${lead.requestText}` : undefined,
      lead.city ? `City: ${lead.city}` : undefined,
      lead.notes ? `Notes: ${lead.notes}` : undefined,
    ]
      .filter(Boolean)
      .join('\n'),
  });

  console.log(`[whatsapp] Sent lead ${lead.id} to provider ${provider.id}.`);

  return {
    error: null,
    status: 'SENT',
  };
}
