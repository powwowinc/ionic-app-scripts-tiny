"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var errors_1 = require("../util/errors");
var Logger = (function () {
    function Logger(scope) {
        this.start = Date.now();
        this.scope = scope;
        var msg = scope + " started";
        Logger.info(msg);
    }
    Logger.prototype.ready = function (color, bold) {
        this.completed('ready', color, bold);
    };
    Logger.prototype.finish = function (color, bold) {
        this.completed('finished', color, bold);
    };
    Logger.prototype.completed = function (type, color, bold) {
        var duration = Date.now() - this.start;
        var time;
        if (duration > 1000) {
            time = 'in ' + (duration / 1000).toFixed(2) + ' s';
        }
        else {
            var ms = parseFloat((duration).toFixed(3));
            if (ms > 0) {
                time = 'in ' + duration + ' ms';
            }
            else {
                time = 'in less than 1 ms';
            }
        }
        var msg = this.scope + " " + type;
        msg += ' ' + time;
        Logger.info(msg);
    };
    Logger.prototype.fail = function (err) {
        if (err) {
            if (err instanceof errors_1.IgnorableError) {
                return;
            }
            if (err instanceof errors_1.BuildError) {
                var failedMsg = this.scope + " failed";
                if (err.message) {
                    failedMsg += ": " + err.message;
                }
                if (!err.hasBeenLogged) {
                    Logger.error("" + failedMsg);
                    err.hasBeenLogged = true;
                }
                return err;
            }
        }
        return err;
    };
    Logger.prototype.setStartTime = function (startTime) {
        this.start = startTime;
    };
    /**
     * Does not print out a time prefix or color any text. Only prefix
     * with whitespace so the message is lined up with timestamped logs.
     */
    Logger.log = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        Logger.wordWrap(msg).forEach(function (line) {
            console.log(line);
        });
    };
    /**
     * Prints out a dim colored timestamp prefix, with optional color
     * and bold message.
     */
    Logger.info = function (msg, color, bold) {
        var lines = Logger.wordWrap([msg]);
        if (lines.length) {
            var prefix = timePrefix();
            var lineOneMsg = lines[0].substr(prefix.length);
            lines[0] = prefix + lineOneMsg;
        }
        lines.forEach(function (line, lineIndex) {
            console.log(line);
        });
    };
    /**
     * Prints out a yellow colored timestamp prefix.
     */
    Logger.warn = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        var lines = Logger.wordWrap(msg);
        if (lines.length) {
            var prefix = timePrefix();
            lines[0] = prefix + lines[0].substr(prefix.length);
        }
        lines.forEach(function (line) {
            console.warn(line);
        });
    };
    /**
     * Prints out a error colored timestamp prefix.
     */
    Logger.error = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        var lines = Logger.wordWrap(msg);
        if (lines.length) {
            var prefix = timePrefix();
            lines[0] = prefix + lines[0].substr(prefix.length);
        }
        lines.forEach(function (line) {
            console.error(line);
        });
    };
    Logger.unformattedError = function (msg) {
        console.error(msg);
    };
    Logger.unformattedDebug = function (msg) {
        console.log(msg);
    };
    /**
     * Prints out a blue colored DEBUG prefix. Only prints out when debug mode.
     */
    Logger.debug = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
    };
    Logger.wordWrap = function (msg) {
        var output = [];
        var words = [];
        msg.forEach(function (m) {
            if (m === null) {
                words.push('null');
            }
            else if (typeof m === 'undefined') {
                words.push('undefined');
            }
            else if (typeof m === 'string') {
                m.replace(/\s/gm, ' ').split(' ').forEach(function (strWord) {
                    if (strWord.trim().length) {
                        words.push(strWord.trim());
                    }
                });
            }
            else if (typeof m === 'number' || typeof m === 'boolean') {
                words.push(m.toString());
            }
            else if (typeof m === 'function') {
                words.push(m.toString());
            }
            else if (Array.isArray(m)) {
                words.push(function () {
                    return m.toString();
                });
            }
            else if (Object(m) === m) {
                words.push(function () {
                    return m.toString();
                });
            }
            else {
                words.push(m.toString());
            }
        });
        var line = Logger.INDENT;
        words.forEach(function (word) {
            if (typeof word === 'function') {
                if (line.trim().length) {
                    output.push(line);
                }
                output.push(word());
                line = Logger.INDENT;
            }
            else if (Logger.INDENT.length + word.length > Logger.MAX_LEN) {
                // word is too long to play nice, just give it its own line
                if (line.trim().length) {
                    output.push(line);
                }
                output.push(Logger.INDENT + word);
                line = Logger.INDENT;
            }
            else if ((word.length + line.length) > Logger.MAX_LEN) {
                // this word would make the line too long
                // print the line now, then start a new one
                output.push(line);
                line = Logger.INDENT + word + ' ';
            }
            else {
                line += word + ' ';
            }
        });
        if (line.trim().length) {
            output.push(line);
        }
        return output;
    };
    Logger.formatFileName = function (rootDir, fileName) {
        fileName = fileName.replace(rootDir, '');
        if (/\/|\\/.test(fileName.charAt(0))) {
            fileName = fileName.substr(1);
        }
        if (fileName.length > 80) {
            fileName = '...' + fileName.substr(fileName.length - 80);
        }
        return fileName;
    };
    Logger.formatHeader = function (type, fileName, rootDir, startLineNumber, endLineNumber) {
        if (startLineNumber === void 0) { startLineNumber = null; }
        if (endLineNumber === void 0) { endLineNumber = null; }
        var header = type + ": " + Logger.formatFileName(rootDir, fileName);
        if (startLineNumber !== null && startLineNumber > 0) {
            if (endLineNumber !== null && endLineNumber > startLineNumber) {
                header += ", lines: " + startLineNumber + " - " + endLineNumber;
            }
            else {
                header += ", line: " + startLineNumber;
            }
        }
        return header;
    };
    Logger.newLine = function () {
        console.log('');
    };
    Logger.INDENT = '            ';
    Logger.MAX_LEN = 120;
    return Logger;
}());
exports.Logger = Logger;
function timePrefix() {
    var date = new Date();
    return '[' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2) + ']';
}
