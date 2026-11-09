const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../postman/EduTrack-AI.postman_collection.json');
let collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Find Login request
const authFolder = collection.item.find(i => i.name === 'Auth');
const loginReq = authFolder.item.find(i => i.name === '2. Login (Entrar)');

// Add event with test script
loginReq.event = [
  {
    "listen": "test",
    "script": {
      "exec": [
        "var jsonData = pm.response.json();",
        "if (jsonData.access_token) {",
        "    pm.environment.set(\"access_token\", jsonData.access_token);",
        "}"
      ],
      "type": "text/javascript"
    }
  }
];

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log("Collection updated with test script for Login!");
