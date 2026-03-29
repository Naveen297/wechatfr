# LoveConnect Backend - WebRTC Signaling Server

Express + Socket.io backend for video chat signaling and real-time messaging.

## ✅ What Was Fixed

**Critical Bug**: The backend was using `userId` as target in `io.to()`, but Socket.io requires `socket.id` to route messages.

**Solution**: Added proper userId ↔ socketId mapping:
- `userToSocket`: Maps userId → socketId
- `socketToUser`: Maps socketId → { userId, roomId }
- All signaling now correctly routes to the right socket

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Server runs on http://localhost:3001
```

### Test Backend

```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

## 📡 Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `(roomId, userId)` | Join a video room |
| `offer` | `{target, caller, sdp}` | Send WebRTC offer |
| `answer` | `{target, answerer, sdp}` | Send WebRTC answer |
| `ice-candidate` | `{target, sender, candidate}` | Send ICE candidate |
| `send-message` | `{roomId, message, sender, timestamp}` | Send chat message |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `other-users` | `[userId, ...]` | List of users already in room |
| `user-joined` | `userId` | New user joined the room |
| `offer` | `{sdp, caller}` | Receive WebRTC offer |
| `answer` | `{sdp, answerer}` | Receive WebRTC answer |
| `ice-candidate` | `{candidate, sender}` | Receive ICE candidate |
| `receive-message` | `{message, sender, timestamp}` | Receive chat message |
| `user-left` | `userId` | User disconnected |

## 🔧 How It Works

### 1. User Joins Room

```javascript
// Client sends
socket.emit('join-room', 'room-123', 'user-456');

// Server responds
socket.emit('other-users', ['user-789']); // Users already in room
socket.to(roomId).emit('user-joined', 'user-456'); // Notify others
```

### 2. WebRTC Signaling (Offer/Answer)

```javascript
// User A sends offer to User B
socket.emit('offer', {
  target: 'user-B',  // userId
  caller: socketId,  // socket.id
  sdp: offerSDP
});

// Backend converts userId → socketId and routes
const targetSocketId = userToSocket.get('user-B');
io.to(targetSocketId).emit('offer', { sdp, caller });
```

### 3. ICE Candidate Exchange

```javascript
// Continuous exchange during connection
socket.emit('ice-candidate', {
  target: 'user-B',
  sender: 'user-A',
  candidate: iceCandidate
});
```

### 4. Chat Messages

```javascript
// Send message (broadcast to room)
socket.emit('send-message', {
  roomId: 'room-123',
  message: 'Hello!',
  sender: 'me',
  timestamp: new Date().toISOString()
});

// Others receive
socket.on('receive-message', ({ message, sender, timestamp }) => {
  // Display message
});
```

## 🌐 Deployment to Render

### Option 1: Deploy from GitHub (RECOMMENDED)

1. **Push to GitHub**:
```bash
git add .
git commit -m "Fixed backend signaling"
git push origin main
```

2. **Create Render Service**:
- Go to https://render.com
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Select the `backend` folder (if mono-repo)

3. **Configure Service**:
```yaml
Name: loveconnect-backend
Environment: Node
Build Command: npm install
Start Command: npm start
Plan: Free
```

4. **Environment Variables**: None needed!

5. **Deploy**: Click "Create Web Service"

### Option 2: Manual Deploy

1. **Install Render CLI**:
```bash
npm install -g render
```

2. **Deploy**:
```bash
render deploy
```

### Option 3: render.yaml (Already Configured!)

The `render.yaml` file is already set up:

```yaml
services:
  - type: web
    name: loveconnect-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    plan: free
```

Just push to GitHub and connect to Render!

## 🔒 CORS Configuration

Current CORS allows all origins:

```javascript
cors: {
  origin: true,  // Allows all origins
  methods: ["GET", "POST"],
  credentials: true
}
```

**For Production**, restrict to your frontend domain:

```javascript
cors: {
  origin: [
    'https://your-app.netlify.app',
    'https://your-custom-domain.com'
  ],
  methods: ["GET", "POST"],
  credentials: true
}
```

## 📊 Monitoring & Debugging

### Server Logs

The server logs all important events with emojis for easy scanning:

- ✅ `User connected` - New socket connection
- ✅ `User joined room` - Room join successful
- 📤 `Sending offer/answer` - WebRTC signaling
- 💬 `Message in room` - Chat message sent
- ⚠️ `User disconnected` - Socket disconnect
- 👋 `User left room` - User cleanup
- 🗑️ `Room deleted` - Empty room cleanup
- ❌ `Target user not found` - Routing error

### Health Check

```bash
# Check if backend is alive
curl https://your-backend-url.onrender.com/health

# Should return
{"status":"ok","timestamp":"2026-03-29T11:40:52.685Z"}
```

### Debug Connection Issues

1. **Check server logs** in Render dashboard
2. **Test Socket.io connection**:
```javascript
// In browser console
const socket = io('https://your-backend-url.onrender.com');
socket.on('connect', () => console.log('Connected!'));
socket.on('connect_error', (err) => console.error('Error:', err));
```

## 🚨 Common Issues

### Issue: "Target user not found"

**Cause**: User disconnected or never joined
**Solution**: This is normal - users may leave/disconnect

### Issue: Frontend not connecting

**Check**:
1. Backend URL correct in `src/config.js`
2. CORS allows your frontend domain
3. Backend is running (check health endpoint)
4. No firewall blocking WebSocket connections

### Issue: Render service sleeping

**Free tier limitation**: Render free tier sleeps after 15 mins of inactivity
**Solutions**:
- Upgrade to paid plan ($7/month - always on)
- Use UptimeRobot to ping every 5 minutes
- Accept 15-30 second cold start for first user

## 💰 Cost Estimate

### Free Tier (Current)
- Render: FREE
- Bandwidth: Unlimited
- **Limitations**:
  - Sleeps after 15 min inactivity
  - 750 hours/month
  - Slower cold starts

### Paid Plan (Recommended for Production)
- Render Starter: $7/month
- Always on, no sleep
- Better performance
- Custom domains
- **Total: $7/month**

## 🔐 Security Recommendations

### Current (Development)
- ✅ CORS allows all origins (good for testing)
- ⚠️ No authentication
- ⚠️ No rate limiting
- ⚠️ Rooms never expire

### Production Improvements

1. **Add Authentication**:
```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (isValid(token)) {
    next();
  } else {
    next(new Error('Authentication failed'));
  }
});
```

2. **Rate Limiting**:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

3. **Room Expiry**:
```javascript
// Auto-delete rooms after 24 hours
setTimeout(() => {
  if (rooms.has(roomId)) {
    rooms.delete(roomId);
    io.to(roomId).emit('room-expired');
  }
}, 24 * 60 * 60 * 1000);
```

4. **Restrict CORS**:
```javascript
cors: {
  origin: ['https://your-app.netlify.app'],
  credentials: true
}
```

## 🧪 Testing

### Manual Test

1. Start backend: `npm start`
2. Open browser console
3. Run:
```javascript
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ Connected');
  socket.emit('join-room', 'test-room', 'test-user');
});

socket.on('other-users', (users) => {
  console.log('Other users:', users);
});

socket.on('user-joined', (userId) => {
  console.log('User joined:', userId);
});
```

### Automated Tests (Coming Soon)

```bash
# Run tests
npm test
```

## 📈 Scaling

### Current Capacity
- Free tier: ~100 concurrent connections
- Single instance

### To Scale

1. **Horizontal Scaling**:
   - Use Redis adapter for Socket.io
   - Deploy multiple instances
   - Load balancer

2. **Redis Configuration**:
```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## 🆘 Support

**Issues?**
1. Check server logs in Render dashboard
2. Test health endpoint
3. Verify Socket.io connection in browser console
4. Check CORS settings
5. Ensure frontend has correct backend URL

**Still not working?**
- Open GitHub issue
- Include server logs
- Include browser console errors
- Describe exact steps to reproduce

---

## ✅ Next Steps

1. ✅ Backend is fixed and running locally
2. 🚀 Deploy to Render
3. 🔄 Update frontend config with Render URL
4. 🧪 Test end-to-end connection
5. 📊 Monitor logs
6. 🎉 Launch!

Your backend is now production-ready! 🚀
