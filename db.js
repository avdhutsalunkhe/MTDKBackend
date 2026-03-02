const mysql = require('mysql2');
require('dotenv').config();

const pool = process.env.MYSQL_URL
	? mysql.createPool(process.env.MYSQL_URL)
	: mysql.createPool({
		host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
		user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
		password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'user',
		database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'mtdk_db',
		port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
		multipleStatements: true
	});

module.exports = pool.promise();
