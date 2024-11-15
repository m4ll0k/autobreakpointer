/**
 * AutoBreakpointer
 * Automated JavaScript Debugging Tool using Chrome DevTools Protocol
 * Automatically sets breakpoints for specified strings/patterns in JavaScript code
 * Version: beta 1.0.0
 * License: MIT
 */


/** usage:
 * run: google-chrome --remote-debugging-port=9222
 * then: node autobreakpointer "location.search"
 */

const CDP = require('chrome-remote-interface');

class AutoBreakpointer {
    constructor(options = {}) {
        this.existingBreakpoints = new Set();
        this.client = null;
        this.config = {
            target: options.target || 'location.search',
            caseSensitive: options.caseSensitive || true,
            autoResume: options.autoResume || false,
            jsFilesOnly: options.jsFilesOnly || true,
            urlPattern: options.urlPattern || '.js'
        };
    }

    async connect() {
        try {
            this.client = await CDP();
            const { Debugger, Runtime } = this.client;

            await Promise.all([
                Debugger.enable(),
                Runtime.enable()
            ]);

            console.log(`AutoBreakpointer: Initialized for "${this.config.target}"`);
            return true;
        } catch (error) {
            console.error('AutoBreakpointer: Connection error:', error);
            return false;
        }
    }

    async start() {
        if (!await this.connect()) {
            return;
        }

        const { Debugger, Runtime } = this.client;

        Debugger.scriptParsed(async (script) => {
            if (!this.config.jsFilesOnly || script.url.endsWith(this.config.urlPattern)) {
                console.log('Script detected:', script.url);
                try {
                    const searchResult = await Debugger.searchInContent({
                        scriptId: script.scriptId,
                        query: this.config.target,
                        caseSensitive: this.config.caseSensitive,
                        isRegex: false
                    });

                    if (searchResult.result?.length > 0) {
                        console.log('Match found:', searchResult);
                        for (const match of searchResult.result) {
                            await this.setBreakpoint(script, match);
                        }
                    }
                } catch (error) {
                    if (!error.message.includes('already exists')) {
                        console.error('AutoBreakpointer: Search error:', error);
                    }
                }
            }
        });

        Debugger.paused(async ({ callFrames }) => {
            await this.handleBreakpoint(callFrames);
        });

        this.setupCleanup();
    }

    async setBreakpoint(script, match) {
        const { Debugger } = this.client;
        const { lineNumber, lineContent } = match;
        const columnNumber = lineContent.indexOf(this.config.target);
        const breakpointKey = `${script.url}-${lineNumber}-${columnNumber}`;

        if (!this.existingBreakpoints.has(breakpointKey)) {
            try {
                const breakpoint = await Debugger.setBreakpointByUrl({
                    urlRegex: script.url,
                    lineNumber: lineNumber,
                    columnNumber: columnNumber
                });

                this.existingBreakpoints.add(breakpointKey);

                console.log({
                    message: 'AutoBreakpointer: New breakpoint set',
                    scriptId: script.scriptId,
                    line: lineNumber,
                    column: columnNumber,
                    breakpointId: breakpoint.breakpointId,
                    code: lineContent.trim(),
                    url: script.url
                });
            } catch (error) {
                console.error('AutoBreakpointer: Breakpoint error:', error);
            }
        }
    }

    async handleBreakpoint(callFrames) {
        const { Runtime, Debugger } = this.client;
        const frame = callFrames[0];

        try {
            const valueResult = await Runtime.evaluate({
                expression: this.config.target
            }).catch(() => ({ result: { value: 'Unable to evaluate' } }));

            console.log('AutoBreakpointer: Break', {
                url: frame.url,
                line: frame.location.lineNumber,
                column: frame.location.columnNumber,
                value: valueResult.result.value,
                target: this.config.target,
                stackTrace: this.formatStackTrace(callFrames)
            });

            if (this.config.autoResume) {
                await Debugger.resume();
            }
        } catch (error) {
            console.error('AutoBreakpointer: Evaluation error:', error);
        }
    }

    formatStackTrace(callFrames) {
        return callFrames.map(frame => ({
            functionName: frame.functionName || '<anonymous>',
            url: frame.url,
            line: frame.location.lineNumber,
            column: frame.location.columnNumber
        }));
    }

    setupCleanup() {
        process.on('SIGINT', async () => {
            if (this.client) {
                const { Debugger } = this.client;
                console.log('\nAutoBreakpointer: Cleaning up...');
                
                for (const breakpointKey of this.existingBreakpoints) {
                    try {
                        const [url, line, column] = breakpointKey.split('-');
                        await Debugger.removeBreakpoint({
                            breakpointId: `${url}:${line}:${column}`
                        });
                    } catch (error) {
                        console.log('AutoBreakpointer: Cleanup error:', error);
                    }
                }
                
                await this.client.close();
                console.log('AutoBreakpointer: Shutdown complete');
            }
            process.exit();
        });
    }
}

// CLI handling
if (require.main === module) {
    const target = process.argv[2] || 'location.search';
    const options = {
        target,
        autoResume: false,
        caseSensitive: true,
        jsFilesOnly: true
    };

    const breakpointer = new AutoBreakpointer(options);
    breakpointer.start();
}

module.exports = AutoBreakpointer;