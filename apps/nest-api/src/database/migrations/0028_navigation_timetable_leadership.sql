-- Leadership can now open class timetables (Figma 77:73662); teachers keep their own view.
UPDATE navigation_items
SET visible_to_roles = ARRAY['owner', 'principal', 'admin', 'vice_principal', 'teacher']
WHERE surface = 'admin' AND key = 'timetable';
