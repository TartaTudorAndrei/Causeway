import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import express from 'express';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { MessageQueue } from './queue';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3001', 10);
const INTERNAL_SECRET = process.env.WHATSAPP_INTERNAL_SECRET || 'app_internal_secret';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const AUTH_DIR = path.resolve(process.env.AUTH_DIR || './auth_info_baileys');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock: WASocket | null = null;
let currentQr: string | null = null;
let connectionStatus: 'CONNECTED' | 'PAIRING_REQUIRED' | 'DISCONNECTED' = 'DISCONNECTED';

const messageQueue = new MessageQueue(
  () => sock,
  () => connectionStatus === 'CONNECTED'
);

// Token authentication middleware for Spring Boot internal proxy
app.use((req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (token !== INTERNAL_SECRET) {
    return res.status(403).json({ error: 'Unauthorized internal call' });
  }
  next();
});

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1015901307] as [number, number, number],
      isLatest: false
    }));

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: state,
      generateHighQualityLinkPreview: false,
      browser: [process.env.WHATSAPP_CLIENT_NAME || 'Causeway', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('group-participants.update', async (update) => {
      try {
        const { id: groupJid, participants, action, author } = update;
        if (action === 'add' && Array.isArray(participants) && participants.length > 0) {
          let groupSubject = '';
          try {
            const meta = await sock?.groupMetadata(groupJid);
            groupSubject = meta?.subject || '';
          } catch {
            // ignore metadata fetch error
          }

          for (const participant of participants) {
            try {
              await fetch(`${BACKEND_URL}/api/webhooks/whatsapp/events`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Internal-Token': INTERNAL_SECRET
                },
                body: JSON.stringify({
                  eventType: 'GROUP_PARTICIPANTS_UPDATE',
                  action: 'add',
                  groupJid,
                  groupSubject,
                  participantJid: participant,
                  authorJid: author
                })
              });
            } catch (err: any) {
              console.error('Failed to notify backend of group participant join:', err?.message || err);
            }
          }
        }
      } catch (err: any) {
        console.error('Error handling group-participants.update event:', err?.message || err);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQr = await QRCode.toDataURL(qr);
        connectionStatus = 'PAIRING_REQUIRED';
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        connectionStatus = isLoggedOut ? 'PAIRING_REQUIRED' : 'DISCONNECTED';
        currentQr = null;

        if (isLoggedOut) {
          console.log('WhatsApp session logged out. Clearing stored credentials...');
          try {
            const files = fs.readdirSync(AUTH_DIR);
            for (const file of files) {
              fs.unlinkSync(path.join(AUTH_DIR, file));
            }
          } catch (e) {
            console.error('Error clearing session dir:', e);
          }
          setTimeout(connectToWhatsApp, 2000);
        } else {
          console.log(`WhatsApp disconnected (code ${statusCode}). Reconnecting in 5s...`);
          setTimeout(connectToWhatsApp, 5000);
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connection successfully opened and ready.');
        connectionStatus = 'CONNECTED';
        currentQr = null;
      }
    });
  } catch (err) {
    console.error('Error in connectToWhatsApp:', err);
    connectionStatus = 'DISCONNECTED';
    setTimeout(connectToWhatsApp, 5000);
  }
}

// REST Endpoints
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    queueLength: messageQueue.getQueueLength()
  });
});

app.get('/qr', (req, res) => {
  res.json({
    qr: currentQr,
    status: connectionStatus
  });
});

app.get('/groups', async (req, res) => {
  if (connectionStatus !== 'CONNECTED' || !sock) {
    return res.json([]);
  }
  try {
    const groups = await sock.groupFetchAllParticipating();
    const seenIds = new Set<string>();

    const groupList = Object.values(groups)
      .filter((g: any) => {
        if (!g || !g.id || !g.id.endsWith('@g.us')) return false;

        // Exclude community parent containers (which cannot receive direct chat messages)
        if ((g.isCommunity === true || g.isCommunity === 'true') && !g.isCommunityAnnounce) {
          return false;
        }

        // Prevent duplicate IDs
        if (seenIds.has(g.id)) return false;
        seenIds.add(g.id);

        return true;
      })
      .map((g: any) => ({
        id: g.id,
        subject: (g.subject || 'Grup WhatsApp').trim(),
        creation: g.creation,
        owner: g.owner,
        participantsCount: g.participants?.length || 0
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject));

    res.json(groupList);
  } catch (err: any) {
    console.error('Error fetching participating groups:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch WhatsApp groups' });
  }
});

app.post('/send-message', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Missing required parameters: to and message' });
  }

  if (connectionStatus !== 'CONNECTED') {
    return res.status(503).json({
      error: 'WhatsApp service not connected',
      status: connectionStatus
    });
  }

  try {
    const result = await messageQueue.enqueue(to, message);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch message' });
  }
});

connectToWhatsApp();

app.listen(PORT, () => {
  console.log(`WhatsApp microservice listening on port ${PORT}`);
});
