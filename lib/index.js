/**
 * Host half of dsh-chat-background.
 *
 * The visible work happens in the browser: `lib/client.js` is declared through
 * `dsh.client` in package.json, so the Web shell loads it as a client plugin
 * and it mounts the wallpaper layer plus its control panel. This host entry
 * only has to exist so the bundle owns a Loader row (and so disabling the row
 * disables the browser half with it).
 */

export const name = 'dsh-chat-background';

export function apply() {
  // Intentionally empty: no host services are needed.
}
