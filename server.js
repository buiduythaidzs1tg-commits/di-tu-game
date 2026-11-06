// Server: nhận sự kiện từ TikTok Live -> gửi cho trang game qua WebSocket
// Dùng trên máy tính:  node server.js [username]
// Dùng trên cloud/điện thoại: mở  https://<domain>/?user=<username_tiktok>
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');

const DEFAULT_USER = (process.argv[2] || process.env.TIKTOK_USER || '').replace('@', '').trim();
const PORT = process.env.PORT || 3000;
const MAX_ROOMS = 20; // giới hạn số phòng live cùng lúc

// ---- HTTP: phục vụ index.html ----
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/health')) { res.writeHead(200); return res.end('ok'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
});

// ---- Mỗi username TikTok = 1 phòng, nhiều thiết bị cùng xem được ----
const rooms = new Map(); // user -> { conn, clients:Set, timer }

function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  room.clients.forEach((c) => c.readyState === 1 && c.send(data));
}

function openRoom(user) {
  const room = { clients: new Set(), conn: null, retry: null, closed: false };
  const conn = new WebcastPushConnection(user);
  room.conn = conn;

  const connect = () => {
    if (room.closed) return;
    conn
      .connect()
      .then((s) => {
        console.log(`[@${user}] đã kết nối (roomId ${s.roomId})`);
        broadcast(room, { type: 'status', ok: true, text: `Đã kết nối live @${user}` });
      })
      .catch((err) => {
        const msg = (err && err.message) || String(err);
        console.log(`[@${user}] lỗi kết nối: ${msg}`);
        broadcast(room, { type: 'status', ok: false, text: 'Chưa kết nối được (cần đang live). Đang thử lại...' });
        room.retry = setTimeout(connect, 10000);
      });
  };

  conn.on('disconnected', () => { room.retry = setTimeout(connect, 5000); });
  conn.on('chat', (d) => broadcast(room, { type: 'chat', user: d.nickname || d.uniqueId, text: d.comment }));
  conn.on('like', (d) => broadcast(room, { type: 'like', user: d.nickname || d.uniqueId, count: d.likeCount || 1 }));
  conn.on('follow', (d) => broadcast(room, { type: 'follow', user: d.nickname || d.uniqueId }));
  conn.on('gift', (d) => {
    if (d.giftType === 1 && !d.repeatEnd) return; // chỉ tính khi hết chuỗi quà
    broadcast(room, {
      type: 'gift',
      user: d.nickname || d.uniqueId,
      giftName: d.giftName,
      diamonds: (d.diamondCount || 1) * (d.repeatCount || 1),
      repeat: d.repeatCount || 1,
    });
  });

  connect();
  return room;
}

function closeRoomIfEmpty(user) {
  const room = rooms.get(user);
  if (!room || room.clients.size > 0) return;
  room.closed = true;
  clearTimeout(room.retry);
  try { room.conn.disconnect(); } catch (e) {}
  rooms.delete(user);
  console.log(`[@${user}] đóng phòng (không còn ai xem)`);
}

// ---- WebSocket ----
const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  const user = (url.searchParams.get('user') || DEFAULT_USER).replace('@', '').trim().toLowerCase();

  if (!user || !/^[a-z0-9._]{2,32}$/.test(user)) {
    ws.send(JSON.stringify({ type: 'status', ok: false, text: 'Chế độ TEST: chưa có username (thêm ?user=ten_tiktok vào link)' }));
    return;
  }

  let room = rooms.get(user);
  if (!room) {
    if (rooms.size >= MAX_ROOMS) {
      ws.send(JSON.stringify({ type: 'status', ok: false, text: 'Server đang quá tải, thử lại sau.' }));
      return;
    }
    room = openRoom(user);
    rooms.set(user, room);
  }
  room.clients.add(ws);
  ws.on('close', () => { room.clients.delete(ws); setTimeout(() => closeRoomIfEmpty(user), 30000); });
  ws.on('error', () => {});
});

server.listen(PORT, () => {
  console.log(`Game chạy tại cổng ${PORT}`);
  console.log(DEFAULT_USER ? `Username mặc định: @${DEFAULT_USER}` : 'Mở link kèm ?user=<username_tiktok> để kết nối live.');
});
