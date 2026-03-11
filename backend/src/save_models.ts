import * as https from 'https';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const key = process.env.GEMINI_API_KEY || '';

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
