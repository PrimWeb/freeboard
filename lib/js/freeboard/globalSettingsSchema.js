globalSettingsSchema= {
    type: "object",
    title: "Settings",
    properties: {
      theme: {
              type: "object",
              title: "Theme",
              properties: {
                "--box-bg-color":{                   
                      type: "string",
                      format: 'color'
                  },
                "--main-bg-color":{                   
                    type: "string",
                    format: 'color'
                },
                "--main-bg-image":{                   
                    type: "string",
                },

                "--main-font":{                   
                    type: "string",
                },
                "--fg-color":
                {                   
                    type: "string",
                    format: 'color'
                },
                "--widget-bg-color":
                {                   
                    type: "string",
                    format: 'color'
                },
                "--bar-bg-color":
                {                   
                    type: "string",
                    format: 'color'
                },
                "--header-bg-color":
                {                   
                    type: "string",
                    format: 'color'
                },
                "--header-fg-color":
                {                   
                    type: "string",
                    format: 'color'
                },
                "--border-width":
                {                   
                    type: "string",
                    enum: ['0px','1px','2px','3px','4px','5px']
                },

                "--header-border-radius":
                {                   
                    type: "string",
                    enum: ['0em','1em','2em','3em','4em','5em']
                },
                "--header-line-width":
                {                   
                    type: "string",
                    enum: ['0px','1px','2px','3px']
                },
                "--pane-padding":
                {                   
                    type: "string",
                    enum: ['0.3em','0.6em','1.2em','2.4em']
                },

                "--pane-border-radius":
                {                   
                    type: "string",
                    enum: ['0.3em','0.6em','1.2em','2.4em']
                },

                "--main-bg-size":
                {                   
                    type: "string",
                    enum: ['auto','cover','contain']
                }

                
              }     
    }
  }
}