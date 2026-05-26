## 2024-05-26 - Stop Polling!
**Learning:** Polling to update UI like cursor position using `setInterval` wastes CPU cycles when the application is idle, which violates the core performance budget of CPU Idle < 1%.
**Action:** Instead of `setInterval`, we should listen to the actual events that indicate a change, like selection changes in CodeMirror, and update the UI accordingly.
