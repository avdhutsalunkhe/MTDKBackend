const fs = require('fs');

let file = fs.readFileSync('index.js', 'utf8');

const regexes = [
	// Announcements
	/app\.post\('\/api\/announcements\/:section', async/g,
	/app\.put\('\/api\/announcements\/:section\/:id', async/g,
	/app\.delete\('\/api\/announcements\/:section\/:id', async/g,
	// Gallery
	/app\.post\('\/api\/gallery\/:section', async/g,
	/app\.delete\('\/api\/gallery\/:section\/:id', async/g,
	// News
	/app\.post\('\/api\/news\/:section', async/g,
	/app\.delete\('\/api\/news\/:section\/:id', async/g,
	// Leads
	/app\.get\('\/api\/leads', async/g,
	/app\.delete\('\/api\/leads\/:id', async/g,
	// Admissions
	/app\.get\('\/api\/admissions', async/g,
	/app\.put\('\/api\/admissions\/:id', async/g,
	/app\.delete\('\/api\/admissions\/:id', async/g,
	// Content
	/app\.post\('\/api\/annual-content', async/g,
	/app\.post\('\/api\/sections\/:section', async/g,
	/app\.post\('\/api\/contact', async/g,
	/app\.post\('\/api\/home-data', async/g,
	// Upload
	/app\.post\('\/api\/upload', upload/g,
	// Page Management
	/app\.put\('\/api\/pages\/:pageName\/config', async/g,
	/app\.post\('\/api\/pages\/:pageName\/sections', async/g,
	/app\.put\('\/api\/pages\/:pageName\/sections\/:sectionId', async/g,
	/app\.delete\('\/api\/pages\/:pageName\/sections\/:sectionId', async/g,
	/app\.post\('\/api\/pages\/:pageName\/media', async/g,
	/app\.delete\('\/api\/pages\/:pageName\/media\/:mediaId', async/g
];

regexes.forEach(regex => {
	const isUpload = regex.toString().includes('upload');

	if (isUpload) {
		file = file.replace(regex, "app.post('/api/upload', authenticateToken, authorizeRole(['admin', 'super_admin']), upload");
	} else {
		// extract route from regex
		const routeMatch = regex.toString().match(/app\.(post|put|delete|get)\('(.*?)', async/);
		if (routeMatch) {
			const replacement = `app.${routeMatch[1]}('${routeMatch[2]}', authenticateToken, authorizeRole(['admin', 'super_admin']), async`;
			file = file.replace(regex, replacement);
		}
	}
});

fs.writeFileSync('index.js', file);
console.log('index.js patched successfully');
