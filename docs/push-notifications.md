# Push notifications

Final Approach uses the standard Web Push protocol. The remote application does not receive or store the UUID or secret of the administrative PHP API.

## Server requirements

- HTTPS for the complete remote application
- PHP 8.0 or newer
- PHP OpenSSL and cURL extensions
- Write access for PHP in the application directory
- Outgoing HTTPS connections to the browser push services

The server creates its VAPID key pair and the subscription storage on first use. The generated `.push-vapid.php`, `.push-subscriptions.php`, and `.push-events.php` files contain executable PHP return statements instead of public JSON. They must not be copied between unrelated installations and should be included in server backups.

## Deployment

1. Build the current application.
2. Download the newly generated API file in Settings and replace the existing UUID-named PHP API on the remote server.
3. Use **Upload UI** in Settings. This uploads `push.php`, `push-support.php`, and `push-sw.js` together with the remote application.
4. Open a preacher overview over HTTPS and accept the subscription prompt.

The fixed `push.php` endpoint only registers and removes browser subscriptions. It validates same-origin requests, accepts only numeric preacher overview identifiers, and restricts outgoing push destinations to known browser push services. Sending notifications remains restricted to the UUID-named administrative API and its `X-API-KEY`.

## Behavior

- A browser push subscription belongs to exactly one preacher overview. Subscribing to another overview replaces the previous assignment.
- The all-territories overview cannot be subscribed to.
- The remote user can unsubscribe from the overview toolbar.
- A new assignment is sent after the next successful synchronization.
- An active assignment older than twelve months produces one polite reminder per assignment. Server-side event IDs prevent duplicates during later synchronizations.

Push delivery is best effort. Browsers may delay messages, and expired subscriptions are removed after the push service reports them as gone.
