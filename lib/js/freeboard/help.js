function generateFreeboardHelp() {


var x = `
<div style="overflow:scroll; height:50em;">

<h2>Data targets</h2>

<p>Input widgets use a data target to do something with the data.
If the target is just the name of a field of a datasource, it will try to write it there.</p>

<p>If the target contains any javascript, like assignments or function calls,
it will be interpreted as a function to call to handle new data.
You can access the value itself simply by using the variable called 'value'.</p>

<h2>Calculated values</h2>

<p>These update in real time if the value of the expression changes.
Much like a spreadsheet, they must begin with an equals sign,
or else they get interpreted as just literal data.</p>
</div>

<h2> Data Tables </h2>
<p>FreeBoard works with table-like data using the nanoSQl2 library which is always available to the user.   The following 4 special fields are reserved and may be added
    to rows when used with widgets: _time, the microseconds modification time of the record, _arrival, the microseconds time the record arrived on the local node,
    _uuid, a canonical UUID for the record, and _name, a nonunique name.<p>

<p>As usual, data targets work with data in (value, timestamp) form for table views.</p>

<p>When using the table widget in the raw data mode, all you need to worry about is your application data, the special fields are added automatically by the table widget.</p>

<p>Tables have a data target for their selected row.  This row acts just like a the data rows in your input array, however, you can write
the changes back to the original data table by setting the _arrival property to anything you want(The actual value will be changed to the current time).</p>

<p>Where there is no selection, the selection is just an empty object, with all of the special underscore keys, and a random UUID.  Setting _arrival on this will
create a new entry</p>

<p>All database backends should understand this spec, so to make a database form, you use a table to find the record you want, assign the selection
to a scratchpad data source, and use the usual controls to edit that selection.  When you're done, use a button widget to set the _arrival property, and everything gets saved.</p>

    

<h2>Mustache Templates(Use in the rich text edit component,  3rdparty doc, MIT)</h2>
<pre>
NAME
mustache - Logic-less templates.

SYNOPSIS
A typical Mustache template:

Hello {{name}}
You have just won {{value}} dollars!
{{#in_ca}}
Well, {{taxed_value}} dollars, after taxes.
{{/in_ca}}
Given the following hash:

{
  "name": "Chris",
  "value": 10000,
  "taxed_value": 10000 - (10000 * 0.4),
  "in_ca": true
}
Will produce the following:

Hello Chris
You have just won 10000 dollars!
Well, 6000.0 dollars, after taxes.
DESCRIPTION
Mustache can be used for HTML, config files, source code - anything. It works by expanding tags in a template using values provided in a hash or object.

We call it "logic-less" because there are no if statements, else clauses, or for loops. Instead there are only tags. Some tags are replaced with a value, some nothing, and others a series of values. This document explains the different types of Mustache tags.

TAG TYPES
Tags are indicated by the double mustaches. {{person}} is a tag, as is {{#person}}. In both examples, we'd refer to person as the key or tag key. Let's talk about the different types of tags.

Variables
The most basic tag type is the variable. A {{name}} tag in a basic template will try to find the name key in the current context. If there is no name key, the parent contexts will be checked recursively. If the top context is reached and the name key is still not found, nothing will be rendered.

All variables are HTML escaped by default. If you want to return unescaped HTML, use the triple mustache: {{{name}}}.

You can also use & to unescape a variable: {{& name}}. This may be useful when changing delimiters (see "Set Delimiter" below).

By default a variable "miss" returns an empty string. This can usually be configured in your Mustache library. The Ruby version of Mustache supports raising an exception in this situation, for instance.

Template:

* {{name}}
* {{age}}
* {{company}}
* {{{company}}}
Hash:

{
  "name": "Chris",
  "company": "<b>GitHub</b>"
}
Output:

* Chris
*
* &lt;b&gt;GitHub&lt;/b&gt;
* <b>GitHub</b>
Sections
Sections render blocks of text one or more times, depending on the value of the key in the current context.

A section begins with a pound and ends with a slash. That is, {{#person}} begins a "person" section while {{/person}} ends it.

The behavior of the section is determined by the value of the key.

False Values or Empty Lists

If the person key exists and has a value of false or an empty list, the HTML between the pound and slash will not be displayed.

Template:

Shown.
{{#person}}
  Never shown!
{{/person}}
Hash:

{
  "person": false
}
Output:

Shown.
Non-Empty Lists

If the person key exists and has a non-false value, the HTML between the pound and slash will be rendered and displayed one or more times.

When the value is a non-empty list, the text in the block will be displayed once for each item in the list. The context of the block will be set to the current item for each iteration. In this way we can loop over collections.

Template:

{{#repo}}
  <b>{{name}}</b>
{{/repo}}
Hash:

{
  "repo": [
    { "name": "resque" },
    { "name": "hub" },
    { "name": "rip" }
  ]
}
Output:

<b>resque</b>
<b>hub</b>
<b>rip</b>
Lambdas

When the value is a callable object, such as a function or lambda, the object will be invoked and passed the block of text. The text passed is the literal block, unrendered. {{tags}} will not have been expanded - the lambda should do that on its own. In this way you can implement filters or caching.

Template:

{{#wrapped}}
  {{name}} is awesome.
{{/wrapped}}
Hash:

{
  "name": "Willy",
  "wrapped": function() {
    return function(text, render) {
      return "<b>" + render(text) + "</b>"
    }
  }
}
Output:

<b>Willy is awesome.</b>
Non-False Values

When the value is non-false but not a list, it will be used as the context for a single rendering of the block.

Template:

{{#person?}}
  Hi {{name}}!
{{/person?}}
Hash:

{
  "person?": { "name": "Jon" }
}
Output:

Hi Jon!
Inverted Sections
An inverted section begins with a caret (hat) and ends with a slash. That is {{^person}} begins a "person" inverted section while {{/person}} ends it.

While sections can be used to render text one or more times based on the value of the key, inverted sections may render text once based on the inverse value of the key. That is, they will be rendered if the key doesn't exist, is false, or is an empty list.

Template:

{{#repo}}
  <b>{{name}}</b>
{{/repo}}
{{^repo}}
  No repos :(
{{/repo}}
Hash:

{
  "repo": []
}
Output:

No repos :(
Comments
Comments begin with a bang and are ignored. The following template:

<h1>Today{{! ignore me }}.</h1>
Will render as follows:

<h1>Today.</h1>
Comments may contain newlines.

Partials
Partials begin with a greater than sign, like {{> box}}.

Partials are rendered at runtime (as opposed to compile time), so recursive partials are possible. Just avoid infinite loops.

They also inherit the calling context. Whereas in an [ERB](http://en.wikipedia.org/wiki/ERuby) file you may have this:

<%= partial :next_more, :start => start, :size => size %>
Mustache requires only this:

{{> next_more}}
Why? Because the next_more.mustache file will inherit the size and start methods from the calling context.

In this way you may want to think of partials as includes, imports, template expansion, nested templates, or subtemplates, even though those aren't literally the case here.

For example, this template and partial:

base.mustache:
<h2>Names</h2>
{{#names}}
  {{> user}}
{{/names}}

user.mustache:
<strong>{{name}}</strong>
Can be thought of as a single, expanded template:

<h2>Names</h2>
{{#names}}
  <strong>{{name}}</strong>
{{/names}}
Set Delimiter
Set Delimiter tags start with an equal sign and change the tag delimiters from {{ and }} to custom strings.

Consider the following contrived example:

* {{default_tags}}
{{=<% %>=}}
* <% erb_style_tags %>
<%={{ }}=%>
* {{ default_tags_again }}
Here we have a list with three items. The first item uses the default tag style, the second uses erb style as defined by the Set Delimiter tag, and the third returns to the default style after yet another Set Delimiter declaration.

According to ctemplates, this "is useful for languages like TeX, where double-braces may occur in the text and are awkward to use for markup."

Custom delimiters may not contain whitespace or the equals sign.

COPYRIGHT
Mustache is Copyright (C) 2009 Chris Wanstrath

Original CTemplate by Google

SEE ALSO
mustache(1), http://mustache.github.io/
</pre>

`

return $(x)
}


function generateFreeboardEmojiCheats(){
  var x =`<h2>Smileys</h2>
  <p>😭😄😔☺️👍😁😂😘❤️😍😊💋😒😳😜🙈😉😃😢😝😱😡😏😞😅😚</p>
  <p>🙊😌😀😋👌😐😕😁😔😌😒😞😣😢😂😭😪😥😰😅😓😩😫😨😱😠</p>
  <p>😡😤😖😆😋😷😎😴😵😲😟😦😧😈👿😮😬😐😕😯😶😬😐😕😯😶</p>
  <p>😇😏😑</p>
  <p><br></p>
  <h2>People</h2>
  <p>👲👳👮👷💂👶👦👮👷💂👶👦👧👨👩👴👵👱👼👸</p>
  <h2>Cats</h2>
  <p>😺😸😻😽😼🙀😿😹😾</p>
  <h2>Creatures</h2>
  <p>👹👺🙈🙉🙊💀👽</p>
  <h2>Effects</h2>
  <p>🔥✨🌟💫💥💢💦💧💤💨</p>
  <h2>Body</h2>
  <p>👂👀👃👅👄👍👎👌👊✊✊✌️👋✋👐👆👇👉👈🙌🙏☝️👏💪</p>
  <h2>Figures</h2>
  <p>🚶🏃💃👫👪👬👭💏💑👯</p>
  <p>🙆🙅💁🙋💆💇💅👰🙎🙍🙇</p>
  <h2>Fashion</h2>
  <p>🎩👑👒👟👞👡👢👕👔👚👗🎽👖👘👙💼👜👝👛👓🎀🌂💄</p>
  <h2>Love</h2>
  <p>💛💙💜💚❤️💔💗💓💕💖💞💘💌💋💍💎</p>
  <h2>SocialMedia</h2>
  <p>👤👥💬👣💭</p>
  <h2>Animals</h2>
  <p>🐶🐺🐱🐭🐹🐰🐸🐯🐨🐻🐷🐽🐮🐗🐵🐒🐴🐑🐘🐼🐧🐦🐤🐥🐣🐔🐍🐢🐛🐝🐜🐞🐌🐙🐚🐠🐟🐬🐳🐋🐄🐏🐀🐃🐅🐇🐉🐎🐐🐓🐕🐖🐁🐂🐲🐡🐊🐫🐪🐆🐈🐩🐾
  </p>
  <p>💐🌸🌷🍀🌹🌻🌺🍁🍃🍂🌿🌾🍄🌵🌴🌲🌳🌰🌱🌼</p>
  <h2>Earth and Space</h2>
  <p>🌐🌞🌝🌚🌑🌒🌓🌔🌕🌖🌗🌘🌜🌛🌙🌍🌎🌏🌋🌌🌠⭐️☀️⛅️☁️⚡️☔️❄️⛄️🌁🌀🌈🌊❄️</p>
  <p><br></p>
  <h2>Parties</h2>
  <p>💝🎎🎒🎓🎓🎏🎆🎇🎐🎑🎃👻🎅🎄🎁🎋🎉🎊🎈</p>
  <p><br></p>
  <h2>Items</h2>
  <p>🎌🔮🎥📷💿📀💽💾💻📱☎️📞📟📠📡📺📻🔊🔉🔈🔇🔔🔕📣📢⏳⌛️</p>
  <p>⏰⌚️🔓🔒🔏🔐🔑🔓🔎💡🔦🔆🔅🔌🔋🔍🛀🛁🚿🚽🔧🔩🔨🚪🚬💣🔫</p>
  <p>🔪💊💉💰💴💵💷💶💳💸📲📧📥📤✉️📩📨📯📫📪📬📭📮📦📝📄📃</p>
  <p>📑📊📈📉📜📋📅📆📇📁📂✂️📌📎✒️✏️📏📐📕📗📘📙📓📔📒📚📖</p>
  <p>🔖📛🔬🔭📰</p>
  <p><br></p>
  <h2>Arts</h2>
  <p>🎨🎬🎤🎧🎼🎵🎶🎹🎻🎺🎷🎸</p>
  <p><br></p>
  <h2>Games</h2>
  <p>👾🎮🃏🎴🀄️🎲🎯🏈🏀⚽️⚾️🎾🎱🏉🎳⛳️🚵🚴🏁🏇🏆🎿🏂🏊🏄</p>
  <p><br></p>
  <h2>Food and Drink</h2>
  <p>🎣☕️🍵🍶🍼🍺🍻🍸🍹🍷🍴🍕🍔🍟🍗🍖🍝🍛🍤🍱🍣🍥🍙🍘🍚🍢🍡🍳🍞🍩🍮🍦🍨🍧🎂🍰🍪🍫🍭🍯🍎🍏🍊🍋🍒🍇🍉🍓🍑🍈🍌🍐🍆🍅🌽</p>
  <p>♨️🗿🎪🎭📍🚩🇯🇵🇰🇷🇩🇪🇨🇳🇺🇸🇫🇷🇪🇸🇮🇹🇷🇺🇬🇧</p>
  <p><br></p>
  <h2>Symbols</h2>
  <p>1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣0️⃣🔟🔢#️⃣🔣</p>
  <p>⬆️⬇️⬅️➡️🔠🔡🔤↗️↖️↘️↙️↔️↕️🔄◀️▶️🔼🔽</p>
  <p>↩️↪️ℹ️⤵️⏬⏫⏩⏪⤴️🆗🔀🔁🔂</p>
  <p>🆖🆓🆒🆙🆕📶🎦🈁🈯️🈳🈹🉐🈲🈴</p>
  <p>🈵🈺🈺🈶🈚️🚻🚹🚮🚰🚾🚼🚺🅿️♿️</p>
  <p>🚭🈷🈸🛅🛄🛂Ⓜ️🈂🛃🉑㊙️㊗️🆑📵</p>
  <p>🔞🚫🆔🆘🚯🚱🚳🚷🚸✅❎❇️✳️⛔️</p>
  <p>✴️💟🆚📳📴💠🅾🆎➿♻️</p>
  <p><br></p>
  <h2>Astrology</h2>
  <p>♈️♉️♊️♏️♎️♍️♌️♋️♐️♑️♒️♓️</p>
  <p><br></p>
  <h2>More Symbols</h2>
  <p>💱💲💹🏧🔯©®™❌‼️❔❕❓❗️⁉️⭕️⭕️🔝🔚🔙🔛</p>
  <p><br></p>
  <p>🕐🕧🕛🔃🔜🕜🕑🕝🕒🕞🕕🕠🕔🕟🕓🕖🕗🕘🕙🕚🕥🕤🕣🕢🕡🕦</p>
  <p>✖️➕➖➗💮♦️♣️♥️♠️💯✔️☑️🔘🔗◼️🔱〽️〰➰◻️▪️▫️⚪️⚫️🔳🔲🔺🔴🔵⬛️🔹🔸🔷🔶<br></p>
  
  
<h2>Pictographs</h2>
☀︎ ☼ ☽ ☾ ☁︎ ☂︎ ☔︎ ☃︎ ☇ ☈ ☻ ☹︎ ☺︎ ☕︎ ✌︎ ✍︎ ✎ ✏︎ ✐ ✑ ✒︎ ✁ ✂︎ ✃ ✄ ⚾︎ ✇ ✈︎ ⚓︎ ♨︎<br>
 ♈︎ ♉︎ ♊︎ ♋︎ ♌︎ ♍︎ ♎︎ ♏︎ ♐︎ ♑︎ ♒︎ ♓︎ ☉ ☿ ♀︎ ♁ ♂︎ ♃ ♄ ♅ ⛢ ♆ ♇ ☄︎ ⚲ ⚢ ⚣ ⚤ <br>
 ⚦ ⚧ ⚨ ⚩ ⚬ ⚭ ⚮ ⚯ ⚰︎ ⚱︎ ☊ ☋ ☌ ☍ ✦ ✧ ✙ ✚ ✛ ✜ ✝︎ ✞ ✟ ✠ ☦︎ ☨ ☩ ☥<br>
  ♰ ♱ ☓ ⚜︎ ☤ ⚚ ⚕︎ ⚖︎ ⚗︎ ⚙︎ ⚘ ☘︎ ⚛︎ ☧ ⚒︎ ☭ ☪︎ ☫ ☬ ⚑ ⚐ ☮︎ ☯︎ ☸︎ ⚔︎ ☗ ☖ ■ □ <br>
  ☐ ☑︎ ☒ ▪︎ ▫︎ ◻︎ ◼︎ ◘ ◆ ◇ ❖ ✓ ✔︎ ✕ ✖︎ ✗ ✘ ﹅ ﹆ ❍ ❏ ❐ ❑ ❒ ✰ ❤︎ ❥ ☙ <br>
  ❧ ❦ ❡ 🞡 🞢 🞣 🞤 🞥 🞦 🞧 🞨 🞩 🞪 🞫 🞬 🞭 🞮<br>



<h2>Currency Symbols</h2>
$ € ¥ ¢ £ ₽ ₨ ₩ ฿ ₺ ₮ ₱ ₭ ₴ ₦ ৲ ৳ ૱ ௹ ﷼ ₹ ₲ ₪ ₡ ₫ ៛ ₵ ₢ ₸ ₤ ₳ ₥ ₠ ₣ ₰ ₧ ₯ ₶ ₷


<h2>Stars and Circles</h2>
✢ ✣ ✤ ✥ ✦ ✧ ★ ☆ ✯ ✡︎ ✩ ✪ ✫ ✬ ✭ ✮ ✶ ✷ ✵ ✸ ✹ ✺ ❊ ✻ ✽ ✼<br>
 ❉ ✱ ✲ ✾ ❃ ❋ ✳︎ ✴︎ ❇︎ ❈ ※ ❅ ❆ ❄︎ ⚙︎ ✿ ❀ ❁ ❂ 🟀 🟁 🟂 🟃 🟄 🟅<br>
  🟆 🟇 🟈 🟉 🟊 🟋 🟌 🟍 🟎 🟏 🟐 🟑 🟒 🟓 🟔 ∙ • ・ ◦ ● ○ ◎ ◉ ⦿ ⁌ ⁍<br>

<h2>Nature</h2>
🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆<br>
 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦟 🦗 🕷 🕸 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 <br>
 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 <br>
 🐐 🦌 🐕 🐩 🦮 🐕‍🦺 🐈 🐓 🦃 🦚 🦜 🦢 🦩 🕊 🐇 🦝 🦨 🦡 🦦 🦥 🐁 🐀 🐿 🦔 🐾 🐉 🐲<br>
  🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🎍 🎋 🍃 🍂 🍁 🍄 🐚 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛<br> 
  🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 🌎 🌍 🌏 🪐 💫 ⭐️ 🌟 ✨ ⚡️ ☄️ 💥 🔥 🌪 <br>
  🌈 ☀️ 🌤 ⛅️ 🌥 ☁️ 🌦 🌧 ⛈ 🌩 🌨 ❄️ ☃️ ⛄️ 🌬 💨 💧 💦 ☔️ ☂️ 🌊 🌫<br>

  <h2>FontAwesome symbols(Adapted from the official cheetsheet)</h2>
  <pre>
  	ad	f641
  	address-book	f2b9
  	address-card	f2bb
  	adjust	f042
  	air-freshener	f5d0
  	align-center	f037
  	align-justify	f039
  	align-left	f036
  	align-right	f038
  	allergies	f461
  	ambulance	f0f9
  	american-sign-language-interpreting	f2a3
  	anchor	f13d
  	angle-double-down	f103
  	angle-double-left	f100
  	angle-double-right	f101
  	angle-double-up	f102
  	angle-down	f107
  	angle-left	f104
  	angle-right	f105
  	angle-up	f106
  	angry	f556
  	ankh	f644
  	apple-alt	f5d1
  	archive	f187
  	archway	f557
  	arrow-alt-circle-down	f358
  	arrow-alt-circle-left	f359
  	arrow-alt-circle-right	f35a
  	arrow-alt-circle-up	f35b
  	arrow-circle-down	f0ab
  	arrow-circle-left	f0a8
  	arrow-circle-right	f0a9
  	arrow-circle-up	f0aa
  	arrow-down	f063
  	arrow-left	f060
  	arrow-right	f061
  	arrow-up	f062
  	arrows-alt	f0b2
  	arrows-alt-h	f337
  	arrows-alt-v	f338
  	assistive-listening-systems	f2a2
  	asterisk	f069
  	at	f1fa
  	atlas	f558
  	atom	f5d2
  	audio-description	f29e
  	award	f559
  	baby	f77c
  	baby-carriage	f77d
  	backspace	f55a
  	backward	f04a
  	bacon	f7e5
  	bacteria	e059
  	bacterium	e05a
  	bahai	f666
  	balance-scale	f24e
  	balance-scale-left	f515
  	balance-scale-right	f516
  	ban	f05e
  	band-aid	f462
  	barcode	f02a
  	bars	f0c9
  	baseball-ball	f433
  	basketball-ball	f434
  	bath	f2cd
  	battery-empty	f244
  	battery-full	f240
  	battery-half	f242
  	battery-quarter	f243
  	battery-three-quarters	f241
  	bed	f236
  	beer	f0fc
  	bell	f0f3
  	bell-slash	f1f6
  	bezier-curve	f55b
  	bible	f647
  	bicycle	f206
  	biking	f84a
  	binoculars	f1e5
  	biohazard	f780
  	birthday-cake	f1fd
  	blender	f517
  	blender-phone	f6b6
  	blind	f29d
  	blog	f781
  	bold	f032
  	bolt	f0e7
  	bomb	f1e2
  	bone	f5d7
  	bong	f55c
  	book	f02d
  	book-dead	f6b7
  	book-medical	f7e6
  	book-open	f518
  	book-reader	f5da
  	bookmark	f02e
  	border-all	f84c
  	border-none	f850
  	border-style	f853
  	bowling-ball	f436
  	box	f466
  	box-open	f49e
  	box-tissue	e05b
  	boxes	f468
  	braille	f2a1
  	brain	f5dc
  	bread-slice	f7ec
  	briefcase	f0b1
  	briefcase-medical	f469
  	broadcast-tower	f519
  	broom	f51a
  	brush	f55d
  	bug	f188
  	building	f1ad
  	bullhorn	f0a1
  	bullseye	f140
  	burn	f46a
  	bus	f207
  	bus-alt	f55e
  	business-time	f64a
  	calculator	f1ec
  	calendar	f133
  	calendar-alt	f073
  	calendar-check	f274
  	calendar-day	f783
  	calendar-minus	f272
  	calendar-plus	f271
  	calendar-times	f273
  	calendar-week	f784
  	camera	f030
  	camera-retro	f083
  	campground	f6bb
  	candy-cane	f786
  	cannabis	f55f
  	capsules	f46b
  	car	f1b9
  	car-alt	f5de
  	car-battery	f5df
  	car-crash	f5e1
  	car-side	f5e4
  	caravan	f8ff
  	caret-down	f0d7
  	caret-left	f0d9
  	caret-right	f0da
  	caret-square-down	f150
  	caret-square-left	f191
  	caret-square-right	f152
  	caret-square-up	f151
  	caret-up	f0d8
  	carrot	f787
  	cart-arrow-down	f218
  	cart-plus	f217
  	cash-register	f788
  	cat	f6be
  	certificate	f0a3
  	chair	f6c0
  	chalkboard	f51b
  	chalkboard-teacher	f51c
  	charging-station	f5e7
  	chart-area	f1fe
  	chart-bar	f080
  	chart-line	f201
  	chart-pie	f200
  	check	f00c
  	check-circle	f058
  	check-double	f560
  	check-square	f14a
  	cheese	f7ef
  	chess	f439
  	chess-bishop	f43a
  	chess-board	f43c
  	chess-king	f43f
  	chess-knight	f441
  	chess-pawn	f443
  	chess-queen	f445
  	chess-rook	f447
  	chevron-circle-down	f13a
  	chevron-circle-left	f137
  	chevron-circle-right	f138
  	chevron-circle-up	f139
  	chevron-down	f078
  	chevron-left	f053
  	chevron-right	f054
  	chevron-up	f077
  	child	f1ae
  	church	f51d
  	circle	f111
  	circle-notch	f1ce
  	city	f64f
  	clinic-medical	f7f2
  	clipboard	f328
  	clipboard-check	f46c
  	clipboard-list	f46d
  	clock	f017
  	clone	f24d
  	closed-captioning	f20a
  	cloud	f0c2
  	cloud-download-alt	f381
  	cloud-meatball	f73b
  	cloud-moon	f6c3
  	cloud-moon-rain	f73c
  	cloud-rain	f73d
  	cloud-showers-heavy	f740
  	cloud-sun	f6c4
  	cloud-sun-rain	f743
  	cloud-upload-alt	f382
  	cocktail	f561
  	code	f121
  	code-branch	f126
  	coffee	f0f4
  	cog	f013
  	cogs	f085
  	coins	f51e
  	columns	f0db
  	comment	f075
  	comment-alt	f27a
  	comment-dollar	f651
  	comment-dots	f4ad
  	comment-medical	f7f5
  	comment-slash	f4b3
  	comments	f086
  	comments-dollar	f653
  	compact-disc	f51f
  	compass	f14e
  	compress	f066
  	compress-alt	f422
  	compress-arrows-alt	f78c
  	concierge-bell	f562
  	cookie	f563
  	cookie-bite	f564
  	copy	f0c5
  	copyright	f1f9
  	couch	f4b8
  	credit-card	f09d
  	crop	f125
  	crop-alt	f565
  	cross	f654
  	crosshairs	f05b
  	crow	f520
  	crown	f521
  	crutch	f7f7
  	cube	f1b2
  	cubes	f1b3
  	cut	f0c4
  	database	f1c0
  	deaf	f2a4
  	democrat	f747
  	desktop	f108
  	dharmachakra	f655
  	diagnoses	f470
  	dice	f522
  	dice-d20	f6cf
  	dice-d6	f6d1
  	dice-five	f523
  	dice-four	f524
  	dice-one	f525
  	dice-six	f526
  	dice-three	f527
  	dice-two	f528
  	digital-tachograph	f566
  	directions	f5eb
  	disease	f7fa
  	divide	f529
  	dizzy	f567
  	dna	f471
  	dog	f6d3
  	dollar-sign	f155
  	dolly	f472
  	dolly-flatbed	f474
  	donate	f4b9
  	door-closed	f52a
  	door-open	f52b
  	dot-circle	f192
  	dove	f4ba
  	download	f019
  	drafting-compass	f568
  	dragon	f6d5
  	draw-polygon	f5ee
  	drum	f569
  	drum-steelpan	f56a
  	drumstick-bite	f6d7
  	dumbbell	f44b
  	dumpster	f793
  	dumpster-fire	f794
  	dungeon	f6d9
  	edit	f044
  	egg	f7fb
  	eject	f052
  	ellipsis-h	f141
  	ellipsis-v	f142
  	envelope	f0e0
  	envelope-open	f2b6
  	envelope-open-text	f658
  	envelope-square	f199
  	equals	f52c
  	eraser	f12d
  	ethernet	f796
  	euro-sign	f153
  	exchange-alt	f362
  	exclamation	f12a
  	exclamation-circle	f06a
  	exclamation-triangle	f071
  	expand	f065
  	expand-alt	f424
  	expand-arrows-alt	f31e
  	external-link-alt	f35d
  	external-link-square-alt	f360
  	eye	f06e
  	eye-dropper	f1fb
  	eye-slash	f070
  	fan	f863
  	fast-backward	f049
  	fast-forward	f050
  	faucet	e005
  	fax	f1ac
  	feather	f52d
  	feather-alt	f56b
  	female	f182
  	fighter-jet	f0fb
  	file	f15b
  	file-alt	f15c
  	file-archive	f1c6
  	file-audio	f1c7
  	file-code	f1c9
  	file-contract	f56c
  	file-csv	f6dd
  	file-download	f56d
  	file-excel	f1c3
  	file-export	f56e
  	file-image	f1c5
  	file-import	f56f
  	file-invoice	f570
  	file-invoice-dollar	f571
  	file-medical	f477
  	file-medical-alt	f478
  	file-pdf	f1c1
  	file-powerpoint	f1c4
  	file-prescription	f572
  	file-signature	f573
  	file-upload	f574
  	file-video	f1c8
  	file-word	f1c2
  	fill	f575
  	fill-drip	f576
  	film	f008
  	filter	f0b0
  	fingerprint	f577
  	fire	f06d
  	fire-alt	f7e4
  	fire-extinguisher	f134
  	first-aid	f479
  	fish	f578
  	fist-raised	f6de
  	flag	f024
  	flag-checkered	f11e
  	flag-usa	f74d
  	flask	f0c3
  	flushed	f579
  	folder	f07b
  	folder-minus	f65d
  	folder-open	f07c
  	folder-plus	f65e
  	font	f031
  	football-ball	f44e
  	forward	f04e
  	frog	f52e
  	frown	f119
  	frown-open	f57a
  	funnel-dollar	f662
  	futbol	f1e3
  	gamepad	f11b
  	gas-pump	f52f
  	gavel	f0e3
  	gem	f3a5
  	genderless	f22d
  	ghost	f6e2
  	gift	f06b
  	gifts	f79c
  	glass-cheers	f79f
  	glass-martini	f000
  	glass-martini-alt	f57b
  	glass-whiskey	f7a0
  	glasses	f530
  	globe	f0ac
  	globe-africa	f57c
  	globe-americas	f57d
  	globe-asia	f57e
  	globe-europe	f7a2
  	golf-ball	f450
  	gopuram	f664
  	graduation-cap	f19d
  	greater-than	f531
  	greater-than-equal	f532
  	grimace	f57f
  	grin	f580
  	grin-alt	f581
  	grin-beam	f582
  	grin-beam-sweat	f583
  	grin-hearts	f584
  	grin-squint	f585
  	grin-squint-tears	f586
  	grin-stars	f587
  	grin-tears	f588
  	grin-tongue	f589
  	grin-tongue-squint	f58a
  	grin-tongue-wink	f58b
  	grin-wink	f58c
  	grip-horizontal	f58d
  	grip-lines	f7a4
  	grip-lines-vertical	f7a5
  	grip-vertical	f58e
  	guitar	f7a6
  	h-square	f0fd
  	hamburger	f805
  	hammer	f6e3
  	hamsa	f665
  	hand-holding	f4bd
  	hand-holding-heart	f4be
  	hand-holding-medical	e05c
  	hand-holding-usd	f4c0
  	hand-holding-water	f4c1
  	hand-lizard	f258
  	hand-middle-finger	f806
  	hand-paper	f256
  	hand-peace	f25b
  	hand-point-down	f0a7
  	hand-point-left	f0a5
  	hand-point-right	f0a4
  	hand-point-up	f0a6
  	hand-pointer	f25a
  	hand-rock	f255
  	hand-scissors	f257
  	hand-sparkles	e05d
  	hand-spock	f259
  	hands	f4c2
  	hands-helping	f4c4
  	hands-wash	e05e
  	handshake	f2b5
  	handshake-alt-slash	e05f
  	handshake-slash	e060
  	hanukiah	f6e6
  	hard-hat	f807
  	hashtag	f292
  	hat-cowboy	f8c0
  	hat-cowboy-side	f8c1
  	hat-wizard	f6e8
  	hdd	f0a0
  	head-side-cough	e061
  	head-side-cough-slash	e062
  	head-side-mask	e063
  	head-side-virus	e064
  	heading	f1dc
  	headphones	f025
  	headphones-alt	f58f
  	headset	f590
  	heart	f004
  	heart-broken	f7a9
  	heartbeat	f21e
  	helicopter	f533
  	highlighter	f591
  	hiking	f6ec
  	hippo	f6ed
  	history	f1da
  	hockey-puck	f453
  	holly-berry	f7aa
  	home	f015
  	horse	f6f0
  	horse-head	f7ab
  	hospital	f0f8
  	hospital-alt	f47d
  	hospital-symbol	f47e
  	hospital-user	f80d
  	hot-tub	f593
  	hotdog	f80f
  	hotel	f594
  	hourglass	f254
  	hourglass-end	f253
  	hourglass-half	f252
  	hourglass-start	f251
  	house-damage	f6f1
  	house-user	e065
  	hryvnia	f6f2
  	i-cursor	f246
  	ice-cream	f810
  	icicles	f7ad
  	icons	f86d
  	id-badge	f2c1
  	id-card	f2c2
  	id-card-alt	f47f
  	igloo	f7ae
  	image	f03e
  	images	f302
  	inbox	f01c
  	indent	f03c
  	industry	f275
  	infinity	f534
  	info	f129
  	info-circle	f05a
  	italic	f033
  	jedi	f669
  	joint	f595
  	journal-whills	f66a
  	kaaba	f66b
  	key	f084
  	keyboard	f11c
  	khanda	f66d
  	kiss	f596
  	kiss-beam	f597
  	kiss-wink-heart	f598
  	kiwi-bird	f535
  	landmark	f66f
  	language	f1ab
  	laptop	f109
  	laptop-code	f5fc
  	laptop-house	e066
  	laptop-medical	f812
  	laugh	f599
  	laugh-beam	f59a
  	laugh-squint	f59b
  	laugh-wink	f59c
  	layer-group	f5fd
  	leaf	f06c
  	lemon	f094
  	less-than	f536
  	less-than-equal	f537
  	level-down-alt	f3be
  	level-up-alt	f3bf
  	life-ring	f1cd
  	lightbulb	f0eb
  	link	f0c1
  	lira-sign	f195
  	list	f03a
  	list-alt	f022
  	list-ol	f0cb
  	list-ul	f0ca
  	location-arrow	f124
  	lock	f023
  	lock-open	f3c1
  	long-arrow-alt-down	f309
  	long-arrow-alt-left	f30a
  	long-arrow-alt-right	f30b
  	long-arrow-alt-up	f30c
  	low-vision	f2a8
  	luggage-cart	f59d
  	lungs	f604
  	lungs-virus	e067
  	magic	f0d0
  	magnet	f076
  	mail-bulk	f674
  	male	f183
  	map	f279
  	map-marked	f59f
  	map-marked-alt	f5a0
  	map-marker	f041
  	map-marker-alt	f3c5
  	map-pin	f276
  	map-signs	f277
  	marker	f5a1
  	mars	f222
  	mars-double	f227
  	mars-stroke	f229
  	mars-stroke-h	f22b
  	mars-stroke-v	f22a
  	mask	f6fa
  	medal	f5a2
  	medkit	f0fa
  	meh	f11a
  	meh-blank	f5a4
  	meh-rolling-eyes	f5a5
  	memory	f538
  	menorah	f676
  	mercury	f223
  	meteor	f753
  	microchip	f2db
  	microphone	f130
  	microphone-alt	f3c9
  	microphone-alt-slash	f539
  	microphone-slash	f131
  	microscope	f610
  	minus	f068
  	minus-circle	f056
  	minus-square	f146
  	mitten	f7b5
  	mobile	f10b
  	mobile-alt	f3cd
  	money-bill	f0d6
  	money-bill-alt	f3d1
  	money-bill-wave	f53a
  	money-bill-wave-alt	f53b
  	money-check	f53c
  	money-check-alt	f53d
  	monument	f5a6
  	moon	f186
  	mortar-pestle	f5a7
  	mosque	f678
  	motorcycle	f21c
  	mountain	f6fc
  	mouse	f8cc
  	mouse-pointer	f245
  	mug-hot	f7b6
  	music	f001
  	network-wired	f6ff
  	neuter	f22c
  	newspaper	f1ea
  	not-equal	f53e
  	notes-medical	f481
  	object-group	f247
  	object-ungroup	f248
  	oil-can	f613
  	om	f679
  	otter	f700
  	outdent	f03b
  	pager	f815
  	paint-brush	f1fc
  	paint-roller	f5aa
  	palette	f53f
  	pallet	f482
  	paper-plane	f1d8
  	paperclip	f0c6
  	parachute-box	f4cd
  	paragraph	f1dd
  	parking	f540
  	passport	f5ab
  	pastafarianism	f67b
  	paste	f0ea
  	pause	f04c
  	pause-circle	f28b
  	paw	f1b0
  	peace	f67c
  	pen	f304
  	pen-alt	f305
  	pen-fancy	f5ac
  	pen-nib	f5ad
  	pen-square	f14b
  	pencil-alt	f303
  	pencil-ruler	f5ae
  	people-arrows	e068
  	people-carry	f4ce
  	pepper-hot	f816
  	percent	f295
  	percentage	f541
  	person-booth	f756
  	phone	f095
  	phone-alt	f879
  	phone-slash	f3dd
  	phone-square	f098
  	phone-square-alt	f87b
  	phone-volume	f2a0
  	photo-video	f87c
  	piggy-bank	f4d3
  	pills	f484
  	pizza-slice	f818
  	place-of-worship	f67f
  	plane	f072
  	plane-arrival	f5af
  	plane-departure	f5b0
  	plane-slash	e069
  	play	f04b
  	play-circle	f144
  	plug	f1e6
  	plus	f067
  	plus-circle	f055
  	plus-square	f0fe
  	podcast	f2ce
  	poll	f681
  	poll-h	f682
  	poo	f2fe
  	poo-storm	f75a
  	poop	f619
  	portrait	f3e0
  	pound-sign	f154
  	power-off	f011
  	pray	f683
  	praying-hands	f684
  	prescription	f5b1
  	prescription-bottle	f485
  	prescription-bottle-alt	f486
  	print	f02f
  	procedures	f487
  	project-diagram	f542
  	pump-medical	e06a
  	pump-soap	e06b
  	puzzle-piece	f12e
  	qrcode	f029
  	question	f128
  	question-circle	f059
  	quidditch	f458
  	quote-left	f10d
  	quote-right	f10e
  	quran	f687
  	radiation	f7b9
  	radiation-alt	f7ba
  	rainbow	f75b
  	random	f074
  	receipt	f543
  	record-vinyl	f8d9
  	recycle	f1b8
  	redo	f01e
  	redo-alt	f2f9
  	registered	f25d
  	remove-format	f87d
  	reply	f3e5
  	reply-all	f122
  	republican	f75e
  	restroom	f7bd
  	retweet	f079
  	ribbon	f4d6
  	ring	f70b
  	road	f018
  	robot	f544
  	rocket	f135
  	route	f4d7
  	rss	f09e
  	rss-square	f143
  	ruble-sign	f158
  	ruler	f545
  	ruler-combined	f546
  	ruler-horizontal	f547
  	ruler-vertical	f548
  	running	f70c
  	rupee-sign	f156
  	sad-cry	f5b3
  	sad-tear	f5b4
  	satellite	f7bf
  	satellite-dish	f7c0
  	save	f0c7
  	school	f549
  	screwdriver	f54a
  	scroll	f70e
  	sd-card	f7c2
  	search	f002
  	search-dollar	f688
  	search-location	f689
  	search-minus	f010
  	search-plus	f00e
  	seedling	f4d8
  	server	f233
  	shapes	f61f
  	share	f064
  	share-alt	f1e0
  	share-alt-square	f1e1
  	share-square	f14d
  	shekel-sign	f20b
  	shield-alt	f3ed
  	shield-virus	e06c
  	ship	f21a
  	shipping-fast	f48b
  	shoe-prints	f54b
  	shopping-bag	f290
  	shopping-basket	f291
  	shopping-cart	f07a
  	shower	f2cc
  	shuttle-van	f5b6
  	sign	f4d9
  	sign-in-alt	f2f6
  	sign-language	f2a7
  	sign-out-alt	f2f5
  	signal	f012
  	signature	f5b7
  	sim-card	f7c4
  	sink	e06d
  	sitemap	f0e8
  	skating	f7c5
  	skiing	f7c9
  	skiing-nordic	f7ca
  	skull	f54c
  	skull-crossbones	f714
  	slash	f715
  	sleigh	f7cc
  	sliders-h	f1de
  	smile	f118
  	smile-beam	f5b8
  	smile-wink	f4da
  	smog	f75f
  	smoking	f48d
  	smoking-ban	f54d
  	sms	f7cd
  	snowboarding	f7ce
  	snowflake	f2dc
  	snowman	f7d0
  	snowplow	f7d2
  	soap	e06e
  	socks	f696
  	solar-panel	f5ba
  	sort	f0dc
  	sort-alpha-down	f15d
  	sort-alpha-down-alt	f881
  	sort-alpha-up	f15e
  	sort-alpha-up-alt	f882
  	sort-amount-down	f160
  	sort-amount-down-alt	f884
  	sort-amount-up	f161
  	sort-amount-up-alt	f885
  	sort-down	f0dd
  	sort-numeric-down	f162
  	sort-numeric-down-alt	f886
  	sort-numeric-up	f163
  	sort-numeric-up-alt	f887
  	sort-up	f0de
  	spa	f5bb
  	space-shuttle	f197
  	spell-check	f891
  	spider	f717
  	spinner	f110
  	splotch	f5bc
  	spray-can	f5bd
  	square	f0c8
  	square-full	f45c
  	square-root-alt	f698
  	stamp	f5bf
  	star	f005
  	star-and-crescent	f699
  	star-half	f089
  	star-half-alt	f5c0
  	star-of-david	f69a
  	star-of-life	f621
  	step-backward	f048
  	step-forward	f051
  	stethoscope	f0f1
  	sticky-note	f249
  	stop	f04d
  	stop-circle	f28d
  	stopwatch	f2f2
  	stopwatch-20	e06f
  	store	f54e
  	store-alt	f54f
  	store-alt-slash	e070
  	store-slash	e071
  	stream	f550
  	street-view	f21d
  	strikethrough	f0cc
  	stroopwafel	f551
  	subscript	f12c
  	subway	f239
  	suitcase	f0f2
  	suitcase-rolling	f5c1
  	sun	f185
  	superscript	f12b
  	surprise	f5c2
  	swatchbook	f5c3
  	swimmer	f5c4
  	swimming-pool	f5c5
  	synagogue	f69b
  	sync	f021
  	sync-alt	f2f1
  	syringe	f48e
  	table	f0ce
  	table-tennis	f45d
  	tablet	f10a
  	tablet-alt	f3fa
  	tablets	f490
  	tachometer-alt	f3fd
  	tag	f02b
  	tags	f02c
  	tape	f4db
  	tasks	f0ae
  	taxi	f1ba
  	teeth	f62e
  	teeth-open	f62f
  	temperature-high	f769
  	temperature-low	f76b
  	tenge	f7d7
  	terminal	f120
  	text-height	f034
  	text-width	f035
  	th	f00a
  	th-large	f009
  	th-list	f00b
  	theater-masks	f630
  	thermometer	f491
  	thermometer-empty	f2cb
  	thermometer-full	f2c7
  	thermometer-half	f2c9
  	thermometer-quarter	f2ca
  	thermometer-three-quarters	f2c8
  	thumbs-down	f165
  	thumbs-up	f164
  	thumbtack	f08d
  	ticket-alt	f3ff
  	times	f00d
  	times-circle	f057
  	tint	f043
  	tint-slash	f5c7
  	tired	f5c8
  	toggle-off	f204
  	toggle-on	f205
  	toilet	f7d8
  	toilet-paper	f71e
  	toilet-paper-slash	e072
  	toolbox	f552
  	tools	f7d9
  	tooth	f5c9
  	torah	f6a0
  	torii-gate	f6a1
  	tractor	f722
  	trademark	f25c
  	traffic-light	f637
  	trailer	e041
  	train	f238
  	tram	f7da
  	transgender	f224
  	transgender-alt	f225
  	trash	f1f8
  	trash-alt	f2ed
  	trash-restore	f829
  	trash-restore-alt	f82a
  	tree	f1bb
  	trophy	f091
  	truck	f0d1
  	truck-loading	f4de
  	truck-monster	f63b
  	truck-moving	f4df
  	truck-pickup	f63c
  	tshirt	f553
  	tty	f1e4
  	tv	f26c
  	umbrella	f0e9
  	umbrella-beach	f5ca
  	underline	f0cd
  	undo	f0e2
  	undo-alt	f2ea
  	universal-access	f29a
  	university	f19c
  	unlink	f127
  	unlock	f09c
  	unlock-alt	f13e
  	upload	f093
  	user	f007
  	user-alt	f406
  	user-alt-slash	f4fa
  	user-astronaut	f4fb
  	user-check	f4fc
  	user-circle	f2bd
  	user-clock	f4fd
  	user-cog	f4fe
  	user-edit	f4ff
  	user-friends	f500
  	user-graduate	f501
  	user-injured	f728
  	user-lock	f502
  	user-md	f0f0
  	user-minus	f503
  	user-ninja	f504
  	user-nurse	f82f
  	user-plus	f234
  	user-secret	f21b
  	user-shield	f505
  	user-slash	f506
  	user-tag	f507
  	user-tie	f508
  	user-times	f235
  	users	f0c0
  	users-cog	f509
  	users-slash	e073
  	utensil-spoon	f2e5
  	utensils	f2e7
  	vector-square	f5cb
  	venus	f221
  	venus-double	f226
  	venus-mars	f228
  	vest	e085
  	vest-patches	e086
  	vial	f492
  	vials	f493
  	video	f03d
  	video-slash	f4e2
  	vihara	f6a7
  	virus	e074
  	virus-slash	e075
  	viruses	e076
  	voicemail	f897
  	volleyball-ball	f45f
  	volume-down	f027
  	volume-mute	f6a9
  	volume-off	f026
  	volume-up	f028
  	vote-yea	f772
  	vr-cardboard	f729
  	walking	f554
  	wallet	f555
  	warehouse	f494
  	water	f773
  	wave-square	f83e
  	weight	f496
  	weight-hanging	f5cd
  	wheelchair	f193
  	wifi	f1eb
  	wind	f72e
  	window-close	f410
  	window-maximize	f2d0
  	window-minimize	f2d1
  	window-restore	f2d2
  	wine-bottle	f72f
  	wine-glass	f4e3
  	wine-glass-alt	f5ce
  	won-sign	f159
  	wrench	f0ad
  	x-ray	f497
  	yen-sign	f157
  </pre>
  `

  return $(x)
}