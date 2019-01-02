export interface CordovaProject {
  name?: string;
  id?: string;
  version?: string;
}

let lastConfig: CordovaProject;

export let parseConfig = (parsedConfig: any): CordovaProject => {
  if (!parsedConfig.widget) {
    return {};
  }

  let widget = parsedConfig.widget;

  // Widget attrs are defined on the <widget> tag
  let widgetAttrs = widget.$;

  let config: CordovaProject = {
    name: widget.name[0]
  };

  if (widgetAttrs) {
    config.id = widgetAttrs.id;
    config.version = widgetAttrs.version;
  }

  lastConfig = config;

  return config;
};
