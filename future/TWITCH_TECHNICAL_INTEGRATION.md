# Twitch Technical Integration Guide for JazzyPop

## Overview
This document outlines the technical requirements and implementation details for integrating JazzyPop with Twitch streaming platform.

## Integration Methods

### 1. Browser Source Overlay (Recommended - Universal)
**Works on ALL streaming platforms, not just Twitch**

#### How It Works
```
Streamer → OBS/Streamlabs → Add Browser Source → JazzyPop URL → Stream
```

#### Implementation Requirements
- **Frontend**: HTML/CSS/JS overlay page
- **Backend**: WebSocket server for real-time updates
- **Authentication**: Streaming key system
- **CDN**: For global low-latency delivery

#### Technical Stack
```javascript
// Overlay URL structure
https://jazzypop.com/overlay?key={STREAM_KEY}&position=bottom-right&theme=dark

// WebSocket connection
const ws = new WebSocket('wss://jazzypop.com/ws/stream/{STREAM_KEY}');
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'quiz_start') showQuiz(data);
  if (type === 'viewer_answer') updateResults(data);
};
```

#### Pros
- Works everywhere (Twitch, YouTube, Facebook, etc.)
- No platform approval needed
- Full control over UI/UX
- Easy to implement and maintain

#### Cons
- Requires streamer to manually add browser source
- No deep Twitch integration features

### 2. Twitch Extension (Platform-Specific)

#### Types of Extensions
1. **Panel Extension** - Below video player
2. **Overlay Extension** - On top of video
3. **Component Extension** - Part of the video

#### Requirements
- **Hosting**: HTTPS required, CSP compliant
- **Authentication**: Twitch JWT tokens
- **Review Process**: 1-2 weeks approval time
- **Restrictions**: Limited external API calls

#### Implementation Flow
```javascript
// Extension Helper initialization
window.Twitch.ext.onAuthorized((auth) => {
  // auth.token - JWT token
  // auth.channelId - Broadcaster channel ID
  // auth.userId - Viewer's user ID
  
  // Verify JWT on backend
  fetch('https://api.jazzypop.com/twitch/verify', {
    headers: { 'Authorization': `Bearer ${auth.token}` }
  });
});

// Listen for broadcaster config
window.Twitch.ext.configuration.onChanged(() => {
  const config = window.Twitch.ext.configuration.broadcaster;
  // Update quiz settings based on broadcaster preferences
});
```

### 3. Twitch Chat Bot Integration

#### IRC Connection
```javascript
// Connect to Twitch IRC
const tmi = require('tmi.js');
const client = new tmi.Client({
  identity: {
    username: 'JazzyPopBot',
    password: 'oauth:YOUR_OAUTH_TOKEN'
  },
  channels: ['shroud', 'pokimane', 'xqc']
});

client.on('message', (channel, tags, message, self) => {
  if (message.startsWith('!quiz')) {
    // Trigger quiz in overlay
    streamingSockets[channel].emit('start_quiz');
  }
  
  if (message.match(/^[A-D]$/i) && activeQuiz[channel]) {
    // Record answer
    recordAnswer(channel, tags.username, message);
  }
});
```

## Authentication & Authorization

### 1. Twitch OAuth Flow
```javascript
// Step 1: Redirect to Twitch
const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
  `client_id=${TWITCH_CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `response_type=code&` +
  `scope=channel:read:subscriptions user:read:email`;

// Step 2: Handle callback
app.get('/auth/twitch/callback', async (req, res) => {
  const { code } = req.query;
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    })
  });
  
  const { access_token } = await tokenResponse.json();
  // Store token, create streaming key
});
```

### 2. Streaming Key System
```javascript
// Generate unique streaming key for each broadcaster
function generateStreamingKey(userId, channelId) {
  return crypto
    .createHash('sha256')
    .update(`${userId}-${channelId}-${SECRET_SALT}`)
    .digest('hex')
    .substring(0, 32);
}

// Validate streaming key
async function validateStreamingKey(key) {
  const stream = await db.query(
    'SELECT * FROM streaming_keys WHERE key = $1 AND active = true',
    [key]
  );
  return stream.rows[0];
}
```

## Real-Time Communication

### WebSocket Architecture
```javascript
// Server setup
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Channel rooms
const channels = new Map();

wss.on('connection', (ws, req) => {
  const streamKey = req.url.split('/').pop();
  const channel = validateStreamingKey(streamKey);
  
  if (!channel) {
    ws.close(1008, 'Invalid stream key');
    return;
  }
  
  // Add to channel room
  if (!channels.has(channel.id)) {
    channels.set(channel.id, new Set());
  }
  channels.get(channel.id).add(ws);
  
  ws.on('close', () => {
    channels.get(channel.id).delete(ws);
  });
});

// Broadcast to channel
function broadcastToChannel(channelId, message) {
  const sockets = channels.get(channelId);
  if (sockets) {
    sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}
```

## Twitch API Integration

### Key Endpoints Needed
```javascript
// Get stream info
GET https://api.twitch.tv/helix/streams?user_id={broadcaster_id}

// Get channel info
GET https://api.twitch.tv/helix/channels?broadcaster_id={broadcaster_id}

// Get subscribers (requires auth)
GET https://api.twitch.tv/helix/subscriptions?broadcaster_id={broadcaster_id}

// EventSub for real-time events
POST https://api.twitch.tv/helix/eventsub/subscriptions
{
  "type": "stream.online",
  "version": "1",
  "condition": {
    "broadcaster_user_id": "12345"
  },
  "transport": {
    "method": "webhook",
    "callback": "https://api.jazzypop.com/webhooks/twitch",
    "secret": "s3cr3t"
  }
}
```

## Content Delivery Considerations

### Performance Requirements
- **Latency**: <100ms overlay updates
- **Throughput**: Handle 10k+ concurrent viewers
- **Reliability**: 99.9% uptime during streams

### CDN Strategy
```nginx
# Nginx config for overlay static assets
location /overlay/ {
  expires 1m;
  add_header Cache-Control "public, immutable";
  add_header X-Content-Type-Options "nosniff";
  add_header X-Frame-Options "ALLOWALL"; # Allow embedding
}
```

### CORS Configuration
```javascript
// Allow embedding in OBS/Streamlabs
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
```

## Security Considerations

### 1. Rate Limiting
```javascript
const rateLimit = {
  perChannel: {
    quizzes: { max: 10, window: 3600 }, // 10 per hour
    answers: { max: 1000, window: 60 }   // 1000 per minute
  },
  perViewer: {
    answers: { max: 1, window: 10 }      // 1 per 10 seconds
  }
};
```

### 2. Anti-Abuse Measures
- Validate all viewer inputs
- Implement cooldowns between quizzes
- Monitor for suspicious patterns
- Channel-specific blacklists

### 3. Content Security
```javascript
// CSP headers for extension
const cspHeader = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://extension-files.twitch.tv",
    "connect-src 'self' https://api.jazzypop.com wss://ws.jazzypop.com",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'"
  ].join('; ')
};
```

## Implementation Roadmap

### Phase 1: Browser Source MVP (2-3 weeks)
1. Build overlay HTML/CSS/JS
2. Implement WebSocket server
3. Create streamer dashboard
4. Add basic quiz delivery
5. Test with friendly streamers

### Phase 2: Enhanced Features (2-3 weeks)
1. Chat command integration
2. Real-time leaderboards
3. Stream analytics
4. Custom themes
5. Subscriber-only modes

### Phase 3: Twitch Extension (4-6 weeks)
1. Build extension frontend
2. Implement Twitch auth
3. Submit for review
4. Handle feedback/revisions
5. Launch publicly

### Phase 4: Advanced Integration (Ongoing)
1. Channel point rewards
2. Bits integration
3. Prediction API
4. Hype Train triggers
5. Raid notifications

## Testing Strategy

### Local Development
```bash
# Simulate OBS browser source
chromium --app="http://localhost:3000/overlay?key=test&width=400&height=300"

# Test WebSocket connections
wscat -c ws://localhost:8080/stream/test
```

### Load Testing
```javascript
// Simulate 1000 concurrent viewers
const viewers = [];
for (let i = 0; i < 1000; i++) {
  const ws = new WebSocket('ws://localhost:8080/stream/test');
  ws.on('open', () => {
    // Simulate answering
    setInterval(() => {
      ws.send(JSON.stringify({
        type: 'answer',
        answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
      }));
    }, 5000);
  });
  viewers.push(ws);
}
```

## Monetization Integration

### Twitch-Specific Features
1. **Bits for Power-ups**: Viewers use bits for hints
2. **Sub-Only Quizzes**: Exclusive content for subscribers
3. **Channel Points**: Redeem for quiz requests
4. **Gifted Subs**: Trigger special quiz events

## Analytics & Metrics

### Key Metrics to Track
```javascript
const streamMetrics = {
  channelId: 'twitch_123456',
  streamSession: {
    startTime: Date.now(),
    quizzesServed: 0,
    uniqueParticipants: new Set(),
    totalAnswers: 0,
    averageResponseTime: 0,
    peakConcurrentViewers: 0
  },
  quizMetrics: {
    startedCount: 0,
    completedCount: 0,
    abandonRate: 0,
    correctAnswerRate: 0
  }
};
```

## Common Pitfalls & Solutions

### 1. Stream Delay
- **Problem**: 5-15 second delay between streamer and viewers
- **Solution**: Add countdown timers, extend answer windows

### 2. Chat Spam
- **Problem**: Answers flood chat during quiz
- **Solution**: Dedicated answer collection, ignore chat during quiz

### 3. Mobile Viewers
- **Problem**: Extensions don't work on mobile
- **Solution**: Provide QR code for mobile web participation

### 4. International Audiences
- **Problem**: Different languages, time zones
- **Solution**: Multi-language support, regional quiz content

## Resources & Documentation

### Official Twitch Docs
- [Extensions Documentation](https://dev.twitch.tv/docs/extensions)
- [API Reference](https://dev.twitch.tv/docs/api)
- [EventSub Guide](https://dev.twitch.tv/docs/eventsub)
- [Embedding Guide](https://dev.twitch.tv/docs/embed)

### Useful Libraries
- `tmi.js` - Twitch chat client
- `twitch-js` - Twitch API wrapper
- `obs-websocket-js` - OBS control

### Testing Tools
- [Twitch Extension Rig](https://dev.twitch.tv/docs/extensions/rig)
- [Stream Delay Simulator](https://github.com/example/delay-sim)

---

###### *Remember: Start with browser source overlay for fastest time-to-market and broadest compatibility. Add Twitch-specific features as you grow.*