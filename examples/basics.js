const AutoBreakpointer = require('../src/autobreakpointer');

// Example 1: Basic usage with default settings
const basic = new AutoBreakpointer({
    target: 'console.log'
});
basic.start();

// Example 2: Advanced configuration
const advanced = new AutoBreakpointer({
    target: 'localStorage.getItem',
    autoResume: true,
    caseSensitive: true,
    jsFilesOnly: true,
    urlPattern: '.js'
});
advanced.start();