import * as https from 'https';
import * as fs from 'fs';

const key = "AIzaSyCEb9uL6A4cG_upvzgWNwMWw-q-9AWOAh4";

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1/models?key=${key}`,
    method: 'GET'
};

const req = https.request(options, (res) => {
    let body = "";
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        fs.writeFileSync('models_list.json', body);
        console.log("Lista de modelos salva em models_list.json");
    });
});

req.on('error', (e) => { console.error(e); });
req.end();
