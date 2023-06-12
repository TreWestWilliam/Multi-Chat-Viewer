//Websocket based contact with Twitch's IRC servers
//Assumes you're using this for your own channel.
var TwitchChannel = 'CHANNEL_NAME_HERE';

var WebSocketServer = require('websocket').server;
var WebSocketClient = require('websocket').client;
var WebSocketFrame  = require('websocket').frame;
var WebSocketRouter = require('websocket').router;
var W3CWebSocket = require('websocket').w3cwebsocket;
var events = require('events');
import('node-fetch');

var sendEvent = new events.EventEmitter();
// SET ACCESS TOKEN HERE
var access_token = '';
// IF YOU DONT HAVE AN ACCESS TOKEN GO HERE TO GET ONE
// https://id.twitch.tv/oauth2/authorize?response_type=token&client_id={CLIENT ID}&redirect_uri=http://localhost:3000&scope=chat%3Aread+chat%3Aedit
const client = new WebSocketClient();
const relay = new WebSocketClient();

async function verify() 
{

}

client.connect('ws://irc-ws.chat.twitch.tv:80');
client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    console.log('PASS oauth:'+access_token);
    connection.sendUTF('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands');
    connection.sendUTF('PASS oauth:'+access_token);
    connection.sendUTF('NICK '+TwitchChannel);
    connection.sendUTF('JOIN #'+TwitchChannel);
    //Initial Message Sample
    //connection.sendUTF(`PRIVMSG `+TwitchChannel` : Welcome to the stream!`);
    
    /*
    Repeating Message Example
    setInterval(TOSMSG, 1800000);
    function TOSMSG() 
    {
        connection.sendUTF(`PRIVMSG #`+TwitchChannel+`: Welcome to the stream!`);
    }*/

    relay.connect('ws://127.0.0.1:4444');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('Connection Closed');
        console.log(`close description: ${connection.closeDescription}`);
        console.log(`close reason code: ${connection.closeReasonCode}`);
    });
    
    //Majority of this code is from  https://dev.twitch.tv/docs/irc/example-bot/
    //I had to cut some out when it caused errors
    connection.on('message', function(ircMessage) {
        if (ircMessage.type === 'utf8') {
            let rawIrcMessage = ircMessage.utf8Data.trimEnd();
            console.log(`Message received (${new Date().toISOString()}): '${rawIrcMessage}'\n`);

            let messages = rawIrcMessage.split('\r\n');  // The IRC message may contain one or more messages.
            messages.forEach(message => {
                let parsedMessage = parseMessage(message);
            
                if (parsedMessage) {
                     console.log(`Message command: ${parsedMessage.command.command}`);
                    // console.log(`\n${JSON.stringify(parsedMessage, null, 3)}`)

                    switch (parsedMessage.command.command) {
                        case 'PRIVMSG':
                            sendEvent.emit('connection', parsedMessage);
                            break;
                        case 'PING':
                            connection.sendUTF('PONG ' + parsedMessage.parameters);
                            break;
                        /*case '001':
                            // Successfully logged in, so join the channel.
                            connection.sendUTF(`JOIN ${channel}`); 
                            break; 
                        case 'JOIN':
                            // Send the initial move message. All other move messages are
                            // sent by the timer.
                            connection.sendUTF(`PRIVMSG ${channel} :${moveMessage}`);
                            break;*/
                        case 'PART':
                            console.log('Part sent, rejoining.');
                            //connection.close();
                            connection.sendUTF('JOIN #'+TwitchChannel);
                            break;
                        case 'NOTICE': 
                            // If the authentication failed, leave the channel.
                            // The server will close the connection.
                            if ('Login authentication failed' === parsedMessage.parameters) {
                                console.log(`Authentication failed; left ${channel}`);
                                connection.sendUTF(`PART ${channel}`);
                            }
                            else if ('You don’t have permission to perform that action' === parsedMessage.parameters) {
                                console.log(`No permission. Check if the access token is still valid. Left ${channel}`);
                                connection.sendUTF(`PART ${channel}`);
                            }
                            break;
                        default:
                            ; // Ignore all other IRC messages.
                    }
                }
            });
        }
    });

});

relay.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});
relay.on('connect', function(connection) {
    console.log("connected to chat master");
    connection.send("isTwitch");

    sendEvent.on('connection', function(info) {
        //console.log(info);
        console.log("name:" + info.source.nick);
        console.log("content:" + info.parameters);
        //let msg = `{ "length":1, "0":{"source":"twitch","user":"`+info.source.nick+`","content":"`+info.parameters+`"}}`;
        let msgArr = {}
        msgArr["length"] = 1;
        let innerArr = {};
        innerArr["source"] = "twitch";
        innerArr["user"] = info.source.nick;
        innerArr["content"] = info.parameters;
        msgArr["0"] = innerArr;
        let msg = JSON.stringify(msgArr);
        console.log(msg);
        connection.sendUTF(msg);
    });
});

// Below is code from https://dev.twitch.tv/docs/irc/example-parser/
//its just code to interpret input from twitch
function parseMessage(message) {

    let parsedMessage = {  // Contains the component parts.
        tags: null,
        source: null,
        command: null,
        parameters: null
    };

    // The start index. Increments as we parse the IRC message.

    let idx = 0; 

    // The raw components of the IRC message.

    let rawTagsComponent = null;
    let rawSourceComponent = null; 
    let rawCommandComponent = null;
    let rawParametersComponent = null;

    // If the message includes tags, get the tags component of the IRC message.

    if (message[idx] === '@') {  // The message includes tags.
        let endIdx = message.indexOf(' ');
        rawTagsComponent = message.slice(1, endIdx);
        idx = endIdx + 1; // Should now point to source colon (:).
    }

    // Get the source component (nick and host) of the IRC message.
    // The idx should point to the source part; otherwise, it's a PING command.

    if (message[idx] === ':') {
        idx += 1;
        let endIdx = message.indexOf(' ', idx);
        rawSourceComponent = message.slice(idx, endIdx);
        idx = endIdx + 1;  // Should point to the command part of the message.
    }

    // Get the command component of the IRC message.

    let endIdx = message.indexOf(':', idx);  // Looking for the parameters part of the message.
    if (-1 == endIdx) {                      // But not all messages include the parameters part.
        endIdx = message.length;                 
    }

    rawCommandComponent = message.slice(idx, endIdx).trim();

    // Get the parameters component of the IRC message.

    if (endIdx != message.length) {  // Check if the IRC message contains a parameters component.
        idx = endIdx + 1;            // Should point to the parameters part of the message.
        rawParametersComponent = message.slice(idx);
    }

    // Parse the command component of the IRC message.

    parsedMessage.command = parseCommand(rawCommandComponent);

    // Only parse the rest of the components if it's a command
    // we care about; we ignore some messages.

    if (null == parsedMessage.command) {  // Is null if it's a message we don't care about.
        return null; 
    }
    else {
        if (null != rawTagsComponent) {  // The IRC message contains tags.
            parsedMessage.tags = parseTags(rawTagsComponent);
        }

        parsedMessage.source = parseSource(rawSourceComponent);

        parsedMessage.parameters = rawParametersComponent;
        if (rawParametersComponent && rawParametersComponent[0] === '!') {  
            // The user entered a bot command in the chat window.            
            parsedMessage.command = parseParameters(rawParametersComponent, parsedMessage.command);
        }
    }

    return parsedMessage;
}

// Parses the tags component of the IRC message.

function parseTags(tags) {
    // badge-info=;badges=broadcaster/1;color=#0000FF;...

    const tagsToIgnore = {  // List of tags to ignore.
        'client-nonce': null,
        'flags': null
    };

    let dictParsedTags = {};  // Holds the parsed list of tags.
                              // The key is the tag's name (e.g., color).
    let parsedTags = tags.split(';'); 

    parsedTags.forEach(tag => {
        let parsedTag = tag.split('=');  // Tags are key/value pairs.
        let tagValue = (parsedTag[1] === '') ? null : parsedTag[1];

        switch (parsedTag[0]) {  // Switch on tag name
            case 'badges':
            case 'badge-info':
                // badges=staff/1,broadcaster/1,turbo/1;

                if (tagValue) {
                    let dict = {};  // Holds the list of badge objects.
                                    // The key is the badge's name (e.g., subscriber).
                    let badges = tagValue.split(','); 
                    badges.forEach(pair => {
                        let badgeParts = pair.split('/');
                        dict[badgeParts[0]] = badgeParts[1];
                    })
                    dictParsedTags[parsedTag[0]] = dict;
                }
                else {
                    dictParsedTags[parsedTag[0]] = null;
                }
                break;
            case 'emotes':
                // emotes=25:0-4,12-16/1902:6-10

                if (tagValue) {
                    let dictEmotes = {};  // Holds a list of emote objects.
                                          // The key is the emote's ID.
                    let emotes = tagValue.split('/');
                    emotes.forEach(emote => {
                        let emoteParts = emote.split(':');

                        let textPositions = [];  // The list of position objects that identify
                                                 // the location of the emote in the chat message.
                        let positions = emoteParts[1].split(',');
                        positions.forEach(position => {
                            let positionParts = position.split('-');
                            textPositions.push({
                                startPosition: positionParts[0],
                                endPosition: positionParts[1]    
                            })
                        });

                        dictEmotes[emoteParts[0]] = textPositions;
                    })

                    dictParsedTags[parsedTag[0]] = dictEmotes;
                }
                else {
                    dictParsedTags[parsedTag[0]] = null;
                }

                break;
            case 'emote-sets':
                // emote-sets=0,33,50,237

                let emoteSetIds = tagValue.split(',');  // Array of emote set IDs.
                dictParsedTags[parsedTag[0]] = emoteSetIds;
                break;
            default:
                // If the tag is in the list of tags to ignore, ignore
                // it; otherwise, add it.

                if (tagsToIgnore.hasOwnProperty(parsedTag[0])) { 
                    ;
                }
                else {
                    dictParsedTags[parsedTag[0]] = tagValue;
                }
        } 
    });

    return dictParsedTags;
}

// Parses the command component of the IRC message.

function parseCommand(rawCommandComponent) {
    let parsedCommand = null;
    commandParts = rawCommandComponent.split(' ');

    switch (commandParts[0]) {
        case 'JOIN':
        case 'PART':
        case 'NOTICE':
        case 'CLEARCHAT':
        case 'HOSTTARGET':
        case 'PRIVMSG':
            parsedCommand = {
                command: commandParts[0],
                channel: commandParts[1]
            }
            break;
        case 'PING':
            parsedCommand = {
                command: commandParts[0]
            }
            break;
        case 'CAP':
            parsedCommand = {
                command: commandParts[0],
                isCapRequestEnabled: (commandParts[2] === 'ACK') ? true : false,
                // The parameters part of the messages contains the 
                // enabled capabilities.
            }
            break;
        case 'GLOBALUSERSTATE':  // Included only if you request the /commands capability.
                                 // But it has no meaning without also including the /tags capability.
            parsedCommand = {
                command: commandParts[0]
            }
            break;               
        case 'USERSTATE':   // Included only if you request the /commands capability.
        case 'ROOMSTATE':   // But it has no meaning without also including the /tags capabilities.
            parsedCommand = {
                command: commandParts[0],
                channel: commandParts[1]
            }
            break;
        case 'RECONNECT':  
            console.log('The Twitch IRC server is about to terminate the connection for maintenance.')
            parsedCommand = {
                command: commandParts[0]
            }
            break;
        case '421':
            console.log(`Unsupported IRC command: ${commandParts[2]}`)
            return null;
        case '001':  // Logged in (successfully authenticated). 
            parsedCommand = {
                command: commandParts[0],
                channel: commandParts[1]
            }
            break;
        case '002':  // Ignoring all other numeric messages.
        case '003':
        case '004':
        case '353':  // Tells you who else is in the chat room you're joining.
        case '366':
        case '372':
        case '375':
        case '376':
            console.log(`numeric message: ${commandParts[0]}`)
            return null;
        default:
            console.log(`\nUnexpected command: ${commandParts[0]}\n`);
            return null;
    }

    return parsedCommand;
}

// Parses the source (nick and host) components of the IRC message.

function parseSource(rawSourceComponent) {
    if (null == rawSourceComponent) {  // Not all messages contain a source
        return null;
    }
    else {
        let sourceParts = rawSourceComponent.split('!');
        return {
            nick: (sourceParts.length == 2) ? sourceParts[0] : null,
            host: (sourceParts.length == 2) ? sourceParts[1] : sourceParts[0]
        }
    }
}

// Parsing the IRC parameters component if it contains a command (e.g., !dice).

function parseParameters(rawParametersComponent, command) {
    let idx = 0
    let commandParts = rawParametersComponent.slice(idx + 1).trim(); 
    let paramsIdx = commandParts.indexOf(' ');

    if (-1 == paramsIdx) { // no parameters
        command.botCommand = commandParts.slice(0); 
    }
    else {
        command.botCommand = commandParts.slice(0, paramsIdx); 
        command.botCommandParams = commandParts.slice(paramsIdx).trim();
        // TODO: remove extra spaces in parameters string
    }

    return command;
}

// Code Graveyard
/*
    connection.on('message', function(message) {
        /*
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");

            if (message.utf8Data.includes('PING :tmi.twitch.tv'))
            {
                connection.sendUTF('PONG :' + message.utf8Data.toString().slice(6));
                console.log("PONG :" + message.utf8Data.toString().slice(6));
            }
            else 
            {

            }
        }
    });*/