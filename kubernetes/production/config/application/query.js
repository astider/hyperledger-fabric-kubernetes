/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');

const ccpPath = path.resolve(__dirname, 'config.json');

const CHANNEL = process.env.CHANNEL_ID ? process.env.CHANNEL_ID : 'channel1';

async function query(req, res) {
  try {
    const { params, user } = req;
    const { round } = params;
    console.log('query as user', user);
    console.log('finding round:', round);
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

    console.log('>> connected to network');
    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork(CHANNEL);

    // Get the contract from the network.
    const contract = network.getContract('cc');

    // Evaluate the specified transaction.
    // queryCar transaction - requires 1 argument, ex: ('queryCar', 'CAR4')
    // queryAllCars transaction - requires no arguments, ex: ('queryAllCars')
    // const result = await contract.evaluateTransaction('queryRecord', '20200924-19');
    const result = await contract.evaluateTransaction('queryRecord', round);
    console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
    res.send({
      success: true,
      data: {
        round,
        result: JSON.parse(result.toString())
      }
    });
  } catch (error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    // process.exit(1);
    res.status(500).send({
      success: false,
      message: 'Something went wrong',
      error
    });
  }
}

module.exports = query;