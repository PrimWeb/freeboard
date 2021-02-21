

# This file manages kaithem's native SQLite document database.

# There is one table called Document

import sqlite3
import time
import json
import uuid as uuidModule
import random
import configparser
import os
import libnacl
import base64
import struct
import uuid

# from scullery import messagebus

# class DocumentView():
#     def __init__(self,database,uuid):
#         self.database = database
#         self.uuid = uuid

#     def __getitem__(self,key):

#         #Look for a prop record first, then look for an actual key in that document's table
#         cur = self.database.conn.cursor()
#         cur.execute("SELECT document FROM document WHERE parent=? AND type=? AND name=?", (self.uuid,".prop",key))
#         x= curr.fetchone()
#         if x:
#             return x[0]


#         cur = self.database.conn.cursor()
#         cur.execute("SELECT (document,type) FROM document WHERE uuid=?", (self.uuid,))
#         x= curr.fetchone()
#         if x:
#             if key in x[0]:
#                 return x[0][key]

import socket
import re
import threading
import weakref
import uuid
import time
import struct




databaseBySyncKeyHash = weakref.WeakValueDictionary()

import asyncio
import websockets


class Session():
    def __init__(self):
        self.alreadyDidInitialSync = False

        #When you send the client all new changes
        #Set this flag to say what the most recent messaage is, so you can then
        #Get all more recent messages than that.
        self.lastResyncFlushTime = 0


async def DBAPI(websocket, path):
    session = Session()
    try:
        a = await websocket.recv()

        databaseBySyncKeyHash[a[:16]].dbConnect()

        await websocket.send(databaseBySyncKeyHash[a[:16]].handleBinaryAPICall(a,session))
        databaseBySyncKeyHash[a[:16]].subscribers[time.time()] = websocket

        db = databaseBySyncKeyHash[a[:16]]

        while not websocket.closed:
            try:
                a = await asyncio.wait_for(websocket.recv(), timeout=5)
                await websocket.send(databaseBySyncKeyHash[a[:16]].handleBinaryAPICall(a,session))
            except asyncio.TimeoutError:
                pass

            if db.lastChange > session.lastResyncFlushTime:
                pass

    except websockets.exceptions.ConnectionClosedOK:
        pass
    


def startServer(port):
    start_server = websockets.serve(DBAPI, "localhost", port)
    asyncio.get_event_loop().run_until_complete(start_server)
    #DB will eventually handle consistency by itself.
    t = threading.Thread(target= asyncio.get_event_loop().run_forever, daemon=True)
    t.start()

startServer(7001)



class LPDPeer():
    def parseLPD(self, m):
        if not 'BT-SEARCH' in m:
            return {}
        d = {}
        for i in re.findall('^(.*)?: *(.*)\r+$', m, re.MULTILINE):
            d[i[0]] = i[1]
        print(d)
        return d

    def makeLPD(self, m):
        return "BT-SEARCH * HTTP/1.1\r\nHost:{Host}\r\nPort: {Port}\r\nInfohash: {Infohash}\r\ncookie: {cookie}>\r\n\r\n\r\n".format(**m).encode('utf8')

    def poll(self):
        try:
            d, addr = self.msock.recvfrom(4096)
        except socket.timeout:
            return

        msg = self.parseLPD(d.decode('utf-8', errors='ignore'))

        if msg:
            if not msg.get('cookie', '') == self.cookie:
                with self.lock:
                    if msg['Infohash'] in self.activeHashes:
                        self.discoveries.append(
                            (msg['Infohash'], addr[0], msg['Port'], time.time()))
                        if len(self.discoveries) > 1024*64:
                            self.discoveries.pop(False)
                        self.advertise(msg['Infohash'])

    def advertise(self, hash, port=None):
        if not hash in self.activeHashes:
            raise ValueError("Unknown hash, must specify port")

        if self.lastAdvertised.get(hash, 0) > time.time()+10:
            return
        self.msock.sendto(self.makeLPD(
            {'Infohash': hash, 'Port': self.activeHashes[hash], 'cookie': self.cookie, 'Host': '239.192.152.143'}), ("239.192.152.143", 6771))
        self.lastAdvertised[hash] = time.time()

    def getByHash(self, hash):
        with self.lock:
            return [i for i in self.discoveries if i[0] == hash]

    def __init__(self):
        self.msock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.msock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        self.msock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.msock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        # Bind to the server address
        self.msock.bind(("239.192.152.143", 6771))
        self.msock.settimeout(1)

        group = socket.inet_aton("239.192.152.143")
        mreq = struct.pack('4sL', group, socket.INADDR_ANY)
        self.msock.setsockopt(
            socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)

        self.cookie = str(uuid.uuid4())

        self.lastAdvertised = {}

        # hash:port mapping
        self.activeHashes = {}
        self.discoveries = []

        self.lock = threading.Lock()

        self.thread = threading.Thread(
            target=makeLoopWorker(weakref.ref(self)))
        self.thread.start()


def jsonEncode(d):
    return json.dumps(d, sort_keys=True, indent=0, separators=(',', ':'))


# # Using challenge response, nodes can identify

import shutil
if not os.path.exists(os.path.expanduser("~/.drayerdb/config/nodeid-secret")):
    os.makedirs(os.path.expanduser("~/.drayerdb/config/"), 0o700, exist_ok=True)
    with open(os.path.expanduser("~/.drayerdb/config/nodeid-secret"),'w') as f:
        f.write(base64.b64encode(os.urandom(32)).decode("utf8"))

with open(os.path.expanduser("~/.drayerdb/config/nodeid-secret")) as f:
    nodeID = base64.b64decode(f.read().strip())



class DocumentDatabase():
    def __init__(self, filename):

        self.filename = os.path.abspath(filename)
        self.threadLocal = threading.local()


        #Deterministically generate a keypair that we will use to sign all correspondance
        self.localNodeVK, self.localNodeSK = libnacl.crypto_sign_seed_keypair(libnacl.crypto_generichash(os.path.basename(filename).encode("utf8"),nodeID))
        print(len(self.localNodeVK),self.localNodeVK,90)

        #Websockets that are subscribing to us.
        self.subscribers = weakref.WeakValueDictionary()

        self.dbConnect()

        self.config = configparser.ConfigParser()

        if os.path.exists(filename+".conf"):
            self.config.read(filename+".conf")

        self.threadLocal.conn.row_factory = sqlite3.Row
        # self.threadLocal.conn.execute("PRAGMA wal_checkpoint=FULL")
        self.threadLocal.conn.execute("PRAGMA secure_delete = off")

        # Yep, we're really just gonna use it as a document store like this.
        self.threadLocal.conn.execute(
            '''CREATE TABLE IF NOT EXISTS document (rowid integer primary key, json text, signature text, localinfo text)''')

        self.threadLocal.conn.execute('''CREATE TABLE IF NOT EXISTS meta
             (key text primary key, value  text)''')

        self.threadLocal.conn.execute('''CREATE TABLE IF NOT EXISTS peers
             (peerID text primary key, lastArrival integer, info text)''')

        # To keep indexing simple and universal, it only works on three properties.  _tags, _description and _body.
        self.threadLocal.conn.execute('''
             CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(tags, description, body, content='')''')

        self.threadLocal.conn.execute(
            '''CREATE INDEX IF NOT EXISTS document_parent ON document(json_extract(json,"$.parent")) WHERE json_extract(json,"$.parent") IS NOT null ''')
        self.threadLocal.conn.execute(
            '''CREATE INDEX IF NOT EXISTS document_link ON document(json_extract(json,"$.link")) WHERE json_extract(json,"$.link") IS NOT null''')
        self.threadLocal.conn.execute(
            '''CREATE INDEX IF NOT EXISTS document_name ON document(json_extract(json,"$.name"))''')
        self.threadLocal.conn.execute(
            '''CREATE INDEX IF NOT EXISTS document_id ON document(json_extract(json,"$.id"))''')
        self.threadLocal.conn.execute(
            '''CREATE INDEX IF NOT EXISTS document_type ON document(json_extract(json,"$.type"))''')

        self.threadLocal.conn.execute(
            """
            CREATE TRIGGER IF NOT EXISTS search_index AFTER INSERT ON document BEGIN
            INSERT INTO search(rowid, tags, description, body) VALUES (new.rowid, IFNULL(json_extract(new.json,"$.tags"), ""), IFNULL(json_extract(new.json,"$.description"), ""), IFNULL(json_extract(new.json,"$.body"), ""));
            END;
            """)

        self.threadLocal.conn.execute(
            """   CREATE TRIGGER IF NOT EXISTS search_delete AFTER DELETE ON document BEGIN
            INSERT INTO search(search, rowid, tags, description, body) VALUES ('delete', old.rowid, IFNULL(json_extract(old.json,"$.tags"), ""), IFNULL(json_extract(old.json,"$.description"), ""), IFNULL(json_extract(old.json,"$.body"), ""));
            END;""")

        self.threadLocal.conn.execute(
            """
            CREATE TRIGGER IF NOT EXISTS search_update AFTER UPDATE ON document BEGIN
            INSERT INTO search(search, rowid, tags, description, body) VALUES ('delete', old.rowid, IFNULL(json_extract(old.json,"$.tags"), ""), IFNULL(json_extract(old.json,"$.description"), ""), IFNULL(json_extract(old.json,"$.body"), ""));
            INSERT INTO search(rowid, tags, description, body) VALUES (new.rowid, IFNULL(json_extract(new.json,"$.tags"), ""), IFNULL(json_extract(new.json,"$.description"), ""), IFNULL(json_extract(new.json,"$.body"), ""));
            END;
            """
        )

        self.keys = configparser.ConfigParser()

        if os.path.exists(filename+".keys"):
            self.keys.read(filename+".keys")

        pk = base64.b64decode(self.keys.get('key', 'public', fallback=''))
        sk = base64.b64decode(self.keys.get('key', 'secret', fallback=''))

        # Generate a keypair for this particular node.
        if not (pk and sk):
            pk, sk = libnacl.crypto_sign_keypair()
            try:
                self.keys.add_section("key")
            except:
                pass
            self.keys.set('key', 'public', base64.b64encode(pk).decode('utf8'))
            self.keys.set('key', 'secret', base64.b64encode(sk).decode('utf8'))

            # Add our new key to the approved list, for our local copy.
            if 'approved' not in self.config:
                self.config.add_section('approved')
                self.config.set('approved', 'autogenerated',
                                base64.b64encode(pk).decode())
            self.saveConfig()

        self.publicKey = pk
        self.secretKey = sk

        if 'sync' not in self.config:
            self.config.add_section('sync')
            self.config.set('sync', 'syncKey', base64.b64encode(os.urandom(24)).decode('utf8') )
            self.config.set('sync', 'writePassword', base64.b64encode(os.urandom(24)).decode('utf8') )
            self.saveConfig()

        self.syncKey = self.config.get('sync','syncKey',fallback=None)
        self.writePassword = self.config.get('sync', 'writePassword',fallback='')


        if self.syncKey:
            databaseBySyncKeyHash[libnacl.crypto_generichash(self.syncKey.encode("utf8"))[:16]] = self
        if self.writePassword:
            databaseBySyncKeyHash[libnacl.crypto_generichash(self.writePassword.encode("utf8"))[:16]] = self

        print(list(databaseBySyncKeyHash.keys()))
        self.approvedPublicKeys = {}

        if 'approved' in self.config:
            for i in self.config['approved']:
                # Reverse lookup
                self.approvedPublicKeys[self.config['approved'][i]] = i

    def dbConnect(self):
        if not hasattr(self.threadLocal,'conn'):
            self.threadLocal.conn = sqlite3.connect(self.filename)


    def connectToServer(self,uri):
        "Open a new sync connection to a server."
        async def f(self):
            async with websockets.connect(uri) as websocket:
                name = input("What's your name? ")

                await websocket.send(name)
                print(f"> {name}")

                greeting = await websocket.recv()
                print(f"< {greeting}")

        asyncio.create_task(f)



    def handleBinaryAPICall(self, a, sessionObject=None):
        # Process one incoming binary API message.  If part of a sesson, using a sesson objert enables certain features.

        #Get the key hint
        k = a[:16]
        a=a[16:]


        # Get timestamp which is also the nonce
        remoteNodeID = a[:32]
        a=a[32:]

        #Verify that it is from who we think
        a=libnacl.crypto_sign_open(a,remoteNodeID)

        tbytes = a[:8]
        t = struct.unpack("<Q", tbytes)[0]
        # reject very old stuff
        if t < (time.time()-3600)*1000000:
            return {}

        # Get the data
        d = a[8:]



        #We can use either the real key, or the write password, which is only used for "centralized mode"
        if k == libnacl.crypto_generichash(self.syncKey.encode("utf8").ljust(32,b'\0'))[:16]:
            openingKey = self.syncKey
            writePassword=False

        elif k==libnacl.crypto_generichash(self.writePassword.encode("utf8").ljust(32,b'\0'))[:16]:
            openingKey=self.writePassword
            writePassword = True
        else:
            raise RuntimeError("Bad key hint")

        openingKey = openingKey.encode("utf8").ljust(32,b'\0')


        d = libnacl.crypto_secretbox_open(d, a[:8]+b'\0'*16, openingKey)
        d = json.loads(d)

      



        r = {'records': []}


        if sessionObject and not sessionObject.alreadyDidInitialSync:
            cur = self.threadLocal.conn.cursor()
            cur.execute(
                "SELECT lastArrival FROM peers WHERE peerID=?", (remoteNodeID,))

            c = cur.fetchone()
            if c:
                c=c[0]
            else:
                c=0
            #No falsy value allowed, that would mean don't get new arrivals
            r['getNewArrivals'] = c or 1
            sessionObject.alreadyDidInitialSync= True

      

        if "getNewArrivals" in d:
            cur = self.threadLocal.conn.cursor()
            #Avoid dumping way too much at once
            cur.execute(
                "SELECT json,signature FROM document WHERE json_extract(json,'$.arrival')>? LIMIT 100", (d['getNewArrivals'],))
            
            #Declares that there are no records left out in between this time and the first time we actually send
            r['recordsStartFrom'] = d['getNewArrivals']

            for i in cur:
                if not 'records' in r:
                    r['records']=[]
                print(i)
                r['records'].append([i[0], base64.b64encode(i[1]).decode()])
            
                sessionObject.lastResyncFlushTime = max(sessionObject.lastResyncFlushTime, json.loads(i[0])['arrival']  )

        if "records" in d and d['records']:
            for i in d['records']:
                #No need sig verify, if we are using PW verification.
                #Set a flag to request that the server send us any records that came after the last one, 
                self.setDocument(i[0], None if writePassword else i[1])
                r['getNewArrivals'] = i[0]['arrival']

            #Set a flag saying that
            cur = self.threadLocal.conn.cursor()
            #If the recorded lastArrival is less than the incoming recordsStartFrom, it would mean that there is a gap in which records
            #That we don't know about could be hiding.   Don't update the timestamp in that case, as the chain is broken.
            #We can still accept new records, but we will need to request everything all over again starting at the breakpoint to fix this.
            cur.execute("UPDATE peers SET lastArrival=? WHERE peerID=? AND lastArrival !=? AND lastArrival>=?", ( r['getNewArrivals'], remoteNodeID, r['getNewArrivals'], r.get("recordsStartFrom")))

        return self.encodeMessage(r)


    def getUpdatesForSession(self,session):

        #Don't send anything till they have requested something, ohterwise we will just be sending nonsense they already have
        if session.lastResyncFlushTime:
            r = {}
            cur = self.threadLocal.conn.cursor()
            #Avoid dumping way too much at once
            cur.execute(
                "SELECT json,signature FROM document WHERE json_extract(json,'$.arrival')>? LIMIT 100", (session.lastResyncFlushTime,))
            
            #Declares that there are no records left out in between this time and the first time we actually send
            r['recordsStartFrom'] = d['getNewArrivals']

            for i in cur:
                if not 'records' in r:
                    r['records']=[]
                r['records'].append([i[0], base64.b64encode(i[1]).decode()])
            
                session.lastResyncFlushTime = max(session.lastResyncFlushTime, json.loads(i[0])['arrival']  )
        #We can of course just send nothing if there are no changes to flush.
        if r:
            return self.encodeMessage(r)

    def createBinaryWriteCall(self, r,sig=None):

        "Creates a binary command representing arequest to insert a record."
        p = self.config.get('sync', 'writePassword',fallback=None)
        if not p:
            if not sig:
                raise RuntimeError("You do not have the writePassword and this record is unsigned")

        d = {
            "writePassword":libnacl.crypto_generichash(p),
            "insertDocuments":[r,sig]
        }

       
        return encodeMessage(d,True)

    def encodeMessage(self, d, useWritePassword=False):
        "Given a JSON message, encode it so as to be suitable to send to another node"
        if useWritePassword and not self.writePassword:
            raise RuntimeError("You don't have a write password")
        
        pw = self.writePassword if useWritePassword else self.syncKey

        pw = pw.encode("utf8").ljust(32,b'\0')

        r=jsonEncode(d).encode('utf8')
        t= struct.pack("<Q",int(time.time()*1000000))
        r = libnacl.crypto_secretbox(r,t+b'\0'*16, pw)
        return libnacl.crypto_generichash(pw)[:16] + self.localNodeVK+ libnacl.crypto_sign(t+r, self.localNodeSK)

    def createBinaryWriteCall(self, r,sig=None):
        "Creates a binary command representing arequest to insert a record."
        p = self.config.get('sync', 'writePassword',fallback=None)
        if not p:
            if not sig:
                raise RuntimeError("You do not have the writePassword and this record is unsigned")



        d = {
            "writePassword":libnacl.crypto_generichash(p),
            "insertDocuments":[r,sig]
        }

        return encodeMessage(d)



    def getMeta(self, key):
        cur = self.threadLocal.conn.cursor()
        cur.execute(
            "SELECT value FROM meta WHERE key=?", (key,))
        x = cur.fetchone()
        if x:
            return x[0]

    def setMeta(self, key, value):
        self.threadLocal.conn.execute(
            "INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=?", (key, value, value))

    def setConfig(self, section, key, value):
        try:
            self.config.addSection(section)
        except:
            pass
        self.config.set(section, key, value)

    def commit(self):
        self.dbConnect()
        self.threadLocal.conn.commit()

    def saveConfig(self):
        with open(self.filename+".conf", 'w') as configfile:
            self.config.write(configfile)
        with open(self.filename+".keys", 'w') as configfile:
            self.keys.write(configfile)

    def __enter__(self):
        self.threadLocal.conn.__enter__
        return self

    def __exit__(self, *a):
        self.threadLocal.conn.__exit__

        ts = int((time.time())*10**6)

    def setDocument(self, doc, signature=b''):
        if not signature and not self.secretKey:
            raise ValueError(
                "Cannot sign any new documents, you do not have the keys:"+str(self.secretKey))

        if signature:
            if not isinstance(doc, str):
                raise ValueError(
                    "Doc ,ust be an exact JSON string when providing a signature")
            key = signature.split(":")
            if not key in self.approvedPublicKeys:
                raise RuntimeError("Message was signed with a bad key")

            libnacl.crypto_sign_verify_detached(base64.b64decode(
                signature.split(":")[1], libnacl.crypto_generichash(doc.encode('utf8')), base64.b64decode(key)))

            doc = json.loads(doc)

        doc['time'] = doc.get('time', time.time()*1000000)
        doc['arrival'] = doc.get('arrival', time.time()*1000000)
        doc['id'] = doc.get('id', str(uuid.uuid4()))
        doc['name'] = doc.get('name', doc['id'])
        doc['type'] = doc.get('type', '')

        # If a UUID has been supplied, we want to erase any old record bearing that name.
        cur = self.threadLocal.conn.cursor()
        cur.execute(
            'SELECT json_extract(json,"$.time") FROM document WHERE  json_extract(json,"$.id")=?', (doc['id'],))
        x = cur.fetchone()
        
        d = jsonEncode(doc)
        # If we are generating a new message, sign it automatically.
        if not signature:
            signature = libnacl.crypto_sign(libnacl.crypto_generichash(d.encode('utf8')), self.secretKey)

        if x:
            # Check that record we are trying to insert is newer, else ignore
            if x[0] < doc['time']:
                self.threadLocal.conn.execute("UPDATE document SET json=?, signature=? WHERE json_extract(json,'$.id')=?", (d, signature,  doc['id']))

                # If we are marking this as deleted, we can ditch everything that depends on it.
                # We don't even have to just set them as deleted, we can relly delete them, the deleted parent record
                # is enough for other nodes to know this shouldn't exist anymore.
                if doc['type'] == "null":
                    self.threadLocal.conn.execute(
                        "DELETE FROM document WHERE json_extract(json,'$.id')=?", (doc['id'],))

                return doc['id']
            else:
                return doc['id']


      
        self.threadLocal.conn.execute(
            "INSERT INTO document VALUES (null,?,?,?)", (d, signature, ''))

        return doc['id']

    def getDocumentByID(self, key):
        cur = self.threadLocal.conn.cursor()
        cur.execute(
            "SELECT json from document WHERE json_extract(json,'$.id')=?", (key,))
        x = cur.fetchone()
        if x:
            return x[0]





if __name__=="__main__":

    d = DocumentDatabase("test.db")

    with d:
        for i in range(1):

            # Parent document
            id = d.setDocument({
                'someUserData': 9908
            })

            # Child document
            d.setDocument({
                'parent': id
            })

            print(d.getDocumentByID(id))


    d.commit()

    d.handleBinaryAPICall(d.encodeMessage({}))

time.sleep(100000)
