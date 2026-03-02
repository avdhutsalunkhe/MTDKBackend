const db = require('./db');

(async () => {
	try {
		const [rows] = await db.query("SELECT page_name FROM page_configurations WHERE page_name LIKE 'about%'");
		console.log("About pages in DB:", rows.map(r => r.page_name));
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
})();
