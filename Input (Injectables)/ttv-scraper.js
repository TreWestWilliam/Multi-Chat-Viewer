let chat = {}
let chatIterator = 0;

let socket = new WebSocket("ws://127.0.0.1:4444");
let interval;

function testFind() 
{
    console.log("Testing find");
    let find = document.getElementsByClassName("Layout-sc-1xcs6mc-0 cZxfJz chat-line__no-background");
    let bottom = false;
    let iterator = find.length-1;
    while(iterator > 0)
    {
        if (find[iterator].textContent=="loaded") 
        {
            console.log("Repeat case found");
            console.log(find[iterator].style);
            bottom=true;
            break;
        }
        
        if (iterator > find.length) 
        {
            console.log("iterator exceeds length")
            bottom=true;
            break;
        }
        
        console.log(find[iterator]);
        
        try
        {
            let username = find[iterator].querySelector(".chat-author__display-name").innerHTML;
            let message = find[iterator].querySelector(".text-fragment").innerHTML;
            console.log(find[iterator]);
            console.log(message);
            console.log(username);
            addChat(username,message);
        }
        catch(e) 
        {
            console.log(e);
        }
        finally{
            //find[iterator].style = "display:none;"
            find[iterator].textContent="loaded";
        }
        iterator--;
    }
}
//testFind();

function addChat(user, content) 
{
    let msg = {length:1,0:{"source":"twitch","user":user,"content":content}};
    socket.send(JSON.stringify(msg));
}
function heartBeat() {
    testFind();
    //send();
    if (socket.readyState == WebSocket.CLOSED) {
    //setInterval(heartBeat,1500);
        clearInterval(interval);
    }
}

let currentTimeout;
socket.onopen = function(e) {
    console.log("[open] Connection Established!");
    console.log("Messaging server");
    socket.send("isTwitch");
    interval = setInterval(heartBeat,1500);
};
currentTimeout();



        //let username = obj.childNodes[1].childNodes[1].childNodes[0].childNodes[0].innerHTML;

        /*
        let user = obj.childNodes[1];
        console.log('User: ' + user);
        let usern = user.childNodes[1];
        console.log('Usern: ' + usern);
        let userna = usern.childNodes[0];
        console.log('Userna: ' + userna);
        let usernam = userna.childNodes[0];
        console.log('Usernam: ' + usernam);
        let username = usernam.innerHTML;
        console.log('username:'+username);
        */
        //let message = obj.childNodes[3].childNodes[0].innerHTML;

/*
        let user = obj.childNodes[1];
        console.log(user);
        let usern = user.childNodes[1];
        console.log(usern);
        let userna = usern.childNodes[0];
        console.log(userna);
        let usernam = userna.childNodes[0];
        console.log(usernam);
        let username = usernam.innerHTML;*/