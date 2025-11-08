import requests
import json
import time
import datetime
import random

# Configure the URL of your Flask API

API_URL = 'http://127.0.0.1:5000/predict' # Use '127.0.0.1' for local testing

def send_prediction_request(station_id, year):
    """
    Sends the required features (id and year) to the Flask API for prediction.
    
    Args:
        station_id (str): The ID of the water monitoring station.
        year (int): The year for the prediction.

    Returns:
        None
    """
    data = {
        'id': station_id,
        'year': year
    }
    
    try:
        response = requests.post(API_URL, json=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"Prediction successful at {datetime.datetime.now()}:")
            print(json.dumps(result, indent=4))
        else:
            print(f"Failed to get a prediction. Status code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"An error occurred while connecting to the API: {e}")

def main():
    """Main function to run the data transmission loop."""
    my_station_id = '22' # Example ID from your dataset
    prediction_year = 2024
    
    while True:
        print(f"Sending request for Station '{my_station_id}' for year {prediction_year}...")
        
        # 1. Send data to the API for prediction
        send_prediction_request(my_station_id, prediction_year)
        
        # 2. Wait for a specified interval
        print("Waiting for 1 hour before the next reading...")
        time.sleep(3600) # Wait for 1 hour (3600 seconds)

if __name__ == '__main__':
    main()
