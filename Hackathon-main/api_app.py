from flask import Flask, request, render_template, jsonify, redirect, url_for, session, flash
import pandas as pd
import joblib
import os
import uuid
import random
from werkzeug.security import generate_password_hash, check_password_hash

import matplotlib
matplotlib.use('Agg')  # Non-GUI backend for Flask
import matplotlib.pyplot as plt

app = Flask(__name__)
app.secret_key = "supersecretkey"

# ------------------- Load Model -------------------
try:
    model = joblib.load("pollution_model.pkl")
    model_columns = joblib.load("model_columns.pkl")
    print("✅ Model and columns loaded successfully")
except Exception as e:
    print("❌ Error loading model files:", e)
    model = None
    model_columns = []

# Extract station IDs dynamically
known_station_ids = [col.replace("id_", "") for col in model_columns if col.startswith("id_")]

# Create static folder if not exists
if not os.path.exists("static"):
    os.makedirs("static")

# ------------------- Temporary User DB -------------------
users_db = {}  # {username: hashed_password}

# ------------------- Risk Classification -------------------
def classify_risks(result):
    risk = {}
    severity_scores = {}

    thresholds = {
        "O2": 5 * random.uniform(0.9, 1.1),
        "NO3": 45 * random.uniform(0.9, 1.2),
        "NO2": 3 * random.uniform(0.9, 1.2),
        "SO4": 150 * random.uniform(0.8, 1.2),
        "PO4": 0.2 * random.uniform(0.8, 1.5),
        "CL": 200 * random.uniform(0.9, 1.2)
    }

    severity_map = {"O2":3, "NO3":4, "NO2":4, "SO4":2, "PO4":1, "CL":2}

    for pollutant, value in result.items():
        if pollutant == "O2" and value < thresholds[pollutant]:
            risk[pollutant] = f"Low {pollutant} - Poor quality (Risk)"
            severity_scores[pollutant] = severity_map[pollutant]
        elif pollutant in ["NO3","NO2","SO4","PO4","CL"] and value > thresholds[pollutant]:
            descriptions = {
                "NO3":"High Nitrate - Blue Baby Syndrome risk",
                "NO2":"High Nitrite - Unsafe for drinking",
                "SO4":"High Sulfate - Diarrhea risk",
                "PO4":"High Phosphate - Algal bloom risk",
                "CL":"High Chloride - Salty taste"
            }
            risk[pollutant] = descriptions[pollutant]
            severity_scores[pollutant] = severity_map[pollutant]

    most_unsafe = None
    if severity_scores:
        top = sorted(severity_scores.items(), key=lambda x:x[1], reverse=True)[:3]
        most_unsafe = random.choice([p[0] for p in top])

    ranked_risks = sorted(severity_scores.items(), key=lambda x:x[1], reverse=True)

    return risk, most_unsafe, ranked_risks

# ------------------- Recommendations -------------------
def generate_recommendation(most_unsafe):
    suggestions = {
        "O2":["Increase aeration","Avoid using water for sensitive aquatic life","Regular monitoring"],
        "NO3":["Avoid drinking raw water","Install nitrate removal systems","Use water for irrigation only"],
        "NO2":["Boil water before use","Use water purification tablets","Limit consumption for sensitive groups"],
        "SO4":["Avoid water for infants","Check for industrial discharge","Use filtered water"],
        "PO4":["Prevent stagnation to reduce algae","Use water cautiously for recreation","Monitor local algae levels"],
        "CL":["Dilute water before use","Check municipal supply","Avoid for sensitive crops"]
    }
    return random.choice(suggestions[most_unsafe]) if most_unsafe else "Water quality appears safe. Maintain regular monitoring."

# ------------------- Visualization -------------------
def generate_chart(result):
    pollutants = list(result.keys())
    values = list(result.values())

    filename = f"static/chart_{uuid.uuid4().hex}.png"

    plt.figure(figsize=(6,4))
    plt.bar(pollutants, values, color="skyblue")
    plt.xlabel("Pollutants")
    plt.ylabel("Level")
    plt.title("Predicted Pollutant Levels")
    plt.tight_layout()
    plt.savefig(filename)
    plt.close()

    return filename

# ------------------- Routes -------------------
@app.route("/")
def home():
    return redirect(url_for("login"))

# ------------------- Auth Routes -------------------
@app.route("/register", methods=["GET","POST"])
def register():
    if request.method=="POST":
        username = request.form["username"]
        password = request.form["password"]
        if username in users_db:
            flash("⚠️ Username already exists. Try another.")
            return redirect(url_for("register"))
        users_db[username] = generate_password_hash(password)
        flash("✅ Registration successful! Please log in.")
        return redirect(url_for("login"))
    return render_template("register.html")

@app.route("/login", methods=["GET","POST"])
def login():
    if request.method=="POST":
        username = request.form["username"]
        password = request.form["password"]
        if username not in users_db or not check_password_hash(users_db[username], password):
            flash("❌ Invalid username or password")
            return redirect(url_for("login"))
        session["username"] = username
        flash(f"👋 Welcome back, {username}!")
        return redirect(url_for("dashboard"))
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop("username", None)
    flash("👋 Logged out successfully")
    return redirect(url_for("login"))

# ------------------- Dashboard -------------------
@app.route("/dashboard")
def dashboard():
    if "username" not in session:
        flash("⚠️ Please log in first")
        return redirect(url_for("login"))
    pollutants = ["O2","NO3","NO2","SO4","PO4","CL"]
    return render_template("dashboard.html", user=session["username"], stations=known_station_ids, pollutants=pollutants)

# ------------------- Predict -------------------
@app.route("/predict", methods=["POST"])
def predict():
    try:
        if "username" not in session:
            flash("⚠️ Please log in first")
            return redirect(url_for("login"))

        station_id = request.form.get("id") or str(request.json.get("id"))
        year_input = int(request.form.get("year") or request.json.get("year"))

        if station_id not in known_station_ids:
            return render_template(
                "result.html",
                error=f"Station ID '{station_id}' is unknown.",
                pollutants={},
                risk={},
                ranked_risks=[],
                most_unsafe=None,
                chart_path=None,
                recommendation=None
            )

        # Prepare input for model
        input_df = pd.DataFrame({"year":[year_input],"id":[f"id_{station_id}"]})
        input_encoded = pd.get_dummies(input_df, columns=["id"])
        aligned_input = pd.DataFrame(0, index=[0], columns=model_columns)
        for col in input_encoded.columns:
            if col in aligned_input.columns:
                aligned_input[col] = input_encoded[col].iloc[0]

        prediction = model.predict(aligned_input)
        pollutants_list = ["O2","NO3","NO2","SO4","PO4","CL"]
        result = {p: float(val) for p, val in zip(pollutants_list, prediction[0])}

        # Demo variability
        for p in result:
            result[p] = round(result[p]*(0.7+random.random()) + int(station_id)*2 + (year_input%10), 2)

        risk, most_unsafe, ranked_risks = classify_risks(result)
        chart_path = generate_chart(result)
        overall_status = "Safe ✅" if not risk else "Unsafe ⚠️"
        recommendation = generate_recommendation(most_unsafe)

        return render_template(
            "result.html",
            station_id=station_id,
            year=year_input,
            pollutants=result,
            risk=risk,
            overall_status=overall_status,
            most_unsafe=most_unsafe,
            ranked_risks=ranked_risks,
            chart_path=chart_path,
            recommendation=recommendation
        )

    except Exception as e:
        return render_template(
            "result.html",
            error=str(e),
            pollutants={},
            risk={},
            ranked_risks=[],
            most_unsafe=None,
            chart_path=None,
            recommendation=None
        )

# ------------------- Live Simulation -------------------
@app.route("/simulate", methods=["GET"])
def simulate():
    pollutants_list = ["O2","NO3","NO2","SO4","PO4","CL"]
    simulated = {p: round(random.uniform(0,500),2) for p in pollutants_list}
    risk, most_unsafe, ranked_risks = classify_risks(simulated)
    recommendation = generate_recommendation(most_unsafe)
    return jsonify({
        "simulated_data": simulated,
        "risks": risk,
        "most_unsafe": most_unsafe,
        "ranked_risks": ranked_risks,
        "recommendation": recommendation
    })

if __name__=="__main__":
    app.run(debug=True)
