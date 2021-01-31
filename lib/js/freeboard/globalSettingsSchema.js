

var fontlist = ['FBSans', 'FBSerif', 'Chalkboard', 'Chancery', 'Pandora', 'RoughScript', 'Handwriting', "B612", "FBMono", "Blackletter", "FBComic", "Pixel", "Cinzel", "QTBlackForest", "Pixel", "FBCursive", "DIN", "PenguinAttack", "DSEG7", "DSEG14"]

var freeboardFontsList = fontlist

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
            title: "Images(name must start with --)",
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
                "--border-style":
                {
                    type: "string",
                    enum: ["inset", "outset", "solid", "double", "groove", "ridge", "dotted",'dashed']
                },
                "background-particles": {
                    type: "object",

                    properties: {
                        color: {
                            type: "array",
                            default:['#FFFFFF'],
                            items: {
                                type: "string",
                                format: 'color',
                                'options': {
                                    'colorpicker': {
                                        'editorFormat': 'rgb',
                                        'alpha': true
                                    }
                                }
                            }
                        },
                        //Have to use enum here, we really don't want anyone setting thousands of these
                        "count":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 300,
                            default:25
                        },

                        "shape":
                        {
                            type: "string",
                            enum: ["circle", "square", "triangle", "line", "diamond", "star", "image",'colorimage']
                        },
                        "style":
                        {
                            type: "string",
                            enum: ["stroke", "fill", "both"]
                        },
                        "minSize":
                        {
                            type: "number",
                            minimum: 1,
                            maximum: 60,
                            default:1
                        },
                        "maxSize":
                        {
                            type: "number",
                            minimum: 1,
                            maximum: 60,
                            default:25
                        },
                        "minAlpha":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 1
                        },

                        "maxAlpha":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 1,
                            default:1
                        },
                        "direction":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 360,
                            default: 180
                        },
                        "speed":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 120,
                            default:10
                        },
                        "parallax":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 20,
                            default:10
                        },
                        "xVariance":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 20,
                            default:10
                        },
                        "yVariance":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 20,
                            default: 3
                        },
                        "drift":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 20,
                            default:5
                        },
                        "glow":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 50,
                            default: 25
                        },
                        "rotation":
                        {
                            type: "number",
                            minimum: 0,
                            maximum: 20,
                            default:3
                        },
                        "bounce":
                        {
                            type: "boolean",
                            minimum: 0,
                            maximum: 20
                        },
                        "imageUrl":{
                           type:"array",
                           items:{
                            type: "string",
                            "media": {
                                "binaryEncoding": "base64",
                                "type": "img/png"
                            },
                        }}
                    }
                },

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
/*
                "--pane-border-image-source": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--pane-border-image-width": {
                    type: "string",
                    default: "20px"
                },

                "--pane-border-image-repeat": {
                    type: "string",
                    default: "round"
                },

                "--pane-border-image-slice": {
                    type: "string",
                    default: "60 60 60 60"
                },
                */

                "--widget-bg-image": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--box-bg-image": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--bar-bg-image": {
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
                "--box-backdrop": {
                    type: "string",
                    enum: ['', 'blur(1px)', 'blur(2px)', 'blur(4px)', 'blur(8px)', 'blur(16px)']
                },
                "--main-font": {
                    type: "string",
                    enum: fontlist
                },
                "--header-font": {
                    type: "string",
                    enum: fontlist
                },
                "--widget-font": {
                    type: "string",
                    enum: fontlist
                },
                "--main-font-size": {
                    type: "string",
                    enum: ['small', 'medium', 'large', 'x-large', 'xx-large', '12px', '16px', '24px', '32px', '48px', '64px', '80px']
                },
                "--header-font-size": {
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
                "--pane-header-bg-color":
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
                "--header-shadow":
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
                "--widget-shadow":
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

                "--widget-text-shadow":
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

                "--border-color":
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
                "--widget-border-color":
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
                "--modal-tint":
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
                    enum: ['0em', '0.15em', '0.3em', '0.6em', '1.2em', '2.4em', '4.8em']
                },

                "--main-bg-size":
                {
                    type: "string",
                    enum: ['auto', 'cover', 'contain']
                },


                "--pane-header-line-height":
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