# BananaBurner Changelog - 2026-02-02

## Script v2.3
## Extension v2979.0.5

The extension update check is now automatic! Check the popup for update notifications.

### Script Updates:
- **Quick Actions System**: New Presets (Webhooks, Notifications, Settings), and Server pinning.
- **Server Actions**: Real-time status indicators (Running/Starting/Pending/Offline) for pinned servers. Clicking a server action opens details modal.
- **Webhooks UI**: Integration for Webhooks (Create/Delete) in the profile modal.
- **Improved Editor**: Added Lightweight Editor (CodeJar) toggle in settings. Fixed Monaco scrolling responsiveness.
- **Network Stats**: Network Inbound/Outbound stats in server details modal.
- **OSRC Sync**: Extension popup toggle now correctly synchronizes OSRC state with local storage to prevent background script conflicts.
- **Auto-Update System**: Background check for extension updates via GitHub.
- **Settings**: added debug and QUIC (experimental) settings for development and testing.
- **Server Console**: Persists for longer if OverrideSRC is enabled and the popup is closed.
- **Other**

### Script Bug Fixes:
- Fixed Server Quick Action popup data mapping.
- Fixed Webhooks delete button functionality and empty-state reporting.
- Fixed Quick Action loading animation layout glitches.
- Reverted server modal status badges to original orange for Pending status.
- Added handling for missing/deleted servers in Quick Actions.
- Fixed server console and PiP console bugs.
- Other

Other extension updates and bug fixes.
