# Backend Deployment Notes

## Virtual Environment Setup

The backend requires a Python virtual environment to run properly on Ubuntu 24.04.

### Creating/Recreating the venv:
```bash
cd /home/ubuntu/jazzypop-backend
rm -rf venv  # Remove old venv if exists
python3 -m venv venv
./venv/bin/pip install fastapi uvicorn asyncpg python-dotenv aiofiles cors websockets
```

### Service Configuration
The systemd services expect the venv to be at:
- `/home/ubuntu/jazzypop-backend/venv/`

Services using the venv:
- `jazzypop-api.service` - Main API server
- `jazzypop-backend.service` - Backend processes
- `jazzypop-generators.service` - Content generators

### Common Issues
1. **Service fails with status=203/EXEC**: Virtual environment missing or wrong path
2. **ModuleNotFoundError**: Dependencies not installed in venv
3. **Permission denied**: venv needs to be owned by ubuntu user

### Checking Service Status
```bash
sudo systemctl status jazzypop-api
sudo systemctl status jazzypop-backend
sudo systemctl status jazzypop-generators
```

### Restarting Services After Code Changes
```bash
sudo systemctl restart jazzypop-api
sudo systemctl restart jazzypop-backend
sudo systemctl restart jazzypop-generators
```

### Viewing Logs
```bash
sudo journalctl -u jazzypop-api -f  # Follow API logs
sudo journalctl -u jazzypop-backend -f  # Follow backend logs
```

## API Health Check
```bash
curl http://localhost:8000/api/health
```

## Economy Endpoints
- `GET /api/economy/state` - Get current economy state
- `POST /api/economy/process-result` - Process game results and calculate rewards