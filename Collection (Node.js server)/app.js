import WebSocket, { WebSocketServer } from 'ws';
console.log('Starting...');

const display = [];
let chat = {};
let chatIterator = 0;

  // This should only be used for system messages
  function sysMessage(content) 
  {
    let message = {"source":"system","content":content};
    chat[chatIterator] = message;
    chatIterator++;
  }

  function chatMessage(content, username, source) 
  {
    let message = {"source":source,"user":username,"content":content};
    chat[chatIterator.toString()] = message;
    chatIterator++;
  }

const server = new WebSocketServer ({
    port:4444,
    noserver:true,
    clientTracking:true
})

server.on('connection', function connection(ws) {
    ws.on('error', console.error);
    //ws.send(`Your Client ID ${client}`);
    console.log(`New Connection`);

    ws.on('message', function message(data, client) {
        console.log(`Received message ${data} from user ${client}`);
        if (data == "isListener") 
        {
            ws.send("Welcome, Listener!");
            sysMessage("Successful first send");
            chatMessage("This is a test of displaying youtube","yt-test","youtube");
            chatMessage("This is a test of displaying twitch","ttv-test","twitch");
        } else if (data =="msgplz") 
        {
            if(chatIterator > 0) 
            {
                chat["length"]=chatIterator;
                ws.send(JSON.stringify(chat));
                chat = {};
                chatIterator =0;
            }
            else {
                ws.send("NoData");
            }
        } else if (data.toString().charAt(0) =='{') // from this we can probably expect JSON
        {
            let chatJson = JSON.parse(data);
            if (chatJson.length != null) 
            {
                for (let i=0;i<chatJson.length;i++) 
                {
                    chatMessage(chatJson[i].content,chatJson[i].user,chatJson[i].source);
                }
            }
        }

        });

    ws.send('something');
});

