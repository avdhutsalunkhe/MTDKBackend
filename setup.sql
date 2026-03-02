-- MTDK Database Schema Setup
-- Use this script to create tables in your existing database.


-- Admin Credentials (Super Admin)
CREATE TABLE IF NOT EXISTS super_admin (
    id INT PRIMARY KEY DEFAULT 1,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Admin Users (Normal Admins)
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Default Admin
INSERT IGNORE INTO admin_users (id, username, password) VALUES (1700000000000, 'admin', 'admin123');

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('superadmin', 'admin', 'user') NOT NULL DEFAULT 'user',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Failed Login Attempts
CREATE TABLE IF NOT EXISTS failed_logins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    username VARCHAR(255),
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id BIGINT PRIMARY KEY,
    section VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Gallery
CREATE TABLE IF NOT EXISTS gallery (
    id BIGINT PRIMARY KEY,
    section VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    src LONGTEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- News Carousel
CREATE TABLE IF NOT EXISTS news_carousel (
    id BIGINT PRIMARY KEY,
    section VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    src LONGTEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Home Data (PDF etc)
CREATE TABLE IF NOT EXISTS home_data (
    id INT PRIMARY KEY DEFAULT 1,
    pdf LONGTEXT
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
    id BIGINT PRIMARY KEY,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    data JSON
);

-- Admission Inquiries
CREATE TABLE IF NOT EXISTS admission_inquiries (
    id BIGINT PRIMARY KEY,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'New',
    data JSON
);

-- Annual Content
CREATE TABLE IF NOT EXISTS annual_content (
     id INT PRIMARY KEY DEFAULT 1,
     principal_name VARCHAR(255),
     principal_designation VARCHAR(255),
     message_title VARCHAR(255),
     message_content TEXT,
     principal_photo LONGTEXT,
     magazine_title VARCHAR(255),
     magazine_description TEXT,
     magazine_cover LONGTEXT,
     magazine_pdf LONGTEXT
);

-- Add new columns if they don't exist (for existing databases)
-- ALTER TABLE annual_content ADD COLUMN IF NOT EXISTS magazine_title VARCHAR(255);
-- ALTER TABLE annual_content ADD COLUMN IF NOT EXISTS magazine_pdf LONGTEXT;

-- Dynamic Section Content
CREATE TABLE IF NOT EXISTS section_content (
    section_name VARCHAR(100) PRIMARY KEY,
    content JSON
);

-- Contact Info
CREATE TABLE IF NOT EXISTS contact_info (
    id INT PRIMARY KEY DEFAULT 1,
    address TEXT,
    phone VARCHAR(100),
    email VARCHAR(255),
    mapUrl TEXT
);

-- Uploaded Images (Filesystem tracking)
CREATE TABLE IF NOT EXISTS uploaded_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    filepath TEXT NOT NULL,
    original_name VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
