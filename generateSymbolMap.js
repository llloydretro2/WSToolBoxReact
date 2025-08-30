// generateSymbolMap.js
const fs = require("fs");
const path = require("path");

const symbolDir = path.join(__dirname, "public/assets/symbol");
const outputFile = path.join(__dirname, "src/symbolMap.json");

const files = fs.readdirSync(symbolDir);

const map = {};

files.forEach((file) => {
	const match = file.match(/^(.+)\.png$/);
	if (match) {
		map[`/${match[1]}`] = `assets/symbol/${file}`;
	}
});

fs.writeFileSync(outputFile, JSON.stringify(map, null, 2));
console.log("✅ Generated symbolMap.json");
