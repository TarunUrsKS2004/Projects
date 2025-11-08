import joblib

try:
    model = joblib.load("pollution_model.pkl")
    model_columns = joblib.load("model_columns.pkl")

    print("✅ Model loaded with joblib!")
    print("Model type:", type(model))
    print("First 10 columns:", model_columns[:10])

except Exception as e:
    print("❌ Error:", e)
