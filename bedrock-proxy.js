// Node.js proxy for Bedrock API
// Run with: node bedrock-proxy.js

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const config = {
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN || '',
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
};

function sign(key, msg) {
    return crypto.createHmac('sha256', key).update(msg).digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = sign('AWS4' + key, dateStamp);
    const kRegion = sign(kDate, regionName);
    const kService = sign(kRegion, serviceName);
    const kSigning = sign(kService, 'aws4_request');
    return kSigning;
}

function signRequest(method, path, body) {
    const service = 'bedrock';
    const host = `bedrock-runtime.${config.region}.amazonaws.com`;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
    
    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\nx-amz-security-token:${config.sessionToken}\n`;
    const signedHeaders = 'host;x-amz-date;x-amz-security-token';
    const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
    
    const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    
    const authorizationHeader = `${algorithm} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    return {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzDate,
        'X-Amz-Security-Token': config.sessionToken,
        'Authorization': authorizationHeader,
        'Host': host
    };
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.method === 'POST' && req.url === '/bedrock/converse') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const path = `/model/${config.modelId}/converse`;
            const headers = signRequest('POST', path, body);
            
            const options = {
                hostname: `bedrock-runtime.${config.region}.amazonaws.com`,
                port: 443,
                path: path,
                method: 'POST',
                headers: headers
            };
            
            const proxyReq = https.request(options, (proxyRes) => {
                let data = '';
                proxyRes.on('data', chunk => data += chunk);
                proxyRes.on('end', () => {
                    res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(data);
                });
            });
            
            proxyReq.on('error', (error) => {
                console.error('Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            });
            
            proxyReq.write(body);
            proxyReq.end();
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(5000, () => {
    console.log('Bedrock proxy server running on http://localhost:5000');
    console.log('Open your browser and run the simulation!');
});
