/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

'use strict';
const shim = require('fabric-shim');
const util = require('util');

let Chaincode = class {

  // The Init method is called when the Smart Contract 'fabcar' is instantiated by the blockchain network
  // Best practice is to have any Ledger initialization in separate function -- see initLedger()
  async Init(stub) {
    console.info('=========== Instantiated recordjs chaincode ===========');
    return shim.success();
  }

  // The Invoke method is called as a result of an application request to run the Smart Contract
  // 'fabcar'. The calling application program has also specified the particular smart contract
  // function to be called, with arguments
  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];
    if (!method) {
      console.error('no function of name:' + ret.fcn + ' found');
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async queryRecord(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting CarNumber ex: CAR01');
    }
    let recordKey = args[0];

    let carAsBytes = await stub.getState(recordKey); //get the car from chaincode state
    if (!carAsBytes || carAsBytes.toString().length <= 0) {
      throw new Error(recordKey + ' does not exist: ');
    }
    console.log(carAsBytes.toString());
    return carAsBytes;
  }

  async addRecord(stub, args) {
    console.info('============= START : Add Record ===========');
    if (args.length != 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
    }

    // args[1] is round
    // args[2] is stringified value

    var record = {
      round: args[1],
      value: args[2],
    };

    await stub.putState(args[0], Buffer.from(JSON.stringify(record)));
    console.info('============= END : Add Record ===========');
  }

  // async queryAllCars(stub, args) {

  //   let startKey = 'CAR0';
  //   let endKey = 'CAR999';

  //   let iterator = await stub.getStateByRange(startKey, endKey);

  //   let allResults = [];
  //   while (true) {
  //     let res = await iterator.next();

  //     if (res.value && res.value.value.toString()) {
  //       let jsonRes = {};
  //       console.log(res.value.value.toString('utf8'));

  //       jsonRes.Key = res.value.key;
  //       try {
  //         jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
  //       } catch (err) {
  //         console.log(err);
  //         jsonRes.Record = res.value.value.toString('utf8');
  //       }
  //       allResults.push(jsonRes);
  //     }
  //     if (res.done) {
  //       console.log('end of data');
  //       await iterator.close();
  //       console.info(allResults);
  //       return Buffer.from(JSON.stringify(allResults));
  //     }
  //   }
  // }

  // async changeCarOwner(stub, args) {
  //   console.info('============= START : changeCarOwner ===========');
  //   if (args.length != 2) {
  //     throw new Error('Incorrect number of arguments. Expecting 2');
  //   }

  //   let carAsBytes = await stub.getState(args[0]);
  //   let car = JSON.parse(carAsBytes);
  //   car.owner = args[1];

  //   await stub.putState(args[0], Buffer.from(JSON.stringify(car)));
  //   console.info('============= END : changeCarOwner ===========');
  // }
};

shim.start(new Chaincode());