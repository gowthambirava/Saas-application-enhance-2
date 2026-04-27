from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, projects, subscriptions, webhook, admin, user
from app.api import teams, notifications, tasks
from app.core.database import Base, engine

# Import all models so SQLAlchemy creates all tables
from app.models import user as user_model
from app.models import project, subscription, team, notification, activity
from app.models import task, task_activity, saved_filter

app = FastAPI(title="SaaS Platform API", version="3.0.0")

# ✅ Create all tables
Base.metadata.create_all(bind=engine)

# ✅ Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(subscriptions.router)
app.include_router(teams.router)
app.include_router(notifications.router)
app.include_router(tasks.router)
app.include_router(webhook.router, prefix="/stripe", tags=["Webhooks"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(user.router, prefix="/user", tags=["User"])

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "SaaS Platform API v3.0", "status": "running"}
