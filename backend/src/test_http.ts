import * as https from 'https';

const key = "AIzaSyCEb9uL6A4cG_upvzgWNwMWw-q-9AWOAh4";

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1/models?key=${key}`,
    method: 'GET'
};

const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let body = "";
    res.on('data', (d) => {
        body += d;
    });
    res.on('end', () => {
        console.log(body);
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
