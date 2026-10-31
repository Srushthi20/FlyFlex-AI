"""Train an XGBoost delay regressor on synthetic data for academic demonstration only."""
from pathlib import Path
import joblib, numpy as np, pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

ROOT=Path(__file__).parent
rng=np.random.default_rng(42); rows=[]
for route,base in [("BLR-DEL",18),("DEL-BLR",20),("BLR-BOM",15),("BOM-BLR",16),("BLR-HYD",13)]:
 for month in range(1,13):
  for hour in range(5,24,3):
   for dow in range(7):
    for demand in (1,2,3):
     for weather in (0,1,2):
      delay=max(0,base + (hour in range(17,22))*16 + (dow in (4,5))*8 + demand*5 + weather*18 + (month in (6,7,8,9))*10 + rng.normal(0,7))
      rows.append({"route":route,"departure_hour":hour,"day_of_week":dow,"month":month,"demand_level":demand,"weather_risk":weather,"delay_minutes":delay})
df=pd.DataFrame(rows); X=df.drop(columns="delay_minutes"); y=df.delay_minutes
cat=["route"]; num=["departure_hour","day_of_week","month","demand_level","weather_risk"]
pre=ColumnTransformer([("route",OneHotEncoder(handle_unknown="ignore"),cat),("num",StandardScaler(),num)])
model=Pipeline([("features",pre),("xgb",XGBRegressor(n_estimators=180,max_depth=5,learning_rate=.06,subsample=.9,colsample_bytree=.9,objective="reg:squarederror",random_state=42,n_jobs=4))])
Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.2,random_state=42);model.fit(Xtr,ytr);pred=model.predict(Xte)
print(f"Synthetic validation MAE: {mean_absolute_error(yte,pred):.2f} minutes")
print(f"Synthetic validation RMSE: {root_mean_squared_error(yte,pred):.2f} minutes")
joblib.dump(model,ROOT/"delay_xgboost.joblib");print("Saved delay_xgboost.joblib")
