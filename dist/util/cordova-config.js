"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lastConfig;
exports.parseConfig = function (parsedConfig) {
    if (!parsedConfig.widget) {
        return {};
    }
    var widget = parsedConfig.widget;
    // Widget attrs are defined on the <widget> tag
    var widgetAttrs = widget.$;
    var config = {
        name: widget.name[0]
    };
    if (widgetAttrs) {
        config.id = widgetAttrs.id;
        config.version = widgetAttrs.version;
    }
    lastConfig = config;
    return config;
};
