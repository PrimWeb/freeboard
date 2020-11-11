/* ===========================================================
 * trumbowyg.emoji.js v0.1
 * Emoji picker plugin for Trumbowyg
 * http://alex-d.github.com/Trumbowyg
 * ===========================================================
 * Author : Nicolas Pion
 *          Twitter : @nicolas_pion
 */

(function ($) {
    'use strict';

    var defaultOptions = {
      
    };

    // Add all emoji in a dropdown
    $.extend(true, $.trumbowyg, {
        langs: {
            // jshint camelcase:false
            en: {
                emoji: 'Add an emoji'
            },
            da: {
                emoji: 'Tilføj et humørikon'
            },
            de: {
                emoji: 'Emoticon einfügen'
            },
            fr: {
                emoji: 'Ajouter un emoji'
            },
            zh_cn: {
                emoji: '添加表情'
            },
            ru: {
                emoji: 'Вставить emoji'
            },
            ja: {
                emoji: '絵文字の挿入'
            },
            tr: {
                emoji: 'Emoji ekle'
            },
            ko: {
                emoji: '이모지 넣기'
            },
        },
        // jshint camelcase:true
        plugins: {
            emoji: {
                init: function (trumbowyg) {
                    trumbowyg.o.plugins.emoji = trumbowyg.o.plugins.emoji || defaultOptions;
                    var emojiBtnDef = {
                        fn: buildDropdown(trumbowyg)
                    };
                    trumbowyg.addBtnDef('emoji', emojiBtnDef);
                }
            }
        }
    });

    function buildDropdown(trumbowyg) {

     // Custom emoji behaviour
        
        var m=trumbowyg.openModal({
                        title: 'Emoji',
                        content: '<input id="emojipicker"></input>'
                    });
        m.on('tbwconfirm', trumbowyg.insertText($("#emojipicker").val())
    
    }
})(jQuery);
