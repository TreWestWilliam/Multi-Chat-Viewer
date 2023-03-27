# Multi Chat Viewer
 A multi part application for the enumeration of multiple sources of live stream chat for the purpose of seamless display/integration with a stream.

How it works:
Each input is javascript meant to be injected into a direct view of the chat (I.E. The Chat popout window)

The input sends the messages to the Collection server for potential processing and enumeration.

The collection server is a Node.js based websocket server utilizing ws.  You'll have to download ws to utilize it.

The Output then will ask the collection server for all the data it has in order to display it.

Currently the outputs are all luma keyed for display within OBS.

See more on my blog: https://trewest.dev/blog/index.php/2023/03/27/project-multi-chat-viewer/