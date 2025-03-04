from flask import Flask, render_template, redirect, url_for, request, flash, session, jsonify, Response
from functools import wraps
import requests
import os
import json
import time
from werkzeug.utils import secure_filename
import logging
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)
app.permanent_session_lifetime = 3600  # 1 hour session lifetime

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             'uploads')
ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'
}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# API endpoints
API_BASE_URL = "http://localhost:8000/api"
LOGIN_URL = f"{API_BASE_URL}/auth/login"
LOGOUT_URL = f"{API_BASE_URL}/auth/logout"
REFRESH_URL = f"{API_BASE_URL}/auth/refresh"

# CRUD endpoints
DEPARTMENTS_URL = f"{API_BASE_URL}/departments"
CATEGORIES_URL = f"{API_BASE_URL}/categories"
DOCUMENTS_URL = f"{API_BASE_URL}/documents"
USERS_URL = f"{API_BASE_URL}/users"
ADMIN_URL = f"{API_BASE_URL}/admins"
DOCUMENT_TYPES_URL = f"{API_BASE_URL}/document_types"

# Request timeout in seconds
REQUEST_TIMEOUT = 30  # Increased timeout for better reliability


def refresh_token():
    """Attempt to refresh the access token with enhanced error handling"""
    try:
        if 'refresh_token' not in session:
            print("No refresh token found in session")
            return False

        headers = {'Authorization': f'Bearer {session.get("refresh_token")}'}
        response = requests.post(
            REFRESH_URL,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
            verify=True  # Ensure SSL verification
        )

        if response.ok:
            data = response.json()
            session['access_token'] = data['access_token']
            session['refresh_token'] = data['refresh_token']
            session['token_expiry'] = time.time() + 3600
            return True
        else:
            print(f"Token refresh failed with status: {response.status_code}")
            return False

    except requests.Timeout:
        print("Token refresh timeout")
    except requests.ConnectionError:
        print("Token refresh connection error")
    except requests.RequestException as e:
        print(f"Token refresh request error: {str(e)}")
    except Exception as e:
        print(f"Token refresh error: {str(e)}")
    return False


def login_required(f):

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'access_token' not in session:
            return redirect(url_for('login'))

        # Check token expiration
        if 'token_expiry' in session:
            current_time = time.time()
            expiry_time = session.get('token_expiry', 0)

            # Refresh token if it's expired or about to expire in the next 5 minutes
            if current_time >= (expiry_time - 300):
                if not refresh_token():
                    session.clear()
                    flash('Your session has expired. Please log in again.',
                          'error')
                    return redirect(url_for('login'))

        return f(*args, **kwargs)

    return decorated_function


def get_auth_headers():
    """Get authentication headers with proper error handling"""
    token = session.get('access_token')
    if not token:
        raise ValueError('No access token found')

    return {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }


def get_multipart_headers():
    """Get headers for multipart form data requests"""
    token = session.get('access_token')
    if not token:
        raise ValueError('No access token found')

    return {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}


def handle_api_error(response, default_error="An error occurred"):
    """Enhanced API error handling with detailed logging"""
    try:
        if response.status_code == 401:
            # Try to refresh token on authentication failure
            if refresh_token():
                return 'Token refreshed, please retry the operation'
            return 'Authentication failed, please login again'

        if not response.ok:
            try:
                error_data = response.json()
                if isinstance(error_data, dict):
                    error_msg = error_data.get('error') or error_data.get(
                        'message') or default_error
                    print(f"API Error: {error_msg}")
                    return error_msg
            except json.JSONDecodeError:
                error_msg = f"Server error: {response.status_code}"
                print(f"API Error: {error_msg}")
                return error_msg

            print(f"API Error: {default_error}")
            return default_error

    except Exception as e:
        error_msg = f"Error parsing API response: {str(e)}"
        print(error_msg)
        return default_error


def handle_api_response(response,
                        success_code=200,
                        error_message="Operation failed"):
    """Enhanced API response handler with proper error handling and logging"""
    try:
        if response.status_code == 401:
            if refresh_token():
                return jsonify({'error': 'Please retry the operation'}), 401
            return jsonify(
                {'error': 'Authentication failed, please login again'}), 401
        elif response.status_code == 403:
            return jsonify({'error': 'Access forbidden'}), 403
        elif response.status_code == 404:
            return jsonify({'error': 'Resource not found'}), 404
        elif not response.ok:
            error = handle_api_error(response, error_message)
            return jsonify({'error': error}), response.status_code

        try:
            if response.status_code == 204:
                return '', 204
            return response.json(), success_code
        except json.JSONDecodeError:
            if response.status_code == 204:
                return '', 204
            error_msg = 'Invalid JSON response'
            print(f"API Error: {error_msg}")
            return jsonify({'error': error_msg}), 500

    except Exception as e:
        error_msg = f"Error handling API response: {str(e)}"
        print(error_msg)
        return jsonify({'error': error_message}), 500


@app.route('/')
def index():
    if 'access_token' in session:
        return redirect(url_for('departments')) # Changed redirect target
    return redirect(url_for('login'))


@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    try:
        data = request.get_json()
        logger.info("Received password change request")

        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            logger.error("Missing required password fields")
            return jsonify(
                {'error': 'Both current and new passwords are required'}), 400

        headers = get_auth_headers()
        response = requests.post(f"{API_BASE_URL}/auth/password/change",
                                 headers=headers,
                                 json={
                                     'current_password': current_password,
                                     'new_password': new_password
                                 },
                                 timeout=REQUEST_TIMEOUT)

        if response.ok:
            logger.info("Password changed successfully")
            # Clear the session to force re-login
            session.clear()
            return jsonify({'message': 'Password changed successfully'}), 200
        else:
            error_msg = handle_api_error(response, 'Failed to change password')
            logger.error(f"Password change failed: {error_msg}")
            return jsonify({'error': error_msg}), response.status_code

    except Exception as e:
        logger.error(f"Password change error: {str(e)}")
        return jsonify({'error':
                        'An error occurred while changing password'}), 500


@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'access_token' in session:
        return redirect(url_for('departments')) # Changed redirect target

    if request.method == 'POST':
        identifier = request.form.get('identifier')
        password = request.form.get('password')

        if not identifier or not password:
            flash('Please provide both identifier and password', 'error')
            return render_template('login.html')

        try:
            response = requests.post(LOGIN_URL,
                                     json={
                                         'identifier': identifier,
                                         'password': password
                                     },
                                     timeout=REQUEST_TIMEOUT)

            if response.status_code == 200:
                data = response.json()
                logger.info(f"Login response: {data}"
                            )  # Log the entire response for debugging
                session.permanent = True
                session['access_token'] = data['access_token']
                session['refresh_token'] = data['refresh_token']
                session['user'] = data['user']
                session['company_id'] = data['user'].get('company_id')
                session['token_expiry'] = time.time(
                ) + 3600  # Set token expiry to 1 hour

                # Check if password change is required
                if data.get('requires_password_change'):
                    logger.info(f"User {identifier} requires password change")
                    session['requires_password_change'] = True
                    return render_template('login.html',
                                           show_password_modal=True)

                # Only allow proceeding if password change is not required
                if not session.get('requires_password_change'):
                    return redirect(url_for('departments')) # Changed redirect target
                else:
                    # If somehow we got here with requires_password_change still True,
                    # show the modal again
                    return render_template('login.html',
                                           show_password_modal=True)
            else:
                error_message = handle_api_error(response,
                                                 'Invalid credentials')
                logger.error(
                    f"Login failed for user {identifier}: {error_message}")
                flash(error_message, 'error')
        except requests.Timeout:
            flash('Login request timed out. Please try again.', 'error')
            logger.error("Login request timed out")
        except requests.ConnectionError:
            flash('Could not connect to the server. Please try again later.',
                  'error')
            logger.error("Connection error during login")
        except Exception as e:
            logger.error(f"Login error: {e}")
            flash('An error occurred during login', 'error')

    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    try:
        headers = get_auth_headers()
        requests.post(LOGOUT_URL, headers=headers, timeout=REQUEST_TIMEOUT)
    except Exception as e:
        logger.error(f"Logout error: {e}")

    session.clear()
    return redirect(url_for('login'))


@app.route('/categories/<category_id>/document_types')
@login_required
def categories_document_types(category_id):
    headers = get_auth_headers()
    try:
        # Get department details
        logger.info(f"Fetching document types details for ID: {category_id}")

        categories_response = requests.get(f"{CATEGORIES_URL}/{category_id}",
                                           headers=headers,
                                           timeout=REQUEST_TIMEOUT)

        if categories_response.ok:
            logger.info(
                f"Successfully fetched {len(categories_response.json())} categories"
            )
        else:
            logger.error(
                f"Failed to fetch categories: {categories_response.status_code}"
            )
            categories = []
            flash('Error loading categories', 'error')

        category = categories_response.json()

        return render_template('category_document_types.html',

                               category=category)
    except requests.Timeout:
        logger.error("Request timed out while fetching department categories")
        flash('Request timed out', 'error')
    except requests.ConnectionError:
        logger.error("Connection error while fetching department categories")
        flash('Failed to connect to server', 'error')
    except Exception as e:
        logger.error(f"Unexpected error in department_categories: {e}")
        flash('An unexpected error occurred', 'error')

    return redirect(url_for('departments'))


@app.route('/document_type/<document_type_id>/documents')
@login_required
def document_type_documents(document_type_id):
    headers = get_auth_headers()
    company_id = session.get('company_id')

    if not company_id:
        return jsonify({'error': 'Company ID not found in session'}), 400

    try:
        response = requests.get(f"{DOCUMENT_TYPES_URL}/{document_type_id}",
                                headers=headers,
                                timeout=REQUEST_TIMEOUT)

        if not response.ok:
            logger.error(
                f"Failed to fetch document types: {response.status_code}")
            flash('Document types not found', 'error')
            return redirect(url_for('document_types'))

        document_type = response.json()

        categories_response = requests.get(
            f"{CATEGORIES_URL}/{document_type.get('category_id')}",
            headers=headers,
            timeout=REQUEST_TIMEOUT)

        if not categories_response.ok:
            logger.error(
                f"Failed to fetch category: {categories_response.status_code}")
            flash('Category not found', 'error')
            return redirect(url_for('document_types'))

        category = categories_response.json()

        return render_template('document_types_documents.html',
                               document_type=document_type,
                               category=category)
    except requests.Timeout:
        logger.error("Request timed out while fetching department_types")
        flash('Request timed out', 'error')
    except requests.ConnectionError:
        logger.error("Connection error while fetching department_types")
        flash('Failed to connect to server', 'error')
    except Exception as e:
        logger.error(f"Unexpected error in document_type_documents: {e}")
        flash('An unexpected error occurred', 'error')
    return redirect(url_for('departments'))


@app.route('/api/documents', methods=['POST'])
@login_required
def create_document():
    headers = get_multipart_headers()  # Use multipart headers for file uploads
    company_id = session.get('company_id')

    if not company_id:
        return jsonify({'error': 'Company ID not found in session'}), 400

    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if not file.filename:
            return jsonify({'error': 'No file selected'}), 400

        # Build form data
        form_data = {
            'company_id': company_id,
            'titulo': request.form.get('titulo'),
            'department_id': request.form.get('department_id'),
            'category_id': request.form.get('category_id'),
            'document_type_id': request.form.get('document_type_id'),
            'user_id': request.form.get('user_id')
        }

        # Validate required fields
        required_fields = [
            'titulo', 'department_id', 'category_id', 'document_type_id',
            'user_id'
        ]
        missing_fields = [
            field for field in required_fields if not form_data.get(field)
        ]
        if missing_fields:
            return jsonify({
                'error':
                f'Missing required fields: {", ".join(missing_fields)}'
            }), 400

        # Create files dictionary with proper file object
        files = {
            'file': (secure_filename(file.filename), file, file.content_type)
        }
        upload_headers = headers.copy()
        upload_headers.pop('Content-Type', None)

        response = requests.post(
            DOCUMENTS_URL,
            headers=headers,
            data=form_data,
            files=files,
            timeout=REQUEST_TIMEOUT * 2  # Double timeout for file upload
        )
        return handle_api_response(response,
                                   success_code=201,
                                   error_message='Failed to create document')
    except requests.Timeout:
        return jsonify({'error': 'Request timed out'}), 504
    except requests.ConnectionError:
        return jsonify({'error': 'Failed to connect to server'}), 503
    except Exception as e:
        print(f"Error creating document: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500


@app.route('/api/documents/<document_id>', methods=['DELETE'])
@login_required
def delete_document(document_id):
    headers = get_auth_headers()
    try:
        response = requests.delete(f"{DOCUMENTS_URL}/{document_id}",
                                   headers=headers,
                                   timeout=REQUEST_TIMEOUT)

        if response.status_code == 204:
            return '', 204

        return handle_api_response(response,
                                   error_message='Failed to delete document')
    except requests.Timeout:
        return jsonify({'error': 'Request timed out'}), 504
    except requests.ConnectionError:
        return jsonify({'error': 'Failed to connect to server'}), 503
    except Exception as e:
        print(f"Error deleting document: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500


@app.route('/proxy/storage/<path:url>')
def proxy_storage(url):
    try:
        storage_url = f"https://storage.googleapis.com/{url}"
        response = requests.get(storage_url, stream=True)

        proxy_response = Response(
            response.iter_content(chunk_size=8192),
            content_type=response.headers['Content-Type']
        )

        # Add CORS headers
        proxy_response.headers['Access-Control-Allow-Origin'] = '*'
        proxy_response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        proxy_response.headers['Access-Control-Allow-Headers'] = 'Content-Type'

        return proxy_response
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == "__main__":
    # Ensure upload folder exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    port = int(os.environ.get('PORT', 3000))  # Changed from 5000 to 3000
    app.run(host='0.0.0.0', port=port, debug=True)