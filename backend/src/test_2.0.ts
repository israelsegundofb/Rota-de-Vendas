import * as https from 'https';

const key = "AIzaSyCEb9uL6A4cG_upvzgWNwMWw-q-9AWOAh4";
const data = JSON.stringify({
    contents: [{ parts: [{ text: "Oi" }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/gemini-2.0-flash-001:generateContent?key=${key}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.write(data);
req.end();
