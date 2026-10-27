-- Reorganise the admin sidebar to the Figma layout (School OS file, Screen / Dashboard 76:54336).
-- "Primary" renders without a heading, "School" holds running-the-school pages, and "Account"
-- moves into the user menu. Items with no page yet are hidden until their phase ships.

UPDATE navigation_items SET section_heading = 'Primary', sort_order = 10 WHERE surface = 'admin' AND key = 'dashboard';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 20 WHERE surface = 'admin' AND key = 'my-classes';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 25 WHERE surface = 'admin' AND key = 'my-children';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 30 WHERE surface = 'admin' AND key = 'attendance';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 40 WHERE surface = 'admin' AND key = 'students';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 50 WHERE surface = 'admin' AND key = 'guardians';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 60 WHERE surface = 'admin' AND key = 'homework';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 70 WHERE surface = 'admin' AND key = 'exams';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 75 WHERE surface = 'admin' AND key = 'test-planner';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 80 WHERE surface = 'admin' AND key = 'timetable';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Primary', sort_order = 90 WHERE surface = 'admin' AND key = 'ai-assist';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'School', sort_order = 10 WHERE surface = 'admin' AND key = 'admissions';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'School', sort_order = 20 WHERE surface = 'admin' AND key IN ('academics', 'academics-years', 'academics-grades', 'academics-sections');--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'School', sort_order = 30 WHERE surface = 'admin' AND key = 'teachers';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'School', sort_order = 40 WHERE surface = 'admin' AND key = 'members';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'School', sort_order = 50 WHERE surface = 'admin' AND key = 'organization';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Account', sort_order = 10 WHERE surface = 'admin' AND key = 'teacher-profile';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Account', sort_order = 20 WHERE surface = 'admin' AND key = 'account-profile';--> statement-breakpoint
UPDATE navigation_items SET section_heading = 'Account', sort_order = 30 WHERE surface = 'admin' AND key = 'account-security';--> statement-breakpoint
UPDATE navigation_items SET is_enabled = false WHERE surface = 'admin' AND href IS NULL AND parent_id IS NULL AND key IN ('announcements', 'fees', 'roles', 'integrations', 'help', 'system');
