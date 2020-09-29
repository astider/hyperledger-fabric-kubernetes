# For original README go to "README-original.md"

## Note

We need to deploy Hyperledger Fabric Network in **two** separate environment. So for every step the working directory should be in the environment that you want to deploy (which are `kubernetes/production` or `kubernetes/staging`)

## DEPLOY PROCESS

### Step 1: Checking environment

First let's make sure we have Kubernetes environment up & running:
```sh
kubectl get nodes
```

### Step 2: Setting up shared storage (NFS)

```sh 
kubectl apply -f 01-nfs-deployment.yaml
kubectl apply -f 02-nfs-pv.yaml
```

### Step 3: Launching a Fabric Tools helper pod

```sh
kubectl apply -f 03-fabric-tools.yaml
```

Make sure the `fabric-tools` `Pod` is running before we continue:
```sh
kubectl get pods
```

Now, assuming `fabric-tools` `Pod` is running, let's create a config directory on our shared filesystem to hold our files:
```sh
# Prod
kubectl exec -it production-fabric-tools -- mkdir /fabric/config

# Staging
kubectl exec -it staging-fabric-tools -- mkdir /fabric/config
```

### Step 4: Loading the config files into the storage

1 - Configtx  

Now let's copy the file we just created to our shared filesystem:
```sh 
# Prod
kubectl cp config/configtx.yaml production-fabric-tools:/fabric/config/

# Staging
kubectl cp config/configtx.yaml staging-fabric-tools:/fabric/config/
```

2 - Crypto-config  

Let's copy the file to our shared filesystem: 
```sh
# Prod
kubectl cp config/crypto-config.yaml production-fabric-tools:/fabric/config/

# Staging
kubectl cp config/crypto-config.yaml staging-fabric-tools:/fabric/config/
```

3 - Chaincode  
It's time to copy our example chaincode to the shared filesystem. In this case we'll be using balance-transfer example:
```sh
# Prod
kubectl cp config/chaincode/ production-fabric-tools:/fabric/config/

# Staging
kubectl cp config/chaincode/ staging-fabric-tools:/fabric/config/
```

### Step 5: Creating the necessary artifacts

1 - cryptogen  
Time to generate our crypto material:
```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash

# After exec inside the pod
cryptogen generate --config /fabric/config/crypto-config.yaml
exit
```

Now we're going to copy our files to the correct path and rename the key files:
```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash

# After exec inside the pod
cp -r crypto-config /fabric/
for file in $(find /fabric/ -iname *_sk); do echo $file; dir=$(dirname $file); mv ${dir}/*_sk ${dir}/key.pem; done
exit
```


2 - configtxgen  
Now we're going to copy the artifacts to the correct path and generate the genesis block:
```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash

# After exec inside the pod
cp /fabric/config/configtx.yaml /fabric/
cd /fabric
configtxgen -profile OneOrgOrdererGenesis -outputBlock genesis.block
exit
``` 

3 - Anchor Peers  
(We deploy only one org)
Lets create the Anchor Peers configuration files using configtxgen: 
```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash
cd /fabric
configtxgen -profile OneOrgChannel -outputAnchorPeersUpdate ./Org1MSPanchors.tx -channelID channel2 -asOrg Org1MSP

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash
cd /fabric
configtxgen -profile OneOrgChannel -outputAnchorPeersUpdate ./Org1MSPanchors.tx -channelID channel1 -asOrg Org1MSP

exit
```

4 - Fix Permissions  
We need to fix the files permissions on our shared filesystem now:
```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash

# After exec inside the pod
chmod a+rx /fabric/* -R
exit
```


### Step 6: Setting up Fabric CA

```sh
kubectl apply -f 04-blockchain-ca_deploy.yaml
kubectl apply -f 05-blockchain-ca_svc.yaml
```


### Step 7: Setting up Fabric Orderer

```sh
kubectl apply -f 06-blockchain-orderer_deploy.yaml
kubectl apply -f 07-blockchain-orderer_svc.yaml
```

### Step 8: Peer Org1MSP

Note that we create only single peer (the original one create 4 peers)

```sh
kubectl apply -f 08-blockchain-org1peer1_deploy.yaml
kubectl apply -f 09-blockchain-org1peer1_svc.yaml
```

### Step 9: Create Channel
Now its time to create our channel:
```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash
export CHANNEL_NAME="channel2"

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash
export CHANNEL_NAME="channel1"

# After exec inside
cd /fabric
configtxgen -profile OneOrgChannel -outputCreateChannelTx ${CHANNEL_NAME}.tx -channelID ${CHANNEL_NAME}

# Prod
export ORDERER_URL="production-blockchain-orderer:31010"

# Staging
export ORDERER_URL="staging-blockchain-orderer:31010"

# Then
export CORE_PEER_ADDRESSAUTODETECT="false"
export CORE_PEER_NETWORKID="nid1"
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH="/fabric/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/"
export FABRIC_CFG_PATH="/etc/hyperledger/fabric"
peer channel create -o ${ORDERER_URL} -c ${CHANNEL_NAME} -f /fabric/${CHANNEL_NAME}.tx 
exit
```

### Step 10: Join Channel

- Org1MSP  
Let's join Org1MSP to our channel:
```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash
export ORDERER_URL="production-blockchain-orderer:31010"
export CORE_PEER_ADDRESS="production-blockchain-org1peer1:30110"
export CHANNEL_NAME="channel2"

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash
export ORDERER_URL="staging-blockchain-orderer:31010"
export CORE_PEER_ADDRESS="staging-blockchain-org1peer1:30110"
export CHANNEL_NAME="channel1"

# After exec inside
export CORE_PEER_NETWORKID="nid1"
export FABRIC_CFG_PATH="/etc/hyperledger/fabric"
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH="/fabric/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"

peer channel fetch newest -o ${ORDERER_URL} -c ${CHANNEL_NAME}
peer channel join -b ${CHANNEL_NAME}_newest.block
```

### Step 11: Install Chaincode

```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash
export CORE_PEER_ADDRESS="production-blockchain-org1peer1:30110"

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash
export CORE_PEER_ADDRESS="staging-blockchain-org1peer1:30110"

# After exec inside
cp -r /fabric/config/chaincode /chaincode
cd /chaincode/recordjs
npm install

export CHAINCODE_NAME="cc"
export CHAINCODE_VERSION="1.0"
export FABRIC_CFG_PATH="/etc/hyperledger/fabric"
export CORE_PEER_MSPCONFIGPATH="/fabric/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_LOCALMSPID="Org1MSP"

peer chaincode install -n ${CHAINCODE_NAME} -v ${CHAINCODE_VERSION} -p /chaincode/recordjs/ -l node
exit
```

### Step 12: Instantiate Chaincode

```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash

export CORE_PEER_ADDRESS="production-blockchain-org1peer1:30110"
export ORDERER_URL="production-blockchain-orderer:31010"
export CHANNEL_NAME="channel2"

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash

export CORE_PEER_ADDRESS="staging-blockchain-org1peer1:30110"
export ORDERER_URL="staging-blockchain-orderer:31010"
export CHANNEL_NAME="channel1"

# After exec inside
export CHAINCODE_NAME="cc"
export CHAINCODE_VERSION="1.0"
export FABRIC_CFG_PATH="/etc/hyperledger/fabric"
export CORE_PEER_MSPCONFIGPATH="/fabric/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_LOCALMSPID="Org1MSP"

peer chaincode instantiate -o ${ORDERER_URL} -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} -v ${CHAINCODE_VERSION} -P "AND('Org1MSP.member')" -c '{"Args":[]}' -l node
exit
```

### Step 13: AnchorPeers

Now we need to update our channel configuration to reflect our Anchor Peers:
```sh
# Prod
pod=$(kubectl get pods | grep production-blockchain-org1peer1 | awk '{print $1}')
kubectl exec -it $pod -- peer channel update -f /fabric/Org1MSPanchors.tx -c channel2 -o production-blockchain-orderer:31010 

# Staging
pod=$(kubectl get pods | grep staging-blockchain-org1peer1 | awk '{print $1}')
kubectl exec -it $pod -- peer channel update -f /fabric/Org1MSPanchors.tx -c channel1 -o staging-blockchain-orderer:31010 
```

After this you can test chaincode with command inside peer

```sh
# Prod
# Invoke
peer chaincode invoke --peerAddresses production-blockchain-org1peer1:30110 -o production-blockchain-orderer:31010 -C channel2 -n cc -c '{"Args":["addRecord", "20200925-14", "[{'\''a'\'': '\''9'\''}, {'\''b'\'': '\''8'\''}]"]}'
# Query
peer chaincode query -C channel2 -n cc -c '{"Args":["queryRecord", "20200925-14"]}'

# Staging
# Invoke
peer chaincode invoke --peerAddresses staging-blockchain-org1peer1:30110 -o staging-blockchain-orderer:31010 -C channel1 -n cc -c '{"Args":["addRecord", "20200925-12", "data goes here"]}'
# Query
peer chaincode query -C channel1 -n cc -c '{"Args":["queryRecord", "20200925-12"]}'
```

### Step 14: Deploy Hyperledger Explorer (Optional)

Fabric Explorer needs a PostgreSQL Database as its backend. In order to deploy, we'll create the file `kubernetes/blockchain-explorer-db_deploy.yaml` with the following `Deployment`:
```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: blockchain-explorer-db
spec:
  replicas: 1
  template:
    metadata:
      labels:
        name: explorer-db
    spec:
      volumes:
      - name: fabricfiles
        persistentVolumeClaim:
          claimName: fabric-pvc

      containers:
      - name: postgres
        image: postgres:10.4-alpine
        env:
        - name: TZ
          value: "America/Sao_Paulo"
        - name: DATABASE_DATABASE
          value: fabricexplorer
        - name: DATABASE_USERNAME
          value: hppoc
        - name: DATABASE_PASSWORD
          value: password
        volumeMounts:
        - mountPath: /fabric
          name: fabricfiles
```
*Note: The timezone is also important here.*  
*Note: This pod will need Internet access.*  

Now we're going to apply the configuration:
```sh
kubectl apply -f kubernetes/blockchain-explorer-db_deploy.yaml
```

After that, we need to create the `Service` entry for our database. To do that let's create the file `kubernetes/blockchain-explorer-db_svc.yaml` as below:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: blockchain-explorer-db
  labels:
    run: explorer-db
spec:
  type: ClusterIP 
  selector:
    name: explorer-db
  ports:
  - protocol: TCP
    port: 5432
    targetPort: 5432 
    name: pgsql
```

Now we're going to apply the configuration:
```sh
kubectl apply -f kubernetes/blockchain-explorer-db_svc.yaml
```

Now, before proceeding, make sure the PostgreSQL Pod is running. We need to create the tables and artifacts for Hyperledger Explorer in our database:
```sh
pod=$(kubectl get pods | grep blockchain-explorer-db | awk '{print $1}')
kubectl exec -it $pod -- /bin/bash
mkdir -p /fabric/config/explorer/db/
mkdir -p /fabric/config/explorer/app/
cd /fabric/config/explorer/db/
wget https://raw.githubusercontent.com/hyperledger/blockchain-explorer/master/app/persistence/fabric/postgreSQL/db/createdb.sh
wget https://raw.githubusercontent.com/hyperledger/blockchain-explorer/master/app/persistence/fabric/postgreSQL/db/explorerpg.sql
wget https://raw.githubusercontent.com/hyperledger/blockchain-explorer/master/app/persistence/fabric/postgreSQL/db/processenv.ts
wget https://raw.githubusercontent.com/hyperledger/blockchain-explorer/master/app/persistence/fabric/postgreSQL/db/updatepg.sql
apk update
apk add jq
apk add nodejs
apk add sudo
rm -rf /var/cache/apk/*
chmod +x ./createdb.sh
./createdb.sh
exit
```
Now, we're going to create the config file with our Hyperledger Network description to use on Hyperledger Explorer. In order to do that, we'll create the file `config/explorer/app/config.json` with the following configuration:
```json
{
  "network-configs": {
    "network-1": {
      "version": "1.0",
      "clients": {
        "client-1": {
          "tlsEnable": false,
          "organization": "Org1MSP",
          "channel": "channel1",
          "credentialStore": {
            "path": "./tmp/credentialStore_Org1/credential",
            "cryptoStore": {
              "path": "./tmp/credentialStore_Org1/crypto"
            }
          }
        }
      },
      "channels": {
        "channel1": {
          "peers": {
            "blockchain-org1peer1": {},
            "blockchain-org2peer1": {},
            "blockchain-org3peer1": {},
            "blockchain-org4peer1": {},
            "blockchain-org1peer2": {},
            "blockchain-org2peer2": {},
            "blockchain-org3peer2": {},
            "blockchain-org4peer2": {}
          },
          "orderers": {
            "blockchain-orderer" : {}
          },
          "connection": {
            "timeout": {
              "peer": {
                "endorser": "6000",
                "eventHub": "6000",
                "eventReg": "6000"
              }
            }
          }
        }
      },
      "organizations": {
        "Org1MSP": {
          "mspid": "Org1MSP",
          "fullpath": false,
          "adminPrivateKey": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore"
          },
          "signedCert": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts"
          }
        },
        "Org2MSP": {
          "mspid": "Org2MSP",
          "fullpath": false,
          "adminPrivateKey": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/keystore"
          },
          "signedCert": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/signcerts"
          }
        },
        "Org3MSP": {
          "mspid": "Org3MSP",
          "fullpath": false,
          "adminPrivateKey": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/keystore"
          },
          "signedCert": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/signcerts"
          }
        },
        "Org4MSP": {
          "mspid": "Org4MSP",
          "fullpath": false,
          "adminPrivateKey": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org4.example.com/users/Admin@org4.example.com/msp/keystore"
          },
          "signedCert": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org4.example.com/users/Admin@org4.example.com/msp/signcerts"
          }
        },
        "OrdererMSP": {
          "mspid": "OrdererMSP",
          "adminPrivateKey": {
            "path":
              "/fabric/crypto-config/ordererOrganizations/example.com/users/Admin@example.com/msp/keystore"
          }
        }
      },
      "peers": {
        "blockchain-org1peer1": {
          "tlsCACerts": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
          },
          "url": "grpc://blockchain-org1peer1:30110",
          "eventUrl": "grpc://blockchain-org1peer1:30111",
          "grpcOptions": {
            "ssl-target-name-override": "peer0.org1.example.com"
          }
        },
        "blockchain-org2peer1": {
          "tlsCACerts": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
          },
          "url": "grpc://blockchain-org2peer1:30110",
          "eventUrl": "grpc://blockchain-org2peer1:30111",
          "grpcOptions": {
            "ssl-target-name-override": "peer0.org2.example.com"
          }
        },
        "blockchain-org3peer1": {
          "tlsCACerts": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt"
          },
          "url": "grpc://blockchain-org3peer1:30110",
          "eventUrl": "grpc://blockchain-org3peer1:30111",
          "grpcOptions": {
            "ssl-target-name-override": "peer0.org3.example.com"
          }
        },
        "blockchain-org4peer1": {
          "tlsCACerts": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org4.example.com/peers/peer0.org4.example.com/tls/ca.crt"
          },
          "url": "grpc://blockchain-org4peer1:30110",
          "eventUrl": "grpc://blockchain-org4peer1:30111",
          "grpcOptions": {
            "ssl-target-name-override": "peer0.org4.example.com"
          }
        },
        "blockchain-org1peer2": {
          "tlsCACerts": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt"
          },
          "url": "grpc://blockchain-org1peer2:30110",
          "eventUrl": "grpc://blockchain-org1peer2:30111",
          "grpcOptions": {
            "ssl-target-name-override": "peer1.org1.example.com"
          }
        },
        "blockchain-org2peer2": {
          "tlsCACerts": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt"
          },
          "url": "grpc://blockchain-org2peer2:30110",
          "eventUrl": "grpc://blockchain-org2peer2:30111",
          "grpcOptions": {
            "ssl-target-name-override": "peer1.org2.example.com"
          }
        },
        "blockchain-org3peer2": {
          "tlsCACerts": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/tls/ca.crt"
          },
          "url": "grpc://blockchain-org3peer2:30110",
          "eventUrl": "grpc://blockchain-org3peer2:30111",
          "grpcOptions": {
            "ssl-target-name-override": "peer1.org3.example.com"
          }
        },
        "blockchain-org4peer2": {
          "tlsCACerts": {
            "path":
              "/fabric/crypto-config/peerOrganizations/org4.example.com/peers/peer1.org4.example.com/tls/ca.crt"
          },
          "url": "grpc://blockchain-org4peer2:30110",
          "eventUrl": "grpc://blockchain-org4peer2:30111",
          "grpcOptions": {
            "ssl-target-name-override": "peer1.org4.example.com"
          }
        }
      },
      "orderers": {
        "blockchain-orderer": {
          "url": "grpc://blockchain-orderer:31010"
        }
      }
    }
  },
  "configtxgenToolPath": "/fabric-path/workspace/fabric-samples/bin",
  "license": "Apache-2.0"
}
```

After creating the file, its time to copy it to our shared filesystem:
```sh
kubectl cp config/explorer/app/config.json fabric-tools:/fabric/config/explorer/app/
```  

Create the `config/explorer/app/run.sh` as below:
```sh
#!/bin/sh
mkdir -p /opt/explorer/app/platform/fabric/
mkdir -p /tmp/

mv /opt/explorer/app/platform/fabric/config.json /opt/explorer/app/platform/fabric/config.json.vanilla
cp /fabric/config/explorer/app/config.json /opt/explorer/app/platform/fabric/config.json

cd /opt/explorer
node $EXPLORER_APP_PATH/main.js && tail -f /dev/null
```

After creating the file, its time to copy it to our shared filesystem:
```sh
chmod +x config/explorer/app/run.sh
kubectl cp config/explorer/app/run.sh fabric-tools:/fabric/config/explorer/app/
```

Now its time to create our Hyperledger Explorer application `Deployment` by creating the file `kubernetes/blockchain-explorer-app_deploy.yaml` as below:
```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: blockchain-explorer-app
spec:
  replicas: 1
  template:
    metadata:
      labels:
        name: explorer
    spec:
      volumes:
      - name: fabricfiles
        persistentVolumeClaim:
          claimName: fabric-pvc

      containers:
      - name: explorer
        image: hyperledger/explorer:latest
        command: ["sh" , "-c" , "/fabric/config/explorer/app/run.sh"]
        env:
        - name: TZ
          value: "America/Sao_Paulo"
        - name: DATABASE_HOST
          value: blockchain-explorer-db
        - name: DATABASE_USERNAME
          value: hppoc
        - name: DATABASE_PASSWORD
          value: password
        volumeMounts:
        - mountPath: /fabric
          name: fabricfiles
```
*Note: Again setting up the timezone as the reports might get impacted.*  
*Note: This deployment will have access to the shared filesystem as the startup script and config files are store there.*  
*Note: There are 3 environment variables here pointing our application to the previously created PostgreSQL service.*  

Now its time to apply our `Deployment`:
```sh
kubectl apply -f kubernetes/blockchain-explorer-app_deploy.yaml
```

## Start the application and REST API
Copy the application code to our shared filesystem.
```sh
# Prod
kubectl cp ./config/application/ production-fabric-tools:/fabric/config/

# Staging
kubectl cp ./config/application/ staging-fabric-tools:/fabric/config/
```

Use fabric-tools to get inside (exec bash) and set the permission
```sh
# Prod
kubectl exec -it production-fabric-tools -- /bin/bash

# Staging
kubectl exec -it staging-fabric-tools -- /bin/bash

chmod a+rx /fabric/config/application/run.sh
exit
```

Now, the application code will sit in directory: /fabric/config/application/.
After that, we will deploy the application.
```sh
kubectl apply -f kubernetes/13-fabric-application.yaml
```

New pod will be deployed and initialize the wallet credential for Fabric API then start the Node.js server at port 8888.
To make it expose to the network, we will then apply the service for it.

```sh
kubectl apply -f kubernetes/14-fabric-application_svc.yaml
```

How to check if it work or not?
You can just logs the pods and if it say something like 'Listening to port 8888' then it should be fine.
You can also try to exec into the pods then try curl GET/POST to test the API.

## CLEANUP

Now, to leave our environment clean, we're going to remove our helper `Pod`:
```sh
kubectl delete -f kubernetes/fabric-tools.yaml
```

## VALIDATING

Now, we're going to run 2 transactions. The first one we'll move 50 from `A` to `B`. The second one we'll move 33 from `B` to `A`: 
```sh
pod=$(kubectl get pods | grep blockchain-org1peer1 | awk '{print $1}')
kubectl exec -it $pod -- /bin/bash

peer chaincode invoke --peerAddresses blockchain-org1peer1:30110 -o blockchain-orderer:31010 -C channel1 -n cc -c '{"Args":["invoke","a","b","50"]}'

# peer chaincode invoke --peerAddresses blockchain-org1peer1:30110 --peerAddresses blockchain-org2peer1:30110 --peerAddresses blockchain-org3peer1:30110 --peerAddresses blockchain-org4peer1:30110 -o blockchain-orderer:31010 -C channel1 -n cc -c '{"Args":["invoke","b","a","33"]}'

exit
```
*Note: The invoke command is using --peerAddresses parameter four times, in order to send the transaction to at least one peer from each organization.*  
*Note: The first transaction might take a little bit to go through.*  
*Note: We're executing transaction on Org1MSP Peer1.*  

Now we're going to check our balance. As stated before, we've started `A` with 300 and `B` with 600: 
```sh
pod=$(kubectl get pods | grep blockchain-org1peer1 | awk '{print $1}')
kubectl exec -it $pod -- /bin/bash

peer chaincode query -C channel1 -n cc -c '{"Args":["query","a"]}'

peer chaincode query -C channel1 -n cc -c '{"Args":["query","b"]}'

exit
```
*Note: A should return 283 and B should return 617.*  
*Note: We're executing transaction on Org1MSP Peer1.*  

We can also check the network status as well as the transactions on Hyperledger Explorer:
```sh
pod=$(kubectl get pods | grep blockchain-explorer-app | awk '{print $1}')
kubectl port-forward $pod 8080:8080
```

Now open your browser to [http://127.0.0.1:8080/](http://127.0.0.1:8080/).
In the first window you can see your network status and transactions as below:  

![slide6.jpg](https://github.com/feitnomore/hyperledger-fabric-kubernetes/raw/master/images/slide6.jpg)

You can also click on transactions tab, and check for a transaction as below:  

![slide7.jpg](https://github.com/feitnomore/hyperledger-fabric-kubernetes/raw/master/images/slide7.jpg)

*Note: You can see here that the transaction got endorsed by all the 4 Organizations.*  

## Reference Links

* [Hyperledger Fabric](https://hyperledger-fabric.readthedocs.io/en/release-1.3/)
* [Hyperledger Explorer](https://www.hyperledger.org/projects/explorer)
* [Apache CouchDB](http://couchdb.apache.org/)
* [Apache Kafka](https://kafka.apache.org/)
* [Kubernetes Concepts](https://kubernetes.io/docs/concepts/)
