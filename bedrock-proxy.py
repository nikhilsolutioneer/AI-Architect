import os
#!/usr/bin/env python3
"""
Simple proxy server for Bedrock API calls
Run this with: python bedrock-proxy.py
"""

import json
import boto3
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for browser requests

# Initialize Bedrock client with your credentials
bedrock = boto3.client(
    'bedrock-runtime',
    region_name='us-east-1',
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
    aws_session_token=os.environ.get('AWS_SESSION_TOKEN')
)

@app.route('/bedrock/converse', methods=['POST'])
def converse():
    try:
        data = request.json
        
        response = bedrock.converse(
            modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
            messages=data['messages'],
            inferenceConfig=data.get('inferenceConfig', {}),
            system=data.get('system', [])
        )
        
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Bedrock proxy server on http://localhost:5000")
    print("Make sure to install: pip install flask flask-cors boto3")
    app.run(port=5000, debug=True)
