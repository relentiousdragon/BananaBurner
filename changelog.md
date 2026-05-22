# BananaBurner Changelog - 2026-05-22

## Script v3.7
## Extension v2979.1.4

### Script:
- Reactive UI
  - All state changes will update UI immediately, you can notice this by viewing server details then looking at the power dot, or the state of a server type quick action, etc.
- using IndexedDB for cached stuff
  - plugins, images, etc
  - reduced quota hits on localstorage
  - all installed plugins will be automatically moved
- Can submit themes/plugins to the market
  - from the Market tab
  - all content will be tested and reviewed by a developer and accepted/rejected
  - max submissions are 3
- Optimized startup
- Stability Improvements
- Coin collector fixes
- Market UI changes
- Replaced all instances of old reload icon with new animated one
- **Automatic Updates!!!**
  - the script will download new versions automatically to boot from
  - i will limit the number of extension updates so you don't have to manually update the extension
- Uses a bootloader for version load from IndexedDB
- Append query param ?safeMode=true to the url bar to boot bundled version in case of any problems
- **DEV MODE Updates**:
  - Ability to set boot version
      - Latest > Bundled : Prioritizes latest version if available, fallback to bundled (default)
      - Canary > Bundled : If you are granted beta tester privileges, this option will be available
           - it loads the canary script from the market server on each boot, it's not cached.
           - Loaded canary script is obfuscated until release
       - Bundled (vX.X) : boots the bundled version
       - Cached (vX.X) : select a specific cached version, up to a max of last 3 versions downloaded will be cached
   - Other
- BananaBurner Auth
  - BananaBurner now requires a login of its own via Discord to access marketplace and to verify telemetry, if you have telemetry disabled, this will not bother you.
  - Upon BananaBurner Auth, a Discord app will be added to your profile, you can use </me:1505152270197592160> to view your telemetry info.
  - Market downloads will only increment if logged in users download them
  - Telemetry from all versions below v3.7 will be rejected
  - Other
- Plugin Documentation updated
- More theme engine parity
- Plugin framework updates
- Telemetry payload adjustments
- UI adjustments
- Bug fixes and improvements
- Other

**PLUGIN UPDATES:**
- Pacman
  - Fix compatibility with v3.7
  - raised version requirement to v3.7
- Other

**NEW THEMES:**
- BananaBurner 2077 (dark)  - *requires v3.7+*
- GREEN (light) - *requires v3.7+*


Update by reinstalling the extension

^ This should probably be the last time you have to manually update the extension, automatic updates are here!!

If there are any issues, let us know about it on Discord @agentzzrp or @paccman_0!<br>
Release #26 stable, some features are unavailable for userscript users.
