# Publishing localized announcements

Edit the matching file in `public/updates/`: `en.json`, `pl.json`, `de.json`, `es.json`, or `fr.json`. The app fetches only the language selected in interface settings and immediately switches feeds when that setting changes.

Each entry has `id`, `date` (YYYY-MM-DD), `title`, and `body`. Use the same ID for translations of the same announcement: read status is shared across languages. Use a new unique ID for each new release. Keep no more than 200 entries per language. An announcement with no translation in a language should be omitted from that language's file; it will not fall back to another language.

Publish the files with the app. The notifications popup checks on page load, on window focus, once per minute while visible, and when Refresh is pressed. Content is plain text. Travel data is never changed. Read status is local to the browser.

The old `public/updates.json` is retained solely for older deployed clients. New announcements should be added to the language files. You can ask the assistant to add a notification and its translations before publishing.
