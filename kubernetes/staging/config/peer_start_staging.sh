echo "Start peer node"

peer node start &

sleep 10

export ORDERER_URL="staging-blockchain-orderer:31010"
export CORE_PEER_ADDRESS="staging-blockchain-org1peer1:30110"

export CHANNEL_NAME="channel1"
export CORE_PEER_NETWORKID="nid1"
export FABRIC_CFG_PATH="/etc/hyperledger/fabric"
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH="/fabric/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"

echo "Fetch and Join Channel"

peer channel fetch 0 /rejoin_channel.block -o ${ORDERER_URL} -c ${CHANNEL_NAME}
peer channel join -b /rejoin_channel.block

echo "Install Chaincode"
export CORE_PEER_ADDRESS="staging-blockchain-org1peer1:30110"
cp -r /fabric/config/chaincode /chaincode
cd /chaincode/recordjs

export CHAINCODE_NAME="cc"
export CHAINCODE_VERSION="1.0"
export FABRIC_CFG_PATH="/etc/hyperledger/fabric"
export CORE_PEER_MSPCONFIGPATH="/fabric/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_LOCALMSPID="Org1MSP"

peer chaincode install -n ${CHAINCODE_NAME} -v ${CHAINCODE_VERSION} -p /chaincode/recordjs/ -l node

sleep infinity
