"""
JazzyPop Backend API - Development Version
This version has more permissive CORS for local development
"""
from main import *  # Import everything from main.py

# Override the app with more permissive CORS for development
app = FastAPI(
    title="JazzyPop API - Development",
    description="Backend for the JazzyPop quiz platform",
    version="1.0.0",
    lifespan=lifespan
)

# More permissive CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Copy all routes from the main app
for route in main.app.routes:
    app.routes.append(route)

if __name__ == "__main__":
    import uvicorn
    print("Starting JazzyPop API in DEVELOPMENT mode with permissive CORS...")
    print("API will be available at: http://localhost:8000")
    print("Docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)