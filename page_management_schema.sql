-- Page Management System with Color Palettes
-- This schema allows superadmin to manage multiple pages with customizable colors and content

-- Page Configurations (stores color palettes and basic settings for each page)
CREATE TABLE IF NOT EXISTS page_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_name VARCHAR(100) UNIQUE NOT NULL,
    display_title VARCHAR(255),
    primary_color VARCHAR(20) DEFAULT '#EC6431',
    secondary_color VARCHAR(20) DEFAULT '#FF8A65',
    accent_color VARCHAR(20) DEFAULT '#FFA726',
    background_color VARCHAR(20) DEFAULT '#FFFFFF',
    text_color VARCHAR(20) DEFAULT '#333333',
    heading_color VARCHAR(20) DEFAULT '#1A1A1A',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Page Sections (stores content sections for each page)
CREATE TABLE IF NOT EXISTS page_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_name VARCHAR(100) NOT NULL,
    section_key VARCHAR(100) NOT NULL,
    section_title VARCHAR(255),
    section_content LONGTEXT,
    section_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_page_section (page_name, section_key),
    FOREIGN KEY (page_name) REFERENCES page_configurations(page_name) ON DELETE CASCADE
);

-- Page Media (stores images and videos for each page)
CREATE TABLE IF NOT EXISTS page_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_name VARCHAR(100) NOT NULL,
    media_key VARCHAR(100) NOT NULL,
    media_type ENUM('image', 'video', 'pdf') DEFAULT 'image',
    media_url LONGTEXT,
    media_title VARCHAR(255),
    media_description TEXT,
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (page_name) REFERENCES page_configurations(page_name) ON DELETE CASCADE
);

-- Insert default page configurations
INSERT IGNORE INTO page_configurations (page_name, display_title, primary_color, secondary_color, accent_color) VALUES
('about-us', 'About Us', '#EC6431', '#FF8A65', '#FFA726'),
('admission', 'Admission', '#4CAF50', '#66BB6A', '#81C784'),
('infrastructure', 'Infrastructure', '#2196F3', '#42A5F5', '#64B5F6'),
('nep-2020', 'NEP 2020', '#9C27B0', '#AB47BC', '#BA68C8'),
('research-development', 'Research & Development', '#FF5722', '#FF7043', '#FF8A65'),
('student-life', 'Student Life', '#FFC107', '#FFD54F', '#FFE082'),
('contact-info', 'Contact Information', '#607D8B', '#78909C', '#90A4AE');

-- Insert default sections for About Us page
INSERT IGNORE INTO page_sections (page_name, section_key, section_title, section_content, section_order) VALUES
('about-us', 'hero', 'Welcome to MTDK', 'Matoshree Tanubai Dagadu Khade Educational Campus - Empowering minds, shaping futures.', 1),
('about-us', 'mission', 'Our Mission', 'To provide quality education and holistic development to every student.', 2),
('about-us', 'vision', 'Our Vision', 'To be a leading educational institution recognized for excellence and innovation.', 3),
('about-us', 'history', 'Our History', 'Founded with a vision to transform education in the region.', 4);

-- Insert default sections for Admission page
INSERT IGNORE INTO page_sections (page_name, section_key, section_title, section_content, section_order) VALUES
('admission', 'hero', 'Admissions Open', 'Join our vibrant learning community. Applications are now open for the upcoming academic year.', 1),
('admission', 'process', 'Admission Process', 'Simple and transparent admission process designed for your convenience.', 2),
('admission', 'eligibility', 'Eligibility Criteria', 'Check the eligibility requirements for different programs.', 3),
('admission', 'documents', 'Required Documents', 'List of documents needed for the admission process.', 4);

-- Insert default sections for Infrastructure page
INSERT IGNORE INTO page_sections (page_name, section_key, section_title, section_content, section_order) VALUES
('infrastructure', 'hero', 'World-Class Infrastructure', 'State-of-the-art facilities designed to enhance learning experiences.', 1),
('infrastructure', 'classrooms', 'Smart Classrooms', 'Modern classrooms equipped with the latest technology.', 2),
('infrastructure', 'labs', 'Laboratories', 'Well-equipped science, computer, and language labs.', 3),
('infrastructure', 'sports', 'Sports Facilities', 'Comprehensive sports infrastructure for physical development.', 4);

-- Insert default sections for NEP 2020 page
INSERT IGNORE INTO page_sections (page_name, section_key, section_title, section_content, section_order) VALUES
('nep-2020', 'hero', 'NEP 2020 Implementation', 'Leading the way in implementing the National Education Policy 2020.', 1),
('nep-2020', 'overview', 'Policy Overview', 'Understanding the transformative changes in Indian education.', 2),
('nep-2020', 'implementation', 'Our Implementation', 'How we are integrating NEP 2020 into our curriculum.', 3),
('nep-2020', 'benefits', 'Benefits for Students', 'Advantages of the new education policy for learners.', 4);

-- Insert default sections for R&D page
INSERT IGNORE INTO page_sections (page_name, section_key, section_title, section_content, section_order) VALUES
('research-development', 'hero', 'Research & Development', 'Fostering innovation and research excellence.', 1),
('research-development', 'projects', 'Ongoing Projects', 'Current research initiatives and projects.', 2),
('research-development', 'publications', 'Publications', 'Research papers and publications by our faculty and students.', 3),
('research-development', 'collaborations', 'Collaborations', 'Partnerships with industry and academic institutions.', 4);

-- Insert default sections for Student Life page
INSERT IGNORE INTO page_sections (page_name, section_key, section_title, section_content, section_order) VALUES
('student-life', 'hero', 'Vibrant Student Life', 'Experience a rich and diverse campus life.', 1),
('student-life', 'clubs', 'Clubs & Activities', 'Join various clubs and extracurricular activities.', 2),
('student-life', 'events', 'Events & Festivals', 'Annual events, cultural festivals, and celebrations.', 3),
('student-life', 'support', 'Student Support', 'Counseling, mentoring, and support services.', 4);

-- Insert default sections for Contact Info page
INSERT IGNORE INTO page_sections (page_name, section_key, section_title, section_content, section_order) VALUES
('contact-info', 'hero', 'Get in Touch', 'We are here to help. Reach out to us anytime.', 1),
('contact-info', 'address', 'Our Location', 'Visit us at our campus.', 2),
('contact-info', 'timings', 'Office Hours', 'Monday to Saturday: 9:00 AM - 5:00 PM', 3),
('contact-info', 'departments', 'Department Contacts', 'Contact information for different departments.', 4);
