-- Add the gradebook (report cards) to the sidebar, after tests and exams (Figma 77:90702).
INSERT INTO navigation_items (key, label, href, icon_key, section_heading, required_permission, sort_order, surface, visible_to_roles)
VALUES ('gradebook', 'Gradebook', '/admin/gradebook', 'mortarboard', 'Primary', 'assessments.read', 72, 'admin',
	ARRAY['owner', 'principal', 'admin', 'vice_principal', 'teacher'])
ON CONFLICT (surface, key) DO NOTHING;
