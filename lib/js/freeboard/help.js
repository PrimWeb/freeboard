function generateFreeboardHelp() {


var x = `
<div style="overflow:scroll; height:50em;">

<h2>Data targets</h2>

<p>Input widgets use a data target to do something with the data.
If the target is just the name of a field of a datasource, it will try to write it there.</p>

<p>If the target contains any javascript, like assignments or function calls,
it will be interpreted as a function to call to handle new data.
You can access the value itself simply by using the variable called 'value'.</p>

<p>Nonexistant targets just create that target when the user enters some data, otherwise they have an empty or default value.   This means you don't always need ot worry
about declaring values.</p>

<h2>Calculated values</h2>

<p>These update in real time if the value of the expression changes.
Much like a spreadsheet, they must begin with an equals sign,
or else they get interpreted as just literal data.</p>


<h2> Data Tables </h2>
<p>FreeBoard works with table-like data using the nanoSQl2 library which is always available to the user.   The following 4 special fields are reserved and may be added
    to rows when used with widgets: _time, the microseconds modification time of the record, _arrival, the microseconds time the record arrived on the local node,
    _uuid, a canonical UUID for the record, and _name, a nonunique name.<p>


<p>When using the table widget in the raw data mode, all you need to worry about is your application data, the special fields are added automatically by the table widget.</p>

<p>Table widgets have a data target for their selected row.  This row acts just like a the data rows in your input array, however, you can write
the changes back to the original data table by setting the _arrival property to anything you want(The actual value will be changed to the current time).</p>

<p>Where there is no selection, the selection is just an empty object, with all of the special underscore keys, and a random UUID.  Setting _arrival on this will
create a new entry, as this triggers entering the row into whatever is managing the database.</p>

<p>All database backends should understand this spec, so to make a database form, you use a table to find the record you want, assign the selection
to a scratchpad data source, and use the usual controls to edit that selection.  When you're done, use a button widget to set the _arrival property, and everything gets saved.</p>

<p>The tableview widget itself will act as the backend if you use the raw data array mode.</p>

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

  </pre>
  `

  return $(x)
}