About config.json structure
```json
{
  "name": "record-network", // whatever name
  "version": "1.0.0", // whatever versiopn
  "client": {
    "tlsEnable": false,
    "organization": "Org1",
    "connection": {
      "timeout": {
        "peer": {
          "endorser": "300"
        }
      }
    }
  },
  "channels": {
    "channel1": { // channel name that match deployed channel
      "peers": {
        "blockchain-org1peer1": {} // peer name match one in yaml file
      },
      "orderers": {
        "blockchain-orderer" : {} // orderer name match one in yaml file
      }
    }
  },
  "organizations": {
    "Org1": {
      "mspid": "Org1MSP",
      "peers": [
        "blockchain-org1peer1" // peer name match one in yaml file
      ],
      "certificateAuthorities": [
        "CA1" // CA Name from yaml file (see: FABRIC_CA_SERVER_CA_NAME)
      ]
    },
    "OrdererMSP": {
      "mspid": "OrdererMSP"
    }
  },
  "peers": { 
    "blockchain-org1peer1": { // peer name match one in yaml file
      "tlsCACerts": {
        "path":
          "/fabric/crypto-config/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt"
      },
      "url": "grpc://blockchain-org1peer1:30110", // peer URL match CORE_PEER_ADDRESS
      "grpcOptions": {
        "ssl-target-name-override": "peer0.org1.example.com"
      }
    }
  },
  "orderers": {
    "blockchain-orderer": {
      "url": "grpc://blockchain-orderer:31010" // URL match CONFIGTX_ORDERER_ADDRESSES
    }
  },
  "certificateAuthorities": {
    "CA1": { // CA Name from yaml file (see: FABRIC_CA_SERVER_CA_NAME)
      "tlsCACerts": {
        "path":
          "/fabric/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
      },
      "url": "http://blockchain-ca:7054", // 'blockchain-ca' from CA deployment name, 7054 is port that expose
      "httpOptions": {
        "verify": false
      }
    }
  }
}
```