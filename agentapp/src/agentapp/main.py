import warnings
from datetime import datetime
from pathlib import Path
from agentapp.crew import Agentapp
warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global state to track agent generation status
generation_status = {
    'is_generating': False,
    'started_at': None,
    'completed_at': None,
    'error': None
}

# Path to outputs directory
outputs_dir = Path("outputs")
frontend_dir = outputs_dir / "frontend"
backend_dir = outputs_dir / "backend"

# This main file is intended to be a way for you to run your
# crew locally, so refrain from adding unnecessary logic into this file.
# Replace with inputs you want to test with, it will automatically
# interpolate any tasks and agents information

@app.route("/", methods=['GET'])
def index():
    return '<h1>Hello, World!</h1>'

def run_crew_async(user_input):
    """Run the crew in a background thread"""
    global generation_status
    try:
        generation_status['is_generating'] = True
        generation_status['started_at'] = datetime.now().isoformat()
        generation_status['error'] = None
        
        # Ensure outputs directory exists
        outputs_dir.mkdir(exist_ok=True)
        
        inputs = {
            'user_input': user_input
        }

        # Run the crew
        result = Agentapp().crew().kickoff(inputs=inputs)
        
        generation_status['is_generating'] = False
        generation_status['completed_at'] = datetime.now().isoformat()
        generation_status['error'] = None
        
    except Exception as e:
        generation_status['is_generating'] = False
        generation_status['completed_at'] = datetime.now().isoformat()
        generation_status['error'] = str(e)
        print(f"Error running crew: {e}")

@app.route("/launch", methods=["POST"])
def run():
    """
    Start the crew execution in the background and return immediately.
    """
    try:
        # Get JSON data from request
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        user_input = data.get('user_input') if data else None
        
        if not user_input:
            return jsonify({'error': 'user_input is required'}), 400
        
        # Check if already generating
        if generation_status['is_generating']:
            return jsonify({
                'status': 'already_running',
                'message': 'Agent generation is already in progress'
            }), 200
        
        # Reset status
        generation_status['is_generating'] = True
        generation_status['started_at'] = datetime.now().isoformat()
        generation_status['completed_at'] = None
        generation_status['error'] = None
        
        # Start crew in background thread
        thread = threading.Thread(target=run_crew_async, args=(user_input,))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'status': 'started',
            'message': 'Agent generation started'
        }), 200
        
    except Exception as e:
        generation_status['is_generating'] = False
        generation_status['error'] = str(e)
        return jsonify({
            'status': 'error',
            'message': f'An error occurred while starting the crew: {str(e)}'
        }), 500

@app.route("/status", methods=["GET"])
def get_status():
    """
    Get the current status of agent generation.
    """
    try:
        # Check if frontend and backend directories exist and have files
        frontend_exists = frontend_dir.exists() and any(frontend_dir.iterdir())
        backend_exists = backend_dir.exists() and any(backend_dir.iterdir())
        
        # Check if generation is complete
        # Generation is complete if:
        # 1. Not currently generating
        # 2. Either completed_at is set, or frontend/backend folders exist with files
        is_complete = (
            not generation_status['is_generating'] and 
            (generation_status['completed_at'] is not None or (frontend_exists or backend_exists))
        )
        
        return jsonify({
            'is_generating': generation_status['is_generating'],
            'is_complete': is_complete,
            'started_at': generation_status['started_at'],
            'completed_at': generation_status['completed_at'],
            'error': generation_status['error'],
            'has_frontend': frontend_exists,
            'has_backend': backend_exists
        }), 200
    except Exception as e:
        return jsonify({
            'is_generating': False,
            'is_complete': False,
            'error': str(e),
            'has_frontend': False,
            'has_backend': False
        }), 200


if __name__ == "__main__":
    app.run(debug=True, port=5001)
