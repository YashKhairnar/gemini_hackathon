import warnings
from datetime import datetime
from pathlib import Path
from agentapp.crew import Agentapp
warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import os
import logging

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global state to track agent generation status
generation_status = {
    'is_generating': False,
    'started_at': None,
    'completed_at': None,
    'error': None,
    'current_step': None,
    'progress': {
        'step': None,
        'message': None,
        'percentage': 0
    }
}

# Path to outputs directory (relative to agentapp/src/agentapp/)
outputs_dir = Path(__file__).parent / "outputs"
frontend_dir = outputs_dir / "frontend"
backend_dir = outputs_dir / "backend"

# This main file is intended to be a way for you to run your
# crew locally, so refrain from adding unnecessary logic into this file.
# Replace with inputs you want to test with, it will automatically
# interpolate any tasks and agents information

@app.route("/", methods=['GET'])
def index():
    return '<h1>Hello, World!</h1>'

def monitor_file_creation():
    """Monitor file creation in outputs directory and update progress"""
    global generation_status
    import time
    
    prev_frontend_count = 0
    prev_backend_count = 0
    prev_files = set()
    
    while generation_status['is_generating']:
        try:
            # Count files in frontend directory
            frontend_count = 0
            if frontend_dir.exists():
                for root, dirs, files in os.walk(frontend_dir):
                    frontend_count += len([f for f in files if not f.startswith('.')])
            
            # Count files in backend directory
            backend_count = 0
            if backend_dir.exists():
                for root, dirs, files in os.walk(backend_dir):
                    backend_count += len([f for f in files if not f.startswith('.')])
            
            # Get current files
            current_files = set()
            if frontend_dir.exists():
                for root, dirs, files in os.walk(frontend_dir):
                    for f in files:
                        if not f.startswith('.'):
                            rel_path = os.path.relpath(os.path.join(root, f), frontend_dir)
                            current_files.add(f'frontend/{rel_path}')
            if backend_dir.exists():
                for root, dirs, files in os.walk(backend_dir):
                    for f in files:
                        if not f.startswith('.'):
                            rel_path = os.path.relpath(os.path.join(root, f), backend_dir)
                            current_files.add(f'backend/{rel_path}')
            
            # Detect new files
            new_files = current_files - prev_files
            if new_files:
                file_list = list(new_files)[:5]  # Show up to 5 new files
                file_msg = ', '.join([f.split('/')[-1] for f in file_list])
                if len(new_files) > 5:
                    file_msg += f' (+{len(new_files) - 5} more)'
                
                generation_status['progress'] = {
                    'step': 'Creating Files',
                    'message': f'Created: {file_msg}',
                    'percentage': min(85, 40 + (frontend_count + backend_count) * 2),
                    'files_created': frontend_count + backend_count,
                    'frontend_files': frontend_count,
                    'backend_files': backend_count
                }
                prev_files = current_files
            
            # Update progress based on file counts
            total_files = frontend_count + backend_count
            if total_files > prev_frontend_count + prev_backend_count:
                progress_pct = min(85, 40 + total_files * 3)
                if frontend_count > 0 and backend_count > 0:
                    generation_status['progress'] = {
                        'step': 'Creating Files',
                        'message': f'Created {frontend_count} frontend files and {backend_count} backend files...',
                        'percentage': progress_pct,
                        'files_created': total_files,
                        'frontend_files': frontend_count,
                        'backend_files': backend_count
                    }
                elif frontend_count > 0:
                    generation_status['progress'] = {
                        'step': 'Creating Files',
                        'message': f'Created {frontend_count} frontend files...',
                        'percentage': progress_pct,
                        'files_created': total_files,
                        'frontend_files': frontend_count,
                        'backend_files': backend_count
                    }
                elif backend_count > 0:
                    generation_status['progress'] = {
                        'step': 'Creating Files',
                        'message': f'Created {backend_count} backend files...',
                        'percentage': progress_pct,
                        'files_created': total_files,
                        'frontend_files': frontend_count,
                        'backend_files': backend_count
                    }
            
            prev_frontend_count = frontend_count
            prev_backend_count = backend_count
            
        except Exception as e:
            logger.warning(f'Error monitoring files: {e}')
        
        time.sleep(1)  # Check every second

def run_crew_async(user_input):
    """Run the crew in a background thread"""
    global generation_status
    import threading
    
    try:
        generation_status['is_generating'] = True
        generation_status['started_at'] = datetime.now().isoformat()
        generation_status['error'] = None
        generation_status['current_step'] = 'initializing'
        generation_status['progress'] = {
            'step': 'Initializing',
            'message': 'Setting up agent workspace...',
            'percentage': 5
        }
        
        # Ensure outputs directory exists
        outputs_dir.mkdir(exist_ok=True)
        
        generation_status['progress'] = {
            'step': 'Analyzing',
            'message': 'Analyzing user requirements...',
            'percentage': 10
        }
        
        inputs = {
            'user_input': user_input
        }

        # Start file monitoring thread
        monitor_thread = threading.Thread(target=monitor_file_creation, daemon=True)
        monitor_thread.start()
        
        # Initialize crew
        generation_status['progress'] = {
            'step': 'Decomposing',
            'message': 'Orchestrator agent is analyzing and decomposing the request into tasks...',
            'percentage': 20
        }
        
        crew = Agentapp().crew()
        
        generation_status['progress'] = {
            'step': 'Planning',
            'message': 'Planning file structure and implementation approach...',
            'percentage': 30
        }
        
        # Run the crew - this will execute all tasks
        generation_status['progress'] = {
            'step': 'Generating',
            'message': 'AI agents are generating code files...',
            'percentage': 40
        }
        
        result = crew.kickoff(inputs=inputs)
        
        # Final check
        generation_status['progress'] = {
            'step': 'Validating',
            'message': 'QA agent is validating the generated code...',
            'percentage': 90
        }
        
        # Small delay to ensure all files are written
        import time
        time.sleep(2)
        
        generation_status['is_generating'] = False
        generation_status['completed_at'] = datetime.now().isoformat()
        generation_status['error'] = None
        generation_status['current_step'] = 'completed'
        generation_status['progress'] = {
            'step': 'Complete',
            'message': 'Code generation completed successfully!',
            'percentage': 100
        }
        
    except Exception as e:
        generation_status['is_generating'] = False
        generation_status['completed_at'] = datetime.now().isoformat()
        generation_status['error'] = str(e)
        generation_status['current_step'] = 'error'
        generation_status['progress'] = {
            'step': 'Error',
            'message': f'Error during generation: {str(e)}',
            'percentage': 0
        }
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
        
        # Get current progress from status (use existing progress if available)
        current_step = generation_status.get('current_step', None)
        progress = generation_status.get('progress', {}).copy() if generation_status.get('progress') else {}
        
        # If generating and monitor thread hasn't provided detailed progress yet,
        # provide fallback progress based on file existence
        if generation_status['is_generating']:
            # Only update if monitor thread hasn't set detailed file information
            if not progress.get('files_created'):
                if frontend_exists and backend_exists:
                    progress['step'] = 'Creating Files'
                    progress['message'] = 'Frontend and backend files created. Finalizing...'
                    progress['percentage'] = 85
                elif frontend_exists:
                    progress['step'] = 'Creating Files'
                    progress['message'] = 'Frontend files created. Working on backend...'
                    progress['percentage'] = 60
                elif backend_exists:
                    progress['step'] = 'Creating Files'
                    progress['message'] = 'Backend files created. Working on frontend...'
                    progress['percentage'] = 60
                elif not progress or progress.get('percentage', 0) < 30:
                    progress['step'] = progress.get('step', 'Analyzing')
                    progress['message'] = progress.get('message', 'Analyzing requirements...')
                    progress['percentage'] = progress.get('percentage', 20)
        
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
            'has_backend': backend_exists,
            'current_step': current_step,
            'progress': progress
        }), 200
    except Exception as e:
        return jsonify({
            'is_generating': False,
            'is_complete': False,
            'error': str(e),
            'has_frontend': False,
            'has_backend': False,
            'current_step': 'error',
            'progress': {
                'step': 'Error',
                'message': str(e),
                'percentage': 0
            }
        }), 200


if __name__ == "__main__":
    app.run(debug=True, port=5001)
