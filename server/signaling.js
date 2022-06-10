const utils = require("./utils")
const {ResponseBuilder} = require("./response-builder")

const clients = new Map()

var isClientIdsPublic = false
function setIsClientIdsPublic(isPublic) {
	isClientIdsPublic = isPublic
}

function addNewClient(client){
	var id = null

	// prevent id duplicates
	while(id == null || clients.has(id)){
		id = utils.uuidv4()
	}

	client.on("message", data=>{
		handleMessage(id, data)
	})

	client.on("close", () => {
		clients.delete(client)
	})

	

	const metadata = {
		client: client,
		lastUpdateTime: utils.getNowMillis()
	}

	clients.set(id, metadata)

	const res = new ResponseBuilder()
	res.buildTypeInitial(id, metadata.lastUpdateTime)
	client.send(res.getResponse())
}



function handleMessage(requesterId, data){
	try{
		const jsonData = JSON.parse(data)
		const res = new ResponseBuilder()
		var toId = null

		if (jsonData.type == "connectpeer") {
			const peerId = jsonData.peerId

			// Request connection only if not connecting to itself or peer target exists
			if (requesterId != peerId && clients.has(peerId)) {
				toId = peerId
				res.buildTypeIncomingPeer(requesterId, jsonData.sdp)
			}
			
		} else if (jsonData.type == "answerpeer") {
			const peerId = jsonData.peerId

			// Send answer only if not connecting to itself or target exists
			if (requesterId != peerId && clients.has(peerId)) {
				toId = peerId
				res.buildTypeAnswerPeer(requesterId, jsonData.sdp)
			}
		} else if (jsonData.type == "clientids") {
			toId = jsonData.id
			const ids = []
			if (isClientIdsPublic) {
				for(id of clients.keys()){
					ids.push(id)
				}
			}
			
			res.buildTypeClientIds(ids)
		}

		if (toId!= null) {
			clients.get(toId).client.send(res.getResponse())
		}


	}catch(e){
		console.log(e)
	}
	
}




module.exports = {
	addNewClient:addNewClient,
	setIsClientIdsPublic:setIsClientIdsPublic
}

