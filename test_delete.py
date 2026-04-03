import models, main
from database import SessionLocal

db = SessionLocal()
# Create dummy guest
new_user = models.User(email="dummy@test.com", role="GUEST")
db.add(new_user)
db.commit()
db.refresh(new_user)

# Give them a session
sess = models.TradeSession(user_id=new_user.id, user_query="test", verdict="WAIT")
db.add(sess)
db.commit()

admin = db.query(models.User).filter_by(role="ADMIN").first()

try:
    print(main.delete_tenant(user_id=new_user.id, admin=admin, db=db))
    print("Delete succeeded!")
except Exception as e:
    import traceback
    traceback.print_exc()

db.close()
