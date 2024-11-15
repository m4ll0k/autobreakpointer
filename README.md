# AutoBreakpointer

AutoBreakpointer is a Chrome DevTools Protocol based tool that automatically sets breakpoints for specified strings or patterns in JavaScript code. It's particularly useful for debugging and monitoring specific JavaScript functions or properties across multiple files when you test your targets!

## Installation

```bash
git clone https://github.com/m4ll0k/autobreakpointer.git
cd autobreakpointer
npm install
```

## Usage

### CLI Usage
```bash
# Track specific string
node src/autobreakpointer.js "document.cookie"

# Default tracking location.search
node src/autobreakpointer.js
```

### Programmatic Usage
```javascript
const AutoBreakpointer = require('./src/autobreakpointer');

const debugger = new AutoBreakpointer({
    target: 'localStorage.getItem',
    autoResume: true,
    caseSensitive: true,
    jsFilesOnly: true,
    urlPattern: '.js'
});

debugger.start();
```

## Configuration Options

- `target`: String to track (default: 'location.search')
- `autoResume`: Automatically resume after hitting breakpoint (default: false)
- `caseSensitive`: Case sensitive search (default: true)
- `jsFilesOnly`: Only track .js files (default: true)
- `urlPattern`: File pattern to match (default: '.js')

## Requirements

- Node.js >= 12
- Chrome/Chromium browser
- chrome-remote-interface

## License

MIT