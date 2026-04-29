# BananaBurner Changelog - 2026-04-30

## Script v3.5
## Extension v2979.1.3

### Extension:
- Modified login page
   - added checkbox that disables joining the bot-hosting support Discord server on login, enabled by default.
   - modified other parts of the login page
- Fixed bug where if the extension was enabled, you weren't able to  upload files from the pterodactyl  panel but only from BananaBurner
- Other

### Script:
- Webhook Relays:
  - route events through BananaBurner and customize  the events you receive.
  - Profile Popup -> Webhooks -> Create new webhook -> input Discord webhook url, select both Discord and Relay, click the ``i`` icon for more information. After setup you can click config to customize it.
  - For those who don't want to setup their own webserver to customize these webhooks.
- Modified theme engine
  - can add custom primary and secondary fonts to themes via link
  - can now customize the console font (custom font supported here too)
  - light mode navbar background color change
  - other
- added theme change animation when installing a theme from Markett
- DevMode updates:
  - exposed state, navigateTo, updateCoinCollectorUI & updateMainContent to devtools console
  - right click will open browser's native context menu if CTRL is also held
- Ability to re-arrange navbar items:
  - hold any navbar item for example the  "Dashboard" button and drag mode should trigger, now you  can click and drag them around, once done, click anywhere else to stop drag mode
  - right click any navbar item and click "Reset Order" to reset the positions back to default
- Modified UI for Themes/Plugins cards in Market
- Market local tab changes
- URL type quick actions can now be edited
  - Right Click URL quick action -> "Edit"
- Modified coin collector ad space to occupy the complete spot
  - screens smaller than 1440x900 won't show the info text about the coin collector
  - coin collector info text will only be shown once ever unless reset
- fixed coin collector attempt counter
- CAPTCHA now submits automatically after completion
  - submit button will be visible as a fallback.
- Updated Node/Python server detection
- Added "All" to time filter in activity section on Dashboard.
- Primary code editor fixes
- Server name change should reflect immediately now
- More theme engine parity
- Plugin framework updates
- Telemetry payload adjustments
- UI adjustments
- Bug fixes and improvements
- Other

**PLUGIN UPDATES:**
- Git:
  - Now requires v3.5
  - Bug fixes
  - Other
- Bulk server manager:
  - Modified UI
- Other

**NEW THEMES:**
- Shrimp   (light) - *requires v3.4+*
- Darkness   (dark) - *requires v3.5+*

Update by reinstalling the extension

If there are any issues, let us know about it on Discord @agentzzrp or @paccman_0!<br>
Release #24 stable, some features are unavailable for userscript users.
