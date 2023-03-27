let messageElement = "yt-live-chat-text-message-renderer";
let nameSpanID = 'author-name';
let messageID = 'message';

let chat = {}
let chatIterator = 0;
let interval;

function testFind() 
{
    console.log("Testing find");
    let find = document.getElementsByTagName(messageElement);
    while(find.length > 0)
    {
        console.log(find[0]);
        let content = find[0].children[1];
        console.log(content);
        let message = content.children[2];
        console.log(message.innerHTML);
        let userContainer = content.children[1];
        let username = userContainer.children[1].innerHTML;
        username = username.substr(0,username.search("<"));
        console.log(username);
        
        addChat(username,message.innerHTML);
        
        find[0].parentNode.removeChild(find[0]);
        
    }
}
//testFind();

function addChat(user, content) 
{
    //chat[chatIterator] = {"source":"youtube","user":user,"content":content}
    //chatIterator++;
    
    let msg = {length:1,0:{"source":"youtube","user":user,"content":content}};
    socket.send(JSON.stringify(msg));
}

function send()
{
    if (chatIterator > 0) 
    {
        chat["length"] = chatIterator
        socket.send(JSON.stringify(chat));
        chatIterator=0;    
        chat={};
    }
    
}

function heartBeat() {
    testFind();
    send();
    if (socket.readyState != WebSocket.CLOSED) {
    setTimeout(heartBeat,500);
        //clearInterval(interval);
    }
}


let socket = new WebSocket("ws://127.0.0.1:4444");
let currentTimeout;
socket.onopen = function(e) {
    console.log("[open] Connection Established!");
    console.log("Messaging server");
    socket.send("isYoutube");
    interval = setTimeout(heartBeat,333);
};