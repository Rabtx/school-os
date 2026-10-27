-- Organization becomes Settings (Figma 77:89099); members now live inside it.
UPDATE navigation_items
SET label = 'Settings', icon_key = 'settings', href = '/admin/settings'
WHERE surface = 'admin' AND key = 'organization';
--> statement-breakpoint
UPDATE navigation_items
SET is_enabled = false
WHERE surface = 'admin' AND key = 'members';
