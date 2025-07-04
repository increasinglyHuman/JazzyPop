# Discord Webhook Setup for JazzyPop

## 1. Create Discord Webhook

1. Go to your Discord server
2. Right-click the channel where you want alerts
3. Select "Edit Channel" → "Integrations" → "Webhooks"
4. Click "Create Webhook"
5. Name it "JazzyPop Monitor"
6. Copy the Webhook URL

## 2. Add to .env file

Add this line to your `.env` file:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

## 3. Test the webhook

```bash
# Test from command line
curl -X POST -H "Content-Type: application/json" \
  -d '{"content":"🎮 JazzyPop webhook test!"}' \
  YOUR_WEBHOOK_URL
```

## 4. What gets monitored

The system will send Discord alerts for:

- **🔴 Service Down**: When any service stops responding
- **🟢 Service Recovered**: When a service is auto-restarted
- **🟡 Manual Intervention**: When auto-restart fails
- **📊 Daily Reports**: System health summary every 24 hours

Services monitored:
- Backend API (port 8000)
- Content Generators (4 processes)
- Redis Cache (port 6379)
- PostgreSQL Database (port 5432)
- Nginx Web Server (port 80)

## 5. Alert Examples

### Service Down Alert
```
🎮 JazzyPop - ⚠️ Service Down
JazzyPop Backend API has stopped responding!
Service: JazzyPop Backend API | Status: ❌ Down | Action: Attempting restart...
```

### Recovery Alert
```
🎮 JazzyPop - ✅ Service Recovered
JazzyPop Backend API has been successfully restarted!
Service: JazzyPop Backend API | Status: ✅ Running | Recovery: Automatic
```

### Daily Report
```
🎮 JazzyPop - 📊 Daily Status Report
System health check summary
JazzyPop Backend API: ✅ Running
Content Generators: ✅ Running
Redis Cache: ✅ Running
PostgreSQL Database: ✅ Running
Nginx Web Server: ✅ Running
```