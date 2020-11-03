globalSettingsSchema = {
    type: "object",
    title: "Settings",
    properties: {

        soundData: {
            type: "object",
            title: "Sounds(saved as part of board)",
            additionalProperties: {
                type: "string",
                "media": {
                    "binaryEncoding": "base64",
                },
            },
        },


        imageData: {
            type: "object",
            title: "Images(saved as part of board for CSS. Name must start with --)",
            additionalProperties: {
                type: "string",
                "media": {
                    "binaryEncoding": "base64",
                },
            },
        },



        theme: {
            type: "object",
            title: "Theme",
            properties: {
                "--box-bg-color": {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--main-bg-color": {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                        }
                    }
                },
                "--main-bg-image": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--logo-image": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--logo-text": {
                    type: "string",
                },

                "--main-font": {
                    type: "string",
                    enum: ['FBSans', 'FBSerif', 'Chalkboard', 'Chancery', 'Pandora', 'RoughScript', 'Handwriting', "B612", "FBMono", "Blackletter", "FBComic", "Pixel", "QTBlackForest", "Pixel", "FBCursive", "DIN", "PenguinAttack", "DSEG7", "DSEG14"]
                },
                "--title-font": {
                    type: "string",
                    enum: ['FBSans', 'FBSerif', 'Chalkboard', 'Chancery', 'Pandora', 'RoughScript', 'Handwriting', "B612", "FBMono", "Blackletter", "FBComic", "Pixel", "QTBlackForest", "Pixel", "FBCursive", "DIN", "PenguinAttack", "DSEG7", "DSEG14"]
                },
                "--widget-font": {
                    type: "string",
                    enum: ['FBSans', 'FBSerif', 'Chalkboard', 'Chancery', 'Pandora', 'RoughScript', 'Handwriting', "B612", "FBMono", "Blackletter", "FBComic", "Pixel", "QTBlackForest", "Pixel", "FBCursive", "DIN", "PenguinAttack", "DSEG7", "DSEG14"]
                },
                "--main-font-size": {
                    type: "string",
                    enum: ['small', 'medium', 'large', 'x-large', 'xx-large', '12px', '16px', '24px', '32px', '48px', '64px', '80px']
                },
                "--title-font-size": {
                    type: "string",
                    enum: ['small', 'medium', 'large', 'x-large', 'xx-large', '12px', '16px', '24px', '32px', '48px', '64px', '80px']
                },
                "--widget-font-size": {
                    type: "string",
                    enum: ['small', 'medium', 'large', 'x-large', 'xx-large', '12px', '16px', '24px', '32px', '48px', '64px', '80px']
                },
                "--fg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb'
                        }
                    }
                },
                "--widget-bg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--widget-fg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb'
                        }
                    }
                },
                "--bar-bg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--header-bg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--header-fg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb'
                        }
                    }
                },
                "--label-bg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--label-fg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                        }
                    }
                },
                "--title-shadow":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--pane-shadow":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--border-width":
                {
                    type: "string",
                    enum: ['0px', '1px', '2px', '3px', '4px', '5px']
                },

                "--header-border-radius":
                {
                    type: "string",
                    enum: ['0em', '0.3em', '0.6em', '1em', '2em', '3em', '4em', '5em']
                },
                "--logo-border-radius":
                {
                    type: "string",
                    enum: ['0em', '0.3em', '0.6em', '1em', '2em', '3em', '4em', '5em']
                },
                "--header-line-width":
                {
                    type: "string",
                    enum: ['0px', '1px', '2px', '3px']
                },
                "--pane-padding":
                {
                    type: "string",
                    enum: ['0.1em', '0.2em', ' 0.3em', '0.6em', '1.2em', '2.4em']
                },

                "--pane-border-radius":
                {
                    type: "string",
                    enum: ['0.1em', '0.2em', '0.3em', '0.6em', '1.2em', '2.4em']
                },

                "--widget-border-radius":
                {
                    type: "string",
                    enum: ['0em', '0.3em', '0.6em', '1.2em', '2.4em', '4.8em']
                },

                "--main-bg-size":
                {
                    type: "string",
                    enum: ['auto', 'cover', 'contain']
                },


                "--title-line-height":
                {
                    type: "string",
                    enum: ['20px', '40px', '60px', '80px', '100px']
                }


                // "--extra-grid-height":
                // {                  
                //     description: "Give grid panes a extra space in the grid, passt what the box actually takes up", 
                //     type: "string",
                //     enum: ['0px','20px','40px','60px', '80px', '100px']
                // }


            }
        }
    }
}