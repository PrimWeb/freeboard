/*
 * This file requires:
 <script src="../lib/js/thirdparty/nacl-fast.js"></script>
  <script src="../lib/js/thirdparty/nano-sql.min.js"></script>
  <script src="../lib/js/thirdparty/nanosql.fuzzy.min.js"></script>
  <script src="../lib/js/thirdparty/blake2b.js"></script>
  <script src="../lib/js/thirdparty/structjsfork.js"></script>
  <script src="../lib/js/thirdparty/stable-stringify.js"></script>
  
  However you will probably want to use the js/drayerdb.standalone.js file if using outside of Freeboard.
*/



DrayerDatabaseConnection = function () {
    var uuidv4=function() {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
         (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
   }

   var arrayToBase64=function(buffer) {
      var binary = '';
      var bytes = [].slice.call(buffer);
      bytes.forEach((b) => binary += String.fromCharCode(b));
      return window.btoa(binary);
   };

   var  base64ToArray=function(base64) {
      var binary_string = window.atob(base64);
      var len = binary_string.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
         bytes[i] = binary_string.charCodeAt(i);
      }
      return bytes
   }

   function DrayerDatabaseConnection(settings) {
      self = this

      self.settings = settings

      self.connections = {}

      self.concatTypedArrays = function (a, b) { // a, b TypedArray of same type
         var c = new (a.constructor)(a.length + b.length);
         c.set(a, 0);
         c.set(b, a.length);
         return c;
      }


      self.close= async function()
      {
         if(self.settings.perm)
         {

         }
         else
         {
            nSQL().dropDatabase(self.settings.dbname)
         }
      }


      self.onChangeset= async function()
      {
      }

      self.statusCallback=function()
      {
         
      }


      self.makeDB = async function () {
         
         if(self.settings.perm=='TEMP')
         {
            pt = "TEMP"
         }
         else if (self.settings.perm) {
            pt = "PERM"
         }
         else {
            pt = "TEMP"
         }

         self.db = await nSQL().createDatabase({
            id: self.settings.dbname,
            mode: pt, // pass in "PERM" to switch to persistent storage mode!
            tables: [
               {
                  name: "records",
                  model:
                  {
                     "id:uuid": { pk: true },
                     "parent:uuid": {},
                     "time:int": {},
                     "arrival:int": {},
                     "type:string": {},
                     "name:string": {},
                     "title:string": {},
                     "body:string": {},
                     "description:string": {},
                     "signature:string": {}

                  },
                  indexes:
                  {
                     "arrival:int": {},
                     "parent:uuid": {},
                     "time:int": {},
                     "name:string": { search: true },
                     "type:string": {},
                     "body:string": { search: true },
                     "title:string": { search: true },
                  }
               },
               {
                  name: "localNodeInfo",
                  model:
                  {
                     "key:string": { pk: true },
                     "value:string": {},
                  },
                  indexes:
                  {

                  }
               },

               {
                  name: "syncNodes",
                  model:
                  {
                     "id:string": { pk: true },
                     "syncTime:int": {}
                  }
               }
            ],
            plugins: [
               FuzzySearch()
            ]
         })




         //Make sure we have a local keypair
         var localNode = await nSQL('localNodeInfo').query("select").where(['key', '=', "keypair"]).exec()
         if (localNode.length) {
            self.localPubkey = base64ToArray(localNode[0].public)
            self.localSecretKey = base64ToArray(localNode[0].public)
         }
         else {
            nSQL().useDatabase(self.settings.dbname)

            var k = nacl.sign.keyPair()
            self.localPubkey = k.publicKey
            self.localSecretKey = k.secretKey

            k = {
               "public": arrayToBase64(self.localPubkey),
               "secret": arrayToBase64(self.localSecretKey)
            }

            await nSQL('localNodeInfo').query("upsert", [{ 'key': 'keypair', value: k }]).exec()
         }

      }


      self.dbSucess = self.makeDB()


      self.alreadySentSyncRequest = false

      //Encode a JSON into the compressed 
      self.encodeMessage = function (m) {

         m = stableStringify(m)
         m = new TextEncoder("utf-8").encode(m)

         var pw = self.settings.writePassword || self.settings.syncKey
         pw = new TextEncoder("utf-8").encode(pw)

         //No you cannot just use the tweetnacl hash. Tried that! It's not actually libsodium compatble.
         var keyhint = blake2b(pw, false, 32).slice(0, 16)

         var t = BigInt(Date.now() * 1000)
         var time = new Uint8Array(struct("<QQQ").pack(t, 0, 0,))

         m = nacl.secretbox(m, time, pw)

         //Don't send the padding
         var time = new Uint8Array(struct("<Q").pack(t))

         var b = self.concatTypedArrays(time, m)

         b = nacl.sign(b, self.localSecretKey)
         b = self.concatTypedArrays(self.localPubkey, b)
         b = self.concatTypedArrays(keyhint, b)
         return b
      }

      self.decodeMessage = function (m) {

         //Server to client messages never use the write password.
         var key = m.slice(0, 16)

         var publicKey = m.slice(16, 16 + 32)
         m = m.slice(16 + 32, m.length)
         m = nacl.sign.open(m, publicKey)


         var time = m.slice(0, 8)
         var timeint = struct("<Q").unpack(time.buffer)[0]
         var nonce = new Uint8Array(struct("<QQQ").pack(timeint, 0, 0,))


         //Not worth it to have a whole check beforehand, we are not going to be getting many messages with a write password,
         //it's just there for self test
         var m2 = nacl.secretbox.open(m.slice(8), nonce, new TextEncoder("utf-8").encode(self.settings.syncKey))
         if (m2 == null) {
            m2 = nacl.secretbox.open(m.slice(8), nonce, new TextEncoder("utf-8").encode(self.settings.writePassword))
         }

         m = new TextDecoder("utf-8").decode(m2)
         m = JSON.parse(m)
         console.log(m)
         return [m, publicKey]
      }

      self.handleIncoming = async function (m, socket) {

         var nodeID = m[1];
         var d = m[0];
         nSQL().useDatabase(self.settings.dbname);
         var node = await nSQL('syncNodes').query("select").where(['id', '=', arrayToBase64(nodeID)]).exec()
         var syncTime = 0;
         if (node.length) {
            syncTime = node[0].mostRecent || 0;
         }

         //On reconnect, we are going to send our sync request
         if (!socket.alreadySentSyncRequest) {
            socket.alreadySentSyncRequest = true

            socket.send(self.encodeMessage({ "getNewArrivals": syncTime }))
         }

         //Keep track of the highest remote arrival time in our record set.
         //That is what we will later use to ask if there are any newer records.
         if (d.records && d.records.length) {
            for (i in d.records) {
                var record =d.records[i][0]
                if (typeof(record)=='string')
                {
                    record=JSON.parse(record)
                }
               self.insertDocument(record)
               if(!record.arrival)
               {
                   throw new Error("Bad record arrival time")
               }
               if (record.arrival > syncTime) {
                  syncTime = record.arrival;
               }
            }
            nSQL().useDatabase(self.settings.dbname);
            //Insert all records, then request the next page of records.
            socket.send(self.encodeMessage({ "getNewArrivals": syncTime }))
            // Track the remote arrival time
            await nSQL('syncNodes').query("upsert", [{ id: arrayToBase64(nodeID), "mostRecent":syncTime }]).exec()
         }

         //We don't currently deal with record signing here, and can only push  records if we have the password
         if (self.settings.writePassword) {
            if (d.getNewArrivals) {
               var rv = {}
               rv.records = []
               nSQL().useDatabase(self.settings.dbname);
               var r = await nSQL('records').query('select').where(['arrival', '>', d.getNewArrivals]).exec()
               for (i in r) {
                  rv.records.push([r[i]])
               }
               socket.send(self.encodeMessage(rv))
            }
         }
         if (syncTime)
         {
            self.onChangeset(self)
         }
      }


      self.makeExternalEditRow = function (d) {
         //Make a copy in case we get passed som weird immutable thing
         var d2 = {}
         for (var i in d) {
            d2[i] = d[i]
         }
         d = d2
         /*Given a row of data, create a proxy object that can be saved back to the database by setting obj.arrival*/
         var m = {
            set: function (o, k, v) {

               //We use time-triggered updates.
               //Saving a record is done by putting a listener on the arrival time.
               //The value we set is irrelevant, it is always set to the current time.
               if (k == 'id') {
                  if (v != d.id) {
                     throw new Error("You cannot change a record's ID")
                  }
               }
               if (k == 'arrival') {
                  d.arrival = Date.now() * 1000
                  self.insertDocument(d)
               }
               else {
                  //If we make a local change, update the timestamp to tell about it.
                  d.time = Date.now() * 1000
                  d[k] = v;
               }
            }
         }

         return new Proxy(d, m)
      }

      self.insertDocument = async function (document,noCallback) {
         var d2 = {}
         for (var i in document) {
            d2[i] = document[i]
         }
         document = d2

         if (!document.id) {
            document.id = uuidv4();
         }

         if (!document.time) {
            document.time = parseInt(Date.now() * 1000)
         }
         document.type = document.type || ''

         // Do nothing if there is already a newer one
         var x = await nSQL('records').query('select').where([["id", '=', document.id],'AND', ['time', '>=', document.time]]).exec()

         if(x.length)
         {
            return
         }

         //We can delete all child records for real, because if we see them again, we will know they aren't valid due to
         //the null parent.
         //This is safe because a UUID, once truly deleted, is forever and it is not intended that anuone ever reuse that ID.
         if (document.type == '__null__') {
            nSQL().useDatabase(self.settings.dbname);
            await nSQL('records').query('delete').where(['parent', '=', document.id]).exec()
         }

         if (document.parent) {
            nSQL().useDatabase(self.settings.dbname);
            var x = await nSQL('records').query('select').where(['id', '=', document.parent]).exec()
            {
               if (x.length) {
                  if (x[0].type == '__null__') {
                     return document.id
                  }
               }
            }
         }
         document.arrival = Date.now() * 1000
         nSQL().useDatabase(self.settings.dbname);
         var x = await nSQL('records').query('upsert', document).exec()
         if(!noCallback)
         {
            self.onChangeset(self)
         }
         return document.id
      }

      self.loadData = async function (filter) {
         /*
              * Returns an promise resolving to an object with a data property, the data property will be a list of records.  Filter must be
              * an object with a list of keys that are used as fuzzy matchers for the database.
              * 
              * Special keys:
              * I do not like that the Special keys are mixed with normal.  I didn't decide on this, it's a JSGrid compatibility thing.
              * 
              * sortField, sortOrder(ASC or DESC)
              * pageSize, pageIndex, can all be used with pageLoading:true.
              * By default, page size is 100.
              *                 
              */
         filter = filter || {}

         function makeBaseQuery(count) {
            nSQL().useDatabase(self.settings.dbname);

            if (count) {
               var x = nSQL('records').query("select", ["COUNT(*) AS count"]).where(['type', '!=', '__null__']);
            }
            else {
               var x = nSQL('records').query('select').where(['type', '!=', '__null__'])
            }

            //Everything in the DB must match
            for (i in filter) {
               if (filter[i]) {
                  if (((i != 'sortField') && (i != "sortOrder") && (i != "pageSize") && (i != "pageIndex") && (i != "pageLoading"))) {
                     if ((i == 'body') || (i == 'name') || (i == 'title') || (i == 'description')) {
                        x = x.where(["SEARCH(" + i.replace("'", '') + ",'" + filter[i].replace("'", '') + "')", "=", 0])
                     }
                     else {
                        x = x.where([i, '=', filter[i]]);
                     }
                  }
               }
            }
            return x;
         }


         var x = makeBaseQuery();

         if (filter.sortField) {
            x = x.orderBy([filter.sortField + ' ' + (filter.sortOrder || 'ASC').toUpperCase()])
         }

         x = x.limit(filter.pageSize || 100).offset(((filter.pageIndex || 1) - 1) * (filter.pageSize || 100))

         try {

            nSQL().useDatabase(self.settings.dbname);
            var d = await x.exec()
            nSQL().useDatabase(self.settings.dbname);
            var c = await makeBaseQuery(true).exec()
            c = c[0].count
            var toPush = []

            //Rows are smart objects, you can save them back to the DB.
            for (i of d) {
               toPush.push(self.makeExternalEditRow(i))
            }
            return { data: toPush, itemsCount: c }
         }
         catch (e) {

            console.log(e)
         }
      }



      self.connect = async function (url) {

         await self.dbSucess

         // Let us open a web socket
         var ws = new WebSocket(url || "ws://localhost:7001");
         self.connections[url] = ws

         ws.onopen = function () {
            self.statusCallback(true)
            // Web Socket is connected, send data using send()
            ws.send(self.encodeMessage({}));
         };

         ws.onmessage = function (evt) {
            var received_msg = evt.data;

            evt.data.arrayBuffer().then(function (buffer) {
               var buffer2 = new Uint8Array(buffer);
               self.handleIncoming(self.decodeMessage(buffer2), ws);
            }).catch(
               console.log
            )
         };

         ws.onclose = function () {
            self.statusCallback(false)
            setTimeout(10000,
               function () {
                  if (self.connections[url]) {
                     self.connect(url)
                  }
               })
         }
         ws.onerror = function () {
            self.statusCallback(false)
            setTimeout(10000,
               function () {
                  if (self.connections[url]) {
                     self.connect(url)
                  }
               })
         }
      };
   }



   return DrayerDatabaseConnection
}()

