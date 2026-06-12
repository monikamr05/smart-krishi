import argparse
import joblib


def main():
  parser = argparse.ArgumentParser()
  parser.add_argument("--n", type=float, required=True)
  parser.add_argument("--p", type=float, required=True)
  parser.add_argument("--k", type=float, required=True)
  args = parser.parse_args()

  model = joblib.load("crop_model.pkl")
  prediction = model.predict([[args.n, args.p, args.k]])[0]
  probabilities = model.predict_proba([[args.n, args.p, args.k]])[0]
  classes = model.classes_

  ranked = sorted(zip(classes, probabilities), key=lambda x: x[1], reverse=True)[:3]
  print(f"Predicted crop: {prediction}")
  print("Top 3 probabilities:")
  for crop, prob in ranked:
    print(f"  - {crop}: {prob * 100:.2f}%")


if __name__ == "__main__":
  main()
