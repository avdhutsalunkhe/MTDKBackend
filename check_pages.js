const db = require('./db');

(async () => {
	try {
		console.log("Checking page_configurations table...");
		const [rows] = await db.query('SELECT page_name, display_title FROM page_configurations');
		console.log("Found " + rows.length + " rows:");
		rows.forEach(r => console.log(`- '${r.page_name}': ${r.display_title}`));
		process.exit(0);
	} catch (err) {
		console.error('Error checking DB:', err);
		process.exit(1);
	}
})();
