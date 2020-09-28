/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');

const ccpPath = path.resolve(__dirname, 'config.json');

async function add(req, res) {
  try {
    const { body, user } = req;
    console.log('invoke as user', user);
    if (!body) throw new Error('No request body');
    const { round, records } = body;
    if (!round || !records) throw new Error('No round or data');
    
    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const userExists = await wallet.exists(user);
    if (!userExists) {
      console.log(`An identity for the user "${user}" does not exist in the wallet`);
      console.log('Run the registerUser.js application before retrying');
      return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: user, discovery: { enabled: true, asLocalhost: false } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('channel1');

    // Get the contract from the network.
    const contract = network.getContract('cc');

    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    // await contract.submitTransaction('addRecord', '20200925-17', 'APPLICATION_DATA');
    const stringifiedRecords = JSON.stringify(records);
    await contract.submitTransaction('addRecord', round, stringifiedRecords);
    console.log('Transaction has been submitted');
    // Disconnect from the gateway.
    await gateway.disconnect();
    res.send({
      success: true
    })

  } catch (error) {
    console.error(`Failed to submit transaction: ${error}`);
    // process.exit(1);
    res.status(500).send({
      success: false,
      message: 'Something went wrong',
      error
    });
  }
}

// main();
module.exports = add;
