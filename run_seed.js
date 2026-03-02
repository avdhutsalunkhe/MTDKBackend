const db = require('./db');
const fs = require('fs');
const path = require('path');

(async () => {
	try {
		const sql = fs.readFileSync(path.join(__dirname, 'seed_about_subs.sql'), 'utf8');
		await db.query(sql);
		console.log('Seed executed.');
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
})();
