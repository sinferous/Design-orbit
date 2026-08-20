-- Seed Data for Creative Team Work Tracker

-- 1. SEED WORK TYPES
INSERT INTO public.work_types (name) VALUES
    ('Static'),
    ('Video'),
    ('Mobile App'),
    ('Landing Page'),
    ('Website'),
    ('UI/UX'),
    ('Logo'),
    ('Edits'),
    ('Working'),
    ('Other')
ON CONFLICT (name) DO NOTHING;

-- 2. SEED INITIAL TEAM MEMBERS WITH EXACT DESIGNATIONS AND EMAILS
INSERT INTO public.profiles (name, designation, email) VALUES
    ('Admin', 'System Administrator', 'admin@webtreeonline.com'),
    ('Varun', 'Graphic Designer', 'varun@webtreeonline.com'),
    ('Moveena', 'Senior Graphic Designer', 'moveena@webtreeonline.com'),
    ('Shashiraj', 'Graphic Designer', 'shashiraj@webtreeonline.com'),
    ('Prasanna Lakshmi', 'Graphic Designer', 'prasanna@webtreeonline.com'),
    ('Samantha', 'Design Team Lead', 'sams@webtreeonline.com'),
    ('Fazil', 'Senior UI/UX Designer', 'fazil@webtreeonline.com'),
    ('Gajesh', 'UI/UX Designer', 'gajesh@webtreeonline.com')
ON CONFLICT DO NOTHING;

-- 3. SEED REAL CLIENT LIST
INSERT INTO public.clients (name) VALUES
    ('Alsaraya'),
    ('Webtree'),
    ('Longveia'),
    ('2am idea'),
    ('Shaheen group'),
    ('Ghumpa'),
    ('Voro'),
    ('Tectory'),
    ('Shamsha'),
    ('Larosa'),
    ('Alrosta'),
    ('Abdulhameed'),
    ('Allday'),
    ('Shaheen'),
    ('Calibar sports'),
    ('Farhat'),
    ('Priyadarshini'),
    ('Easy lease'),
    ('Ybyf'),
    ('Vivant dental'),
    ('All day market'),
    ('Amwaj'),
    ('Farhat tours'),
    ('Cruise'),
    ('Cruise sm'),
    ('Amaron'),
    ('Internal Project'),
    ('Design Orbit')
ON CONFLICT (name) DO NOTHING;
