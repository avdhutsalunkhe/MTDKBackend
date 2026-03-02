const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { responseTimeMonitor, routeCheck, errorHandler } = require('./middleware/internalApi');

const app = express();
const PORT = process.env.PORT || 5000;

// Mandatory HTTPS in production
app.use((req, res, next) => {
	if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
		return res.status(401).json({ error: 'HTTPS is mandatory in production' });
	}
	next();
});

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));

// Internal API Middlewares
app.use(responseTimeMonitor);
app.use(routeCheck);

// Initialize Database Tables
(async () => {
	try {
		const sql = fs.readFileSync(path.join(__dirname, 'setup.sql'), 'utf8');
		await db.query(sql);

		if (fs.existsSync(path.join(__dirname, 'page_management_schema.sql'))) {
			const pageSql = fs.readFileSync(path.join(__dirname, 'page_management_schema.sql'), 'utf8');
			await db.query(pageSql);
			console.log("Page management tables initialized successfully.");
		}

		// Seed default admins with hashed passwords if they don't exist
		const [superRows] = await db.query('SELECT id FROM super_admin LIMIT 1');
		if (superRows.length === 0) {
			const hashedSuper = await bcrypt.hash('Avdhut03$', 10);
			await db.query('INSERT IGNORE INTO super_admin (id, username, password) VALUES (1, "avdhutu.salunkhe@gmail.com", ?)', [hashedSuper]);
		}

		const [adminRows] = await db.query('SELECT id FROM admin_users LIMIT 1');
		if (adminRows.length === 0) {
			const hashedAdmin = await bcrypt.hash('admin123', 10);
			await db.query('INSERT IGNORE INTO admin_users (id, username, password) VALUES (1700000000000, "admin", ?)', [hashedAdmin]);
		}

		console.log("Database tables initialized successfully.");
	} catch (err) {
		console.error("Database Initialization Error:", err);
	}
})();

// --- FILE UPLOAD CONFIG ---

// Ensure uploads directory exists (maps to public_html/uploads on production)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

// Static folder for uploads
app.use('/uploads', express.static(uploadDir));

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, 'public')));

// Multer storage engine
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		cb(null, uniqueSuffix + path.extname(file.originalname));
	}
});

// Multer upload middleware
const upload = multer({
	storage: storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
	fileFilter: (req, file, cb) => {
		const filetypes = /jpeg|jpg|png|gif|webp/;
		const mimetype = filetypes.test(file.mimetype);
		const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
		if (mimetype && extname) {
			return cb(null, true);
		}
		cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed!"));
	}
});

// Root route is handled by static middleware now
// app.get('/', (req, res) => {
// 	res.send('MTDK School API is running...');
// });

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
	res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// --- TEST ENDPOINT ---
app.get('/api/test', (req, res) => {
	res.status(200).json({
		success: true,
		message: 'Test endpoint is working successfully',
		timestamp: new Date().toISOString(),
		data: {
			service: 'MTDK API',
			version: '1.0.0'
		}
	});
});

// --- AUTHENTICATION MIDDLEWARES ---

const authenticateToken = (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (!token) return res.status(401).json({ error: 'Authentication token required' });

	jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
		if (err) return res.status(401).json({ error: 'Invalid, tampered, or expired token' });
		req.user = user;
		next();
	});
};

const authorizeRole = (roles) => {
	return (req, res, next) => {
		if (!req.user || !roles.includes(req.user.role)) {
			return res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
		}
		next();
	};
};

// --- AUTH & ADMIN USERS ---

app.post(['/api/login', '/api/admin/login'], async (req, res) => {
	const password = req.body.password;
	const email = req.body.email || req.body.username;
	const ipAddress = req.ip || req.connection.remoteAddress;

	try {
		let user = null;
		let role = null;

		// Check super admin by email matching
		const superAdminEmail = 'avdhutu.salunkhe@gmail.com';

		if (email === superAdminEmail) {
			const [superAdmins] = await db.query('SELECT * FROM super_admin WHERE username = ?', [email]);
			if (superAdmins.length > 0) {
				user = superAdmins[0];
				role = 'superadmin';
			}
		}

		if (!user) {
			// Else fetch from users table
			const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
			if (users.length > 0) {
				user = users[0];
				role = user.role;
			}
		}

		if (!user) {
			// User not found
			await db.query('INSERT IGNORE INTO failed_logins (ip_address, username) VALUES (?, ?)', [ipAddress || '', email || 'unknown']).catch(() => { });
			return res.status(401).json({ error: 'Username wrong' });
		}

		// Verify password
		let validPassword = false;
		try {
			validPassword = await bcrypt.compare(password, user.password);
		} catch (e) {
			validPassword = false;
		}

		// Fallback for plain text stored passwords if not hashed yet
		if (!validPassword && password === user.password) {
			validPassword = true;
		}

		if (validPassword) {
			const token = jwt.sign(
				{ id: user.id || 1, email: email, username: email, role },
				process.env.JWT_SECRET,
				{ expiresIn: '2h' }
			);
			return res.json({ success: true, token, role, email });
		}

		// Password wrong
		await db.query('INSERT IGNORE INTO failed_logins (ip_address, username) VALUES (?, ?)', [ipAddress || '', email || 'unknown']).catch(() => { });
		return res.status(401).json({ error: 'Password wrong' });
	} catch (err) {
		console.error('Login Error:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.get('/api/admin/credentials', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
	try {
		const [rows] = await db.query('SELECT username FROM super_admin'); // Do not expose password hashes
		res.json(rows);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/admin/update-credentials', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
	const { username, password } = req.body;
	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		// Update existing or try to insert if not exists
		await db.query('UPDATE super_admin SET password = ? WHERE username = ?', [hashedPassword, username]);
		const [rows] = await db.query('SELECT id FROM super_admin WHERE username = ?', [username]);
		if (rows.length === 0) {
			const newId = Date.now(); // or auto-increment if modified
			await db.query('INSERT INTO super_admin (id, username, password) VALUES (?, ?, ?)', [newId, username, hashedPassword]);
		}
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.get('/api/admin/users', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
	try {
		const [rows] = await db.query('SELECT id, username FROM admin_users'); // Do not expose password hashes
		res.json(rows);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/admin/users', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
	const { id, username, password } = req.body;
	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		await db.query('INSERT INTO admin_users (id, username, password) VALUES (?, ?, ?)', [id, username, hashedPassword]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.delete('/api/admin/users/:id', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
	try {
		await db.query('DELETE FROM admin_users WHERE id = ?', [req.params.id]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

// --- ANNOUNCEMENTS ---

app.get('/api/announcements/:section', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM announcements WHERE section = ? ORDER BY createdAt DESC', [req.params.section]);
		res.json(rows);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/announcements/:section', async (req, res) => {
	const { id, text, active } = req.body;
	try {
		await db.query('INSERT INTO announcements (id, section, text, active) VALUES (?, ?, ?, ?)', [id, req.params.section, text, active]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.put('/api/announcements/:section/:id', async (req, res) => {
	const { text, active } = req.body;
	try {
		await db.query('UPDATE announcements SET text = ?, active = ? WHERE id = ?', [text, active, req.params.id]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.delete('/api/announcements/:section/:id', async (req, res) => {
	try {
		await db.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

// --- GALLERY ---

app.get('/api/gallery/:section', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM gallery WHERE section = ? ORDER BY createdAt DESC', [req.params.section]);
		// Also need intro data? Currently intro is stored in section_content or similar in my schema design
		// Actually I'll use section_content for intro and gallery for images
		res.json(rows);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/gallery/:section', async (req, res) => {
	const { id, title, src } = req.body;
	try {
		await db.query('INSERT INTO gallery (id, section, title, src) VALUES (?, ?, ?, ?)', [id, req.params.section, title, src]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.delete('/api/gallery/:section/:id', async (req, res) => {
	try {
		await db.query('DELETE FROM gallery WHERE id = ?', [req.params.id]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

// --- NEWS CAROUSEL ---

app.get('/api/news/:section', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM news_carousel WHERE section = ? ORDER BY createdAt DESC', [req.params.section]);
		res.json(rows);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/news/:section', async (req, res) => {
	const { id, title, src } = req.body;
	try {
		await db.query('INSERT INTO news_carousel (id, section, title, src) VALUES (?, ?, ?, ?)', [id, req.params.section, title, src]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.delete('/api/news/:section/:id', async (req, res) => {
	try {
		await db.query('DELETE FROM news_carousel WHERE id = ?', [req.params.id]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});


// --- ADMISSION INQUIRIES ---

app.get('/api/admissions', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM admission_inquiries ORDER BY date DESC');
		// Parse JSON data column and spread it
		const result = rows.map(r => {
			const data = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
			return { id: r.id, date: r.date, status: r.status, ...data };
		});
		res.json(result);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/admissions', async (req, res) => {
	const { id, date, status, ...data } = req.body;
	try {
		await db.query('INSERT INTO admission_inquiries (id, date, status, data) VALUES (?, ?, ?, ?)',
			[id, date, status, JSON.stringify(data)]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.put('/api/admissions/:id', async (req, res) => {
	const { status } = req.body;
	try {
		// Only update the status, don't overwrite the data column
		await db.query('UPDATE admission_inquiries SET status = ? WHERE id = ?',
			[status, req.params.id]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.delete('/api/admissions/:id', async (req, res) => {
	try {
		await db.query('DELETE FROM admission_inquiries WHERE id = ?', [req.params.id]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

// --- ANNUAL CONTENT ---

app.get('/api/annual-content', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM annual_content WHERE id = 1');
		if (rows.length > 0) {
			const row = rows[0];
			res.json({
				principal: {
					name: row.principal_name || "",
					designation: row.principal_designation || "",
					messageTitle: row.message_title || "",
					messageContent: row.message_content || "",
					photo: row.principal_photo || null
				},
				magazine: {
					title: row.magazine_title || "",
					description: row.magazine_description || "",
					coverImage: row.magazine_cover || null,
					pdf: row.magazine_pdf || null
				}
			});
		} else {
			res.json(null);
		}
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/annual-content', async (req, res) => {
	const { principal, magazine } = req.body;
	try {
		// Use safe defaults for missing properties
		const pName = principal?.name || "";
		const pDesignation = principal?.designation || "";
		const pMessageTitle = principal?.messageTitle || "";
		const pMessageContent = principal?.messageContent || "";
		const mTitle = magazine?.title || "";
		const mDescription = magazine?.description || "";

		// Handle large files - save to filesystem if base64
		let pPhotoPath = null;
		let mCoverPath = null;
		let mPdfPath = null;

		// Save principal photo to filesystem if it's base64
		if (principal?.photo) {
			if (principal.photo.startsWith('data:')) {
				const matches = principal.photo.match(/^data:(.+);base64,(.+)$/);
				if (matches) {
					const ext = matches[1].split('/')[1] || 'jpg';
					const filename = `principal_photo.${ext}`;
					const filepath = path.join(uploadDir, filename);
					fs.writeFileSync(filepath, Buffer.from(matches[2], 'base64'));
					pPhotoPath = `/uploads/${filename}`;
				}
			} else {
				pPhotoPath = principal.photo; // Already a path
			}
		}

		// Save magazine cover to filesystem if it's base64
		if (magazine?.coverImage) {
			if (magazine.coverImage.startsWith('data:')) {
				const matches = magazine.coverImage.match(/^data:(.+);base64,(.+)$/);
				if (matches) {
					const ext = matches[1].split('/')[1] || 'jpg';
					const filename = `magazine_cover.${ext}`;
					const filepath = path.join(uploadDir, filename);
					fs.writeFileSync(filepath, Buffer.from(matches[2], 'base64'));
					mCoverPath = `/uploads/${filename}`;
				}
			} else {
				mCoverPath = magazine.coverImage; // Already a path
			}
		}

		// Save PDF to filesystem if it's base64
		if (magazine?.pdf) {
			if (magazine.pdf.startsWith('data:')) {
				const matches = magazine.pdf.match(/^data:(.+);base64,(.+)$/);
				if (matches) {
					const filename = `school_magazine.pdf`;
					const filepath = path.join(uploadDir, filename);
					fs.writeFileSync(filepath, Buffer.from(matches[2], 'base64'));
					mPdfPath = `/uploads/${filename}`;
				}
			} else {
				mPdfPath = magazine.pdf; // Already a path
			}
		}

		await db.query(`INSERT INTO annual_content (id, principal_name, principal_designation, message_title, message_content, principal_photo, magazine_title, magazine_description, magazine_cover, magazine_pdf) 
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            principal_name=?, principal_designation=?, message_title=?, message_content=?, principal_photo=?, magazine_title=?, magazine_description=?, magazine_cover=?, magazine_pdf=?`,
			[pName, pDesignation, pMessageTitle, pMessageContent, pPhotoPath, mTitle, mDescription, mCoverPath, mPdfPath,
				pName, pDesignation, pMessageTitle, pMessageContent, pPhotoPath, mTitle, mDescription, mCoverPath, mPdfPath]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

// --- DYNAMIC SECTIONS ---

app.get('/api/sections/:section', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT content FROM section_content WHERE section_name = ?', [req.params.section]);
		res.json(rows[0] ? rows[0].content : null);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/sections/:section', async (req, res) => {
	const content = req.body;
	try {
		await db.query('INSERT INTO section_content (section_name, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
			[req.params.section, JSON.stringify(content), JSON.stringify(content)]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

// --- CONTACT INFO ---

app.get('/api/contact', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM contact_info WHERE id = 1');
		res.json(rows[0]);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/contact', async (req, res) => {
	const { address, phone, email, mapUrl } = req.body;
	try {
		await db.query('INSERT INTO contact_info (id, address, phone, email, mapUrl) VALUES (1, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE address=?, phone=?, email=?, mapUrl=?',
			[address, phone, email, mapUrl, address, phone, email, mapUrl]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

// --- HOME DATA (PDF) ---

app.get('/api/home-data', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT pdf FROM home_data WHERE id = 1');
		res.json(rows[0] || { pdf: null });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/home-data', async (req, res) => {
	const { pdf } = req.body;
	try {
		await db.query('INSERT INTO home_data (id, pdf) VALUES (1, ?) ON DUPLICATE KEY UPDATE pdf = ?', [pdf, pdf]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

// --- NEW UPLOAD & IMAGE APIS ---

/**
 * POST /api/upload
 * Admin uploads image to server filesystem
 */
app.post('/api/upload', authenticateToken, authorizeRole(['admin', 'super_admin']), upload.single('image'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		const { filename, originalname } = req.file;
		// Store relative path for flexibility (consistent with static route)
		const filepath = `/uploads/${filename}`;

		await db.query('INSERT INTO uploaded_images (filename, filepath, original_name) VALUES (?, ?, ?)',
			[filename, filepath, originalname]);

		res.json({
			success: true,
			message: 'Image uploaded successfully',
			url: filepath,
			filename: filename
		});
	} catch (err) {
		console.error('Upload Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * GET /api/images
 * Fetch all uploaded animal URLs for users
 */
app.get('/api/images', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM uploaded_images ORDER BY createdAt DESC');
		res.json(rows);
	} catch (err) {
		console.error('Fetch Images Error:', err);
		res.status(500).json({ error: err.message });
	}
});

// --- PAGE MANAGEMENT SYSTEM ---

/**
 * GET /api/pages
 * Get all page configurations
 */
app.get('/api/pages', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM page_configurations ORDER BY page_name');
		res.json(rows);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * GET /api/pages/:pageName
 * Get specific page configuration with all sections and media
 */
app.get('/api/pages/:pageName', async (req, res) => {
	try {
		const [pageConfig] = await db.query('SELECT * FROM page_configurations WHERE page_name = ?', [req.params.pageName]);
		const [sections] = await db.query('SELECT * FROM page_sections WHERE page_name = ? ORDER BY section_order', [req.params.pageName]);
		const [media] = await db.query('SELECT * FROM page_media WHERE page_name = ? ORDER BY display_order', [req.params.pageName]);

		if (pageConfig.length === 0) {
			return res.status(404).json({ error: 'Page not found' });
		}

		res.json({
			config: pageConfig[0],
			sections: sections,
			media: media
		});
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * PUT /api/pages/:pageName/config
 * Update page configuration (colors, title, etc.)
 */
app.put('/api/pages/:pageName/config', async (req, res) => {
	const { display_title, primary_color, secondary_color, accent_color, background_color, text_color, heading_color, is_active } = req.body;
	try {
		await db.query(`UPDATE page_configurations 
			SET display_title = ?, primary_color = ?, secondary_color = ?, accent_color = ?, 
			    background_color = ?, text_color = ?, heading_color = ?, is_active = ?
			WHERE page_name = ?`,
			[display_title, primary_color, secondary_color, accent_color, background_color, text_color, heading_color, is_active, req.params.pageName]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * GET /api/pages/:pageName/sections
 * Get all sections for a page
 */
app.get('/api/pages/:pageName/sections', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM page_sections WHERE page_name = ? ORDER BY section_order', [req.params.pageName]);
		res.json(rows);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * POST /api/pages/:pageName/sections
 * Add a new section to a page
 */
app.post('/api/pages/:pageName/sections', async (req, res) => {
	const { section_key, section_title, section_content, section_order, is_visible } = req.body;
	try {
		await db.query(`INSERT INTO page_sections (page_name, section_key, section_title, section_content, section_order, is_visible) 
			VALUES (?, ?, ?, ?, ?, ?)`,
			[req.params.pageName, section_key, section_title, section_content, section_order || 0, is_visible !== false]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * PUT /api/pages/:pageName/sections/:sectionId
 * Update a section
 */
app.put('/api/pages/:pageName/sections/:sectionId', async (req, res) => {
	const { section_title, section_content, section_order, is_visible } = req.body;
	try {
		await db.query(`UPDATE page_sections 
			SET section_title = ?, section_content = ?, section_order = ?, is_visible = ?
			WHERE id = ? AND page_name = ?`,
			[section_title, section_content, section_order, is_visible, req.params.sectionId, req.params.pageName]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * DELETE /api/pages/:pageName/sections/:sectionId
 * Delete a section
 */
app.delete('/api/pages/:pageName/sections/:sectionId', async (req, res) => {
	try {
		await db.query('DELETE FROM page_sections WHERE id = ? AND page_name = ?', [req.params.sectionId, req.params.pageName]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * GET /api/pages/:pageName/media
 * Get all media for a page
 */
app.get('/api/pages/:pageName/media', async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM page_media WHERE page_name = ? ORDER BY display_order', [req.params.pageName]);
		res.json(rows);
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * POST /api/pages/:pageName/media
 * Add media to a page
 */
app.post('/api/pages/:pageName/media', async (req, res) => {
	const { media_key, media_type, media_url, media_title, media_description, display_order } = req.body;
	try {
		await db.query(`INSERT INTO page_media (page_name, media_key, media_type, media_url, media_title, media_description, display_order) 
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[req.params.pageName, media_key, media_type || 'image', media_url, media_title, media_description, display_order || 0]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * DELETE /api/pages/:pageName/media/:mediaId
 * Delete media from a page
 */
app.delete('/api/pages/:pageName/media/:mediaId', async (req, res) => {
	try {
		await db.query('DELETE FROM page_media WHERE id = ? AND page_name = ?', [req.params.mediaId, req.params.pageName]);
		res.json({ success: true });
	} catch (err) {
		console.error('API Error:', err);
		res.status(500).json({ error: err.message });
	}
});



// All other GET requests not handled before will return our React app
app.get(/(.*)/, (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Internal API: 5xx Error tracking handler must be the last middleware
app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
