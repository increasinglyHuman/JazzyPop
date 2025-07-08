# JazzyPop Backend Admin Quick Reference

## Service Management

### Check Status
```bash
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com
sudo systemctl status jazzypop-backend
```

### Restart Backend
```bash
sudo systemctl restart jazzypop-backend
sudo systemctl enable jazzypop-backend  # Enable auto-start on boot
```

### Check Logs
```bash
sudo journalctl -u jazzypop-backend -f
```

### Verify API Health
```bash
curl -s https://p0qp0q.com/api/health | jq
```

## Related Services
- Redis: `sudo systemctl status redis`
- PostgreSQL: `sudo systemctl status postgresql`

## Note
Full admin manual archived in: `backend/archived-docs/`