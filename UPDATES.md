# Publishing app announcements

Edit `public/updates.json` to publish an announcement with the next deployment. Add a new object at the start of the array with a unique `id`, an ISO `date` (`YYYY-MM-DD`), a `title` and a `body`. Keep the newest 200 entries at most. Never reuse an ID for a new announcement: unread status is tracked by ID.

The Notifications tab retrieves this public feed on opening, on window focus and once per minute while the page is visible. The Refresh button checks immediately. Read status stays in the current browser; announcements never modify travel data. No browser push permission is required. Text is rendered as plain text, not HTML.

To localize an announcement, use its title and body as keys in `src/lib/translations.json`. Without a translation, the original text is displayed.

For example, ask: “Add an update notification titled … with the text …”, then publish the updated application. Notifications reach visitors of the deployed version; local changes only reach devices using the local server.
