from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, SessionLocal
from app import models
from app.routers import auth, software, admin, categories, ratings, favorites

models.Base.metadata.create_all(bind=engine)

# Seed categories
db = SessionLocal()
if db.query(models.Category).count() == 0:
    db.add_all([
        models.Category(name="Development Tools", slug="dev-tools"),
        models.Category(name="Games", slug="games"),
        models.Category(name="Utilities", slug="utilities"),
        models.Category(name="Productivity", slug="productivity"),
        models.Category(name="Graphics & Design", slug="graphics-design"),
    ])
    db.commit()
    print("Categories seeded")
db.close()

app = FastAPI(title="Software Distribution API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(software.router)
app.include_router(admin.router)
app.include_router(categories.router)
app.include_router(ratings.router)
app.include_router(favorites.router)


@app.get("/")
def root():
    return {"message": "Software Distribution API", "status": "running", "docs": "/docs"}