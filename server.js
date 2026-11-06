const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');

const PORT = process.env.PORT || 3000;
const DEFAULT_USER = (process.argv[2] || process.env.TIKTOK_USER || '').replace('@', '').trim();
const FILES = { '/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css', '/style2.css': 'style2.css', '/game1.js': 'game1.js', '/game2.js': 'game2.js' };
const TYPES = { html: 'text/html', css: 'text/css', js: 'application/javascript' };

const server = http.createServer((req, res) => {
  const p = req.url.split('?')[0];
  if (p === '/health') { res.writeHead(200); return res.end('ok'); }
  const f = FILES[p];
  if (!f) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] + '; charset=utf-8' });
  fs.createReadStream(path.join(__dirname, f)).pipe(res);
});

const rooms = new Map();
const send = (room, msg) => {
  const data = JSON.stringify(msg);
  room.clients.forEach((c) => c.readyState === 1 && c.send(data));
};

function openRoom(user) {
  const room = { clients: new Set(), conn: new WebcastPushConnection(user), retry: null, closed: false };
  const c = room.conn;
  const connect = () => {
    if (room.closed) return;
    c.connect()
      .then(() => send(room, { type: 'status', ok: true, text: 'Đã kết nối live @' + user }))
      .catch((e) => {
        console.log('[@' + user + '] lỗi:', (e && e.message) || e);
        send(room, { type: 'status', ok: false, text: 'Chưa kết nối được (cần đang live). Đang thử lại...' });
        room.retry = setTimeout(connect, 10000);
      });
  };
  const name = (d) => d.nickname || d.uniqueId;
  c.on('disconnected', () => { room.retry = setTimeout(connect, 5000); });
  c.on('chat', (d) => send(room, { type: 'chat', user: name(d), text: d.comment }));
  c.on('like', (d) => send(room, { type: 'like', user: name(d), count: d.likeCount || 1 }));
  c.on('follow', (d) => send(room, { type: 'follow', user: name(d) }));
  c.on('gift', (d) => {
    if (d.giftType === 1 && !d.repeatEnd) return;
    send(room, { type: 'gift', user: name(d), giftName: d.giftName, diamonds: (d.diamondCount || 1) * (d.repeatCount || 1) });
  });
  connect();
  return room;
}

function closeIfEmpty(user) {
  const room = rooms.get(user);
  if (!room || room.clients.size > 0) return;
  room.closed = true;
  clearTimeout(room.retry);
  try { room.conn.disconnect(); } catch (e) {}
  rooms.delete(user);
}

const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const q = new URL(req.url, 'http://x').searchParams.get('user');
  const user = (q || DEFAULT_USER).replace('@', '').trim().toLowerCase();
  if (!/^[a-z0-9._]{2,32}$/.test(user)) {
    ws.send(JSON.stringify({ type: 'status', ok: false, text: 'Chế độ TEST (thêm ?user=ten_tiktok vào link)' }));
    return;
  }
  let room = rooms.get(user);
  if (!room) {
    if (rooms.size >= 20) return ws.send(JSON.stringify({ type: 'status', ok: false, text: 'Server quá tải' }));
    room = openRoom(user);
    rooms.set(user, room);
  }
  room.clients.add(ws);
  ws.on('close', () => { room.clients.delete(ws); setTimeout(() => closeIfEmpty(user), 30000); });
  ws.on('error', () => {});
});

server.listen(PORT, () => console.log('Game chạy tại cổng ' + PORT));
