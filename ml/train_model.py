import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


def build_dataset() -> pd.DataFrame:
  rows = [
    {"n": 80, "p": 50, "k": 40, "crop": "Wheat"},
    {"n": 85, "p": 48, "k": 42, "crop": "Wheat"},
    {"n": 72, "p": 35, "k": 34, "crop": "Rice"},
    {"n": 68, "p": 37, "k": 36, "crop": "Rice"},
    {"n": 65, "p": 45, "k": 35, "crop": "Maize"},
    {"n": 62, "p": 42, "k": 34, "crop": "Maize"},
    {"n": 46, "p": 24, "k": 25, "crop": "Millet"},
    {"n": 43, "p": 26, "k": 23, "crop": "Millet"},
    {"n": 35, "p": 45, "k": 35, "crop": "Groundnut"},
    {"n": 37, "p": 43, "k": 34, "crop": "Groundnut"},
    {"n": 55, "p": 30, "k": 60, "crop": "Cotton"},
    {"n": 58, "p": 32, "k": 62, "crop": "Cotton"},
    {"n": 40, "p": 30, "k": 30, "crop": "Pigeon Pea"},
    {"n": 42, "p": 29, "k": 31, "crop": "Pigeon Pea"},
  ]
  return pd.DataFrame(rows)


def train():
  df = build_dataset()
  X = df[["n", "p", "k"]]
  y = df["crop"]

  X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
  )

  model = RandomForestClassifier(n_estimators=120, random_state=42)
  model.fit(X_train, y_train)

  preds = model.predict(X_test)
  accuracy = accuracy_score(y_test, preds)
  print(f"Validation accuracy: {accuracy:.2f}")

  joblib.dump(model, "crop_model.pkl")
  print("Saved model -> crop_model.pkl")


if __name__ == "__main__":
  train()
