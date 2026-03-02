const db = require('./db');

async function seed() {
	console.log('Starting Seeding Process...');

	try {
		// Sections commonly used in the app (matches GalleryManagement.jsx and other frontend components)
		const sections = ['child', 'primary', 'school', 'juniorCollege'];
		const contentSections = ['about', 'admission', 'infrastructure', 'rnd', 'student-life', 'nep'];

		// 1. Seed Admin Users (adding 9 more for total 10)
		console.log('Seeding Admin Users...');
		for (let i = 1; i <= 9; i++) {
			const id = Date.now() + i;
			await db.query('INSERT IGNORE INTO admin_users (id, username, password) VALUES (?, ?, ?)',
				[id, `admin${i}`, `pass${i}123`]);
		}

		// 2. Seed Announcements (10 entries)
		console.log('Seeding Announcements...');
		for (let i = 1; i <= 10; i++) {
			const id = Date.now() + i + 100;
			const section = sections[i % sections.length];
			await db.query('INSERT INTO announcements (id, section, text, active) VALUES (?, ?, ?, ?)',
				[id, section, `Important Announcement #${i} for ${section} stage. Please check the notice board for details.`, i % 2 === 0]);
		}

		// 3. Seed Gallery (10 entries)
		console.log('Seeding Gallery...');
		for (let i = 1; i <= 10; i++) {
			const id = Date.now() + i + 200;
			const section = sections[i % sections.length];
			await db.query('INSERT INTO gallery (id, section, title, src) VALUES (?, ?, ?, ?)',
				[id, section, `Gallery Image ${i}`, `https://picsum.photos/seed/${id}/800/600`]);
		}

		// 4. Seed News Carousel (10 entries)
		console.log('Seeding News Carousel...');
		for (let i = 1; i <= 10; i++) {
			const id = Date.now() + i + 300;
			const section = sections[i % sections.length];
			await db.query('INSERT INTO news_carousel (id, section, title, src) VALUES (?, ?, ?, ?)',
				[id, section, `Breaking News ${i}`, `https://picsum.photos/seed/${id + 50}/800/400`]);
		}

		// 5. Seed Leads (10 entries)
		console.log('Seeding Leads...');
		for (let i = 1; i <= 10; i++) {
			const id = Date.now() + i + 400;
			const name = ['Rahul Shinde', 'Sneha Patil', 'Amit Kumar', 'Priya Singh', 'Vikram Rao'][i % 5];
			const email = `contact${i}@example.com`;
			const phone = `987654321${i % 10}`;
			const extraData = JSON.stringify({ message: `I am interested in the ${sections[i % 4]} program.`, source: 'website' });
			await db.query('INSERT INTO leads (id, name, email, phone, data) VALUES (?, ?, ?, ?, ?)',
				[id, name, email, phone, extraData]);
		}

		// 6. Seed Admission Inquiries (10 entries)
		console.log('Seeding Admission Inquiries...');
		const statuses = ['New', 'Contacted', 'Pending', 'Closed'];
		for (let i = 1; i <= 10; i++) {
			const id = Date.now() + i + 500;
			const status = statuses[i % statuses.length];
			const detailData = JSON.stringify({
				studentName: `Student ${i}`,
				parentName: `Parent ${i}`,
				grade: 5 + (i % 5),
				previousSchool: 'Green Valley School'
			});
			await db.query('INSERT INTO admission_inquiries (id, status, data) VALUES (?, ?, ?)',
				[id, status, detailData]);
		}

		// 7. Seed Dynamic Sections (10 entries - covering main sections)
		console.log('Seeding Dynamic Sections...');
		for (const sec of contentSections) {
			const content = {
				title: `${sec.toUpperCase()} Section`,
				description: `This is fake content for the ${sec} section of MTDK School. It contains information about our values, history, and goals for the future.`,
				items: [
					{ id: 1, title: 'Introduction', text: 'Welcome to our school.' },
					{ id: 2, title: 'Key Highlights', text: 'Excellence in education and sports.' }
				]
			};
			await db.query('INSERT INTO section_content (section_name, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
				[sec, JSON.stringify(content), JSON.stringify(content)]);
		}

		// 8. Seed Uploaded Images (10 entries)
		console.log('Seeding Uploaded Images...');
		for (let i = 1; i <= 10; i++) {
			const filename = `fake_image_${i}.jpg`;
			const filepath = `/uploads/fake_image_${i}.jpg`;
			const original_name = `Original_Pic_${i}.jpg`;
			await db.query('INSERT INTO uploaded_images (filename, filepath, original_name) VALUES (?, ?, ?)',
				[filename, filepath, original_name]);
		}

		console.log('Seeding Completed Successfully!');
		process.exit(0);
	} catch (err) {
		console.error('Seeding Failed:', err);
		process.exit(1);
	}
}

seed();
