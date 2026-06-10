/**
 * JoeBro Mock API Server (Node.js/Express)
 * Written by Joe B. The Blind Hacker
 * 
 * This server stubs out the exact HTTP routes expected by the JoeBro Web Controller
 * and the hardware table, to be used via DNS spoofing if the Ayla Cloud ever shuts down.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const port = 443; // Needs to run on HTTPS port

app.use(express.json());

// Serve static controller files
app.use(express.static(path.join(__dirname, '../tools/joebro')));

// Secure config.json from public download
app.get('/config.json', (req, res) => {
    res.status(403).json({ error: "Access to config.json is forbidden on frontend" });
});

// CORS Middleware to allow requests from local controller
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Load Ayla app credentials securely on the server side
const credentials = {
    app_id: process.env.AYLA_APP_ID || 'sobro-ag-id',
    app_secret: process.env.AYLA_APP_SECRET || 'sobro-mDM8M4JEe7IJFwiKvbs956XqX_s'
};

// Attempt to load from local config if present
try {
    const configPath = path.join(__dirname, '../tools/joebro/config.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.app_id) credentials.app_id = config.app_id;
        if (config.app_secret) credentials.app_secret = config.app_secret;
        console.log("Mock API: Loaded Ayla app credentials from config.json");
    }
} catch (e) {
    // Ignore, use defaults
}

// ----------------------------------------------------
// Ayla Cloud Secure Proxy Gateway Endpoints
// ----------------------------------------------------

// 1. Secure Proxy SignIn (Supports Password & Facebook Auth URL)
app.post('/api/proxy/users/sign_in.json', async (req, res) => {
    const body = req.body || {};
    if (body.user && body.user.application) {
        body.user.application.app_id = credentials.app_id;
        body.user.application.app_secret = credentials.app_secret;
    }
    
    try {
        const response = await fetch('https://user-field.aylanetworks.com/users/sign_in.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error("Proxy SignIn Error:", err);
        res.status(500).json({ error: "Sign-in proxy failed: " + err.message });
    }
});

// 2. Secure Proxy Facebook Authentication exchange
app.post('/api/proxy/users/provider_auth.json', async (req, res) => {
    const body = req.body || {};
    body.app_id = credentials.app_id; // Inject App ID on the server
    
    try {
        const response = await fetch('https://user-field.aylanetworks.com/users/provider_auth.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error("Proxy Provider Auth Error:", err);
        res.status(500).json({ error: "Provider auth proxy failed: " + err.message });
    }
});

// 3. Proxy Devices List & Registration (GET & POST)
app.all('/api/proxy/apiv1/devices.json', async (req, res) => {
    const authHeader = req.headers['authorization'];
    try {
        const options = {
            method: req.method,
            headers: { 'Authorization': authHeader }
        };
        if (req.method === 'POST') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(req.body);
        }
        const response = await fetch('https://ads-field.aylanetworks.com/apiv1/devices.json', options);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error("Proxy Devices Error:", err);
        res.status(500).json({ error: "Devices proxy failed: " + err.message });
    }
});

// 4. Proxy Properties State Sync (GET)
app.get('/api/proxy/apiv1/dsns/:dsn/properties.json', async (req, res) => {
    const { dsn } = req.params;
    const authHeader = req.headers['authorization'];
    try {
        const response = await fetch(`https://ads-field.aylanetworks.com/apiv1/dsns/${dsn}/properties.json`, {
            headers: { 'Authorization': authHeader }
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error("Proxy Properties Sync Error:", err);
        res.status(500).json({ error: "Properties sync proxy failed: " + err.message });
    }
});

// 5. Proxy Datapoints Send Command (POST)
app.post('/api/proxy/apiv1/dsns/:dsn/properties/:property/datapoints.json', async (req, res) => {
    const { dsn, property } = req.params;
    const authHeader = req.headers['authorization'];
    const value = req.body.datapoint ? req.body.datapoint.value : undefined;
    
    // SEC-02: Prevent Prototype Pollution by validating against allowed keys
    const allowedProperties = ['Cooling_switch', 'Drawer_lock', 'ble_switch', 'F_key', 'B_key', 'brightness', 'flight_status', 'mode_status'];
    if (!allowedProperties.includes(property)) {
        return res.status(400).json({ error: "Invalid or unauthorized property name" });
    }
    
    try {
        const response = await fetch(`https://ads-field.aylanetworks.com/apiv1/dsns/${dsn}/properties/${property}/datapoints.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({ datapoint: { value } })
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error("Proxy Datapoint Error:", err);
        res.status(500).json({ error: "Datapoint send proxy failed: " + err.message });
    }
});

// In-memory hardware state
let tableState = {
    'Cooling_switch': 1,
    'Drawer_lock': 0,
    'ble_switch': 0,
    'F_key': 0,
    'B_key': 0,
    'brightness': 50,
    'flight_status': '5:100:30:4000',
    'mode_status': 6258572
};

/**
 * 1. Mock Authentication
 * Intercepts POST https://user-field.aylanetworks.com/users/sign_in.json
 */
app.post('/users/sign_in.json', (req, res) => {
    console.log("Mock API: Authenticating User...");
    res.json({
        access_token: "MOCK_LOCAL_TOKEN_12345",
        refresh_token: "MOCK_REFRESH_TOKEN"
    });
});

/**
 * 2. Mock Device Discovery
 * Intercepts GET https://ads-field.aylanetworks.com/apiv1/devices.json
 */
app.get('/apiv1/devices.json', (req, res) => {
    console.log("Mock API: Discovering Tables...");
    res.json([
        {
            device: {
                dsn: "AC000W000000000",
                product_name: "Local JoeBro Table"
            }
        }
    ]);
});

/**
 * 3. Mock Property State Sync
 * Intercepts GET https://ads-field.aylanetworks.com/apiv1/dsns/:dsn/properties.json
 */
app.get('/apiv1/dsns/:dsn/properties.json', (req, res) => {
    console.log("Mock API: Syncing Hardware State...");
    
    // Map our simple dict into the terrible array structure Ayla uses
    const payload = Object.keys(tableState).map(key => ({
        property: {
            name: key,
            value: tableState[key]
        }
    }));
    
    res.json(payload);
});

/**
 * 4. Mock Command Datapoint Control
 * Intercepts POST https://ads-field.aylanetworks.com/apiv1/dsns/:dsn/properties/:property/datapoints.json
 */
app.post('/apiv1/dsns/:dsn/properties/:property/datapoints.json', (req, res) => {
    const property = req.params.property;
    const value = req.body.datapoint ? req.body.datapoint.value : undefined;
    
    console.log(`Mock API: Received command -> Set ${property} to ${value}`);
    
    // SEC-02: Prevent Prototype Pollution by validating against allowed keys
    const allowedProperties = ['Cooling_switch', 'Drawer_lock', 'ble_switch', 'F_key', 'B_key', 'brightness', 'flight_status', 'mode_status'];
    if (!allowedProperties.includes(property)) {
        return res.status(400).json({ error: "Invalid or unauthorized property name" });
    }
    
    // Update local state
    tableState[property] = value;
    
    // TODO: Write code here to broadcast the change directly to the table over local LAN socket
    
    // Respond with success to the PWA
    res.status(201).json({});
});

// SEC-03: Setup HTTPS with fallback to HTTP
const fs = require('fs');
const https = require('https');
const path = require('path');

const certPath = path.join(__dirname, 'certs');
const keyFile = path.join(certPath, 'server.key');
const certFile = path.join(certPath, 'server.crt');

if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    try {
        const options = {
            key: fs.readFileSync(keyFile),
            cert: fs.readFileSync(certFile)
        };
        https.createServer(options, app).listen(port, () => {
            console.log(`JoeBro Mock API (HTTPS) listening on port ${port}`);
        });
    } catch (err) {
        console.error("Error starting HTTPS server, falling back to HTTP:", err);
        startHttp();
    }
} else {
    console.warn("SSL Certificates not found at 'mock-api/certs/'. Running HTTP on port 8080 as fallback...");
    startHttp();
}

function startHttp() {
    app.listen(8080, () => {
        console.log(`JoeBro Mock API (HTTP) listening on port 8080`);
    });
}
