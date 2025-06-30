# JazzyPop Deployment Status
*Last Updated: 2025-06-30*

## Production Deployment

### Live URLs
- **Production**: https://p0qp0q.com/jazzypop/
- **Local Development**: http://localhost:5500/kawaii-quiz-app/

### Server Configuration
- **Server**: AWS EC2 instance at p0qp0q.com
- **Web Server**: Apache2 with HTTPS
- **Backend**: Node.js API running on port 8000
- **Database**: Redis for session management and card storage
  - **Important**: Redis implements file locking behavior that requires special handling during deployment
- **Proxy**: Apache reverse proxy from /api to localhost:8000
- **Users**: ubuntu user added to www-data group for deployment permissions

### Deployment Structure
```
/var/www/html/jazzypop/
├── index.html              # Main entry point
├── manifest.json           # PWA configuration
├── sw.js                   # Service worker
├── src/
│   ├── components/         # JavaScript components
│   ├── styles/            # CSS files
│   ├── scripts/           # Utility scripts
│   └── images/            # Optimized SVG images
└── backend/               # Backend API (separate)
```

## PWA Configuration

### Manifest Settings
- **Name**: JazzyPop Quiz
- **Theme Color**: #131f24 (dark theme)
- **Display**: Standalone
- **Start URL**: /jazzypop/
- **Icons**: P0qP0q SVG for all sizes

### Service Worker Features
- **Offline Support**: Basic caching implemented
- **Push Notifications**: Infrastructure ready, not yet active
- **Background Sync**: Configured for notification syncing

## Recent Changes (2025-06-30)

### Deployment Fixes
1. **Path Migration**: Changed all absolute paths to relative
2. **HTTPS Migration**: Updated all API calls from HTTP to HTTPS
3. **Apache Proxy**: Configured reverse proxy for backend API
4. **SVG Optimization**: Reduced image sizes by 95% using svgo

### Code Fixes
1. **Bot Images**: Fixed missing images on settings page
2. **Answer Timing**: Added 1.2s delay for feedback visibility
3. **CSS Specificity**: Fixed red background issue in normal mode

### File Structure Changes
- Renamed `dashboard-clean.html` to `index.html`
- Added PWA support files (manifest.json, sw.js)
- Organized components into proper directory structure

## Known Issues

### To Be Fixed
1. **System Alerts**: 4 instances need modal replacement
2. **Google Sign-In**: Integration started but not functional
3. **Push Notifications**: Infrastructure ready but not configured

### Performance Notes
- SVG images optimized from ~1MB to ~50KB each
- All assets loading via relative paths for CDN compatibility
- Service worker enables offline play for cached content

## Deployment Commands

### SSH Access
```bash
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com
```

### Sync Local to Production (Primary Method)
We use rsync for all file transfers to maintain consistency and handle permissions properly:

```bash
# Standard rsync deployment
rsync -avz --exclude='.git' --exclude='node_modules' \
  /home/p0qp0q/Documents/Merlin/JazzyPop/ \
  -e "ssh -i ~/.ssh/poqpoq2025.pem" \
  ubuntu@p0qp0q.com:/var/www/html/jazzypop/

# If permission issues occur, run on server:
sudo chown -R www-data:www-data /var/www/html/jazzypop/
sudo chmod -R 755 /var/www/html/jazzypop/
```

### User Permissions (Added 2025-06-30)
The ubuntu user was added to the www-data group to facilitate deployments:
```bash
sudo usermod -a -G www-data ubuntu
# Logout and login required for group changes to take effect
```

### Backend Service
```bash
# Check status
sudo systemctl status jazzypop-backend

# Restart if needed (handles Redis file locking properly)
sudo systemctl restart jazzypop-backend

# View logs
sudo journalctl -u jazzypop-backend -f
```

### Apache Configuration (Updated 2025-06-30)
Apache was configured to handle cross-domain issues and proxy API requests:

```apache
# Added to /etc/apache2/sites-available/000-default-le-ssl.conf
# Proxy for JazzyPop API
ProxyPass /api http://localhost:8000/api
ProxyPassReverse /api http://localhost:8000/api
ProxyPreserveHost On

# CORS headers handled by backend
# No direct access to port 8000 from outside
```

### Redis File Locking Considerations
Redis implements file locking that can cause issues during deployment:
- Always stop the backend service before major updates
- Use the systemctl commands to properly manage service lifecycle
- The backend handles Redis connections and cleanup on shutdown

## Security Notes
- HTTPS enforced via Let's Encrypt certificate
- API access proxied through Apache (no direct port exposure)
- CORS configured for production domain only
- File permissions set to www-data:www-data