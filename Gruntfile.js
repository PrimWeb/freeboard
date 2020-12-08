module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            css: {
                src: [
                    'lib/css/thirdparty/*.css',
                    'lib/css/freeboard/styles.css',
                     'lib/css/thirdparty/fa/*.css'
                ],
                dest: 'css/freeboard.css'
            },
            thirdparty : {
                src : [
                    [
                        'lib/js/thirdparty/head.js',
                        'lib/js/thirdparty/jquery.js',
                        'lib/js/thirdparty/raphael.2.1.0.min.js',
                        'lib/js/thirdparty/gauge.min.js',
                        'lib/js/thirdparty/jquery.sparkline.min.js',
                        'lib/js/thirdparty/knockout.js',
                        'lib/js/thirdparty/underscore.js',
                        'lib/js/thirdparty/jquery.gridster.js',
                        'lib/js/thirdparty/jquery.caret.js',
						'lib/js/thirdparty/jquery.xdomainrequest.js',
                        'lib/js/thirdparty/codemirror.js',
                        'lib/js/thirdparty/strftime.js',
                        'lib/js/thirdparty/js-yaml.js',
                        'lib/js/thirdparty/jsgrid.min.js',
                        'lib/js/thirdparty/trumbowyg.js',
                        'lib/js/thirdparty/trumbowyg.fontsize.min.js',
                        'lib/js/thirdparty/trumbowyg.fontfamily.min.js',
                        'lib/js/thirdparty/trumbowyg.base64.min.js',
                        'lib/js/thirdparty/trumbowyg.table.min.js',
                        'lib/js/thirdparty/trumbowyg.preformatted.min.js',
                        'lib/js/thirdparty/trumbowyg.emoji.min.js',
                        'lib/js/thirdparty/trumbowyg.specialchars.min.js',
                        'lib/js/thirdparty/trumbowyg.resizeimg.min.js',
                        'lib/js/thirdparty/trumbowyg.colors.min.js',
                        'lib/js/thirdparty/mustache.min.js',
                        'lib/js/thirdparty/jquery-resizable.min.js',
                        'lib/js/thirdparty/nano-sql.min.js',
                        'lib/js/thirdparty/nanosql.fuzzy.min.js',
                        'lib/js/thirdparty/luxon.min.js',
                        'lib/js/thirdparty/keyboard.min.js',
                        'lib/js/thirdparty/jsoneditor.min.js',
                        'lib/js/thirdparty/vanillapicker.min.js',
                        'lib/js/thirdparty/howler.min.js',
                        'lib/js/thirdparty/leaflet.js',
                        'lib/js/thirdparty/day.min.js',
                        'lib/js/thirdparty/leaflet.tilelayer.fallback.js',
                        'lib/js/thirdparty/leaflet-realtime.js',
                        'lib/js/thirdparty/chroma.js',
                        'lib/js/thirdparty/spectrum.min.js',
                        'lib/js/thirdparty/print.min.js',
                        'lib/js/thirdparty/purify.js',
                        'lib/js/thirdparty/textFit.min.js',
                        'lib/js/thirdparty/nacl-fast.js',
                        'lib/js/thirdparty/filesaver.js',
                        'lib/js/thirdparty/blake2b.js',
                        'lib/js/thirdparty/structjsfork.js',
                        'lib/js/thirdparty/stable-stringify.js'
                    ]
                ],
                dest : 'js/freeboard.thirdparty.js'
            },
			fb : {
				src : [
                    'lib/js/freeboard/templates.js',
					'lib/js/freeboard/DatasourceModel.js',
					'lib/js/freeboard/DeveloperConsole.js',
					'lib/js/freeboard/DialogBox.js',
					'lib/js/freeboard/FreeboardModel.js',
					'lib/js/freeboard/FreeboardUI.js',
					'lib/js/freeboard/JSEditor.js',
					'lib/js/freeboard/PaneModel.js',
					'lib/js/freeboard/PluginEditor.js',
					'lib/js/freeboard/ValueEditor.js',
					'lib/js/freeboard/WidgetModel.js',
					'lib/js/freeboard/freeboard.js',
                    'lib/js/freeboard/globalSettingsSchema.js',                  
                    'lib/js/freeboard/help.js',


				],
				dest : 'js/freeboard.js'
			},
            plugins : {
                src : [
                    'plugins/freeboard/*.js'
                ],
                dest : 'js/freeboard.plugins.js'
            },
            'fb_plugins' : {
                src : [
                    'js/freeboard.js',
                    'js/freeboard.plugins.js'
                ],
                dest : 'js/freeboard_plugins.js'
            }
        },
        cssmin : {
            css:{
                src: 'css/freeboard.css',
                dest: 'css/freeboard.min.css'
            }
        },
        uglify : {
            fb: {
                files: {
                    'js/freeboard.min.js' : [ 'js/freeboard.js' ]
                }
            },
            plugins: {
                files: {
                    'js/freeboard.plugins.min.js' : [ 'js/freeboard.plugins.js' ]
                }
            },
            thirdparty :{
                options: {
                    mangle : false,
                    beautify : false,
                    compress: {}
                },
                files: {
                    'js/freeboard.thirdparty.min.js' : [ 'js/freeboard.thirdparty.js' ]
                }
            },
            'fb_plugins': {
                files: {
                    'js/freeboard_plugins.min.js' : [ 'js/freeboard_plugins.js' ]
                }
            }
        },
        'string-replace': {
            css: {
                files: {
                    'css/': 'css/*.css'
                },
                options: {
                    replacements: [{
                        pattern: /..\/..\/..\/img/ig,
                        replacement: '../img'
                    }]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify-es');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.registerTask('default', [ 'concat:css', 'cssmin:css', 'concat:fb', 'concat:thirdparty', 'concat:plugins', 'concat:fb_plugins', 'uglify:fb', 'uglify:plugins', 'uglify:fb_plugins', 'uglify:thirdparty', 'string-replace:css' ]);
};
