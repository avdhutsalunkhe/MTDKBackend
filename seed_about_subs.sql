-- Add specialized About pages
INSERT IGNORE INTO page_configurations (page_name, display_title, primary_color) VALUES 
('about-pre-primary', 'About Pre-Primary', '#E91E63'),
('about-primary', 'About Primary', '#4CAF50'),
('about-school', 'About School', '#2196F3'),
('about-junior-college', 'About Junior College', '#FFC107');

-- Pre-fill seed data
INSERT IGNORE INTO page_sections (page_name, section_key, section_title, section_content, section_order) VALUES
('about-pre-primary', 'msg', 'Principal Message', 'Welcome to our Pre-Primary section.', 1),
('about-primary', 'msg', 'Principal Message', 'Welcome to our Primary section.', 1),
('about-school', 'msg', 'Principal Message', 'Welcome to our Secondary School.', 1),
('about-junior-college', 'msg', 'Principal Message', 'Welcome to our Junior College.', 1);
