import ganache = require('ganache-cli');
import Web3 = require('web3');

async function run() {
  const nodeA = ganache.server({
  });
  
  await new Promise(resolve => nodeA.listen(8545, function(err, chain) {resolve(chain)}));
  let web3 = new Web3("http://localhost:8545");

  const accounts = await web3.eth.getAccounts();
  
  for(let nonce = 0; nonce < 10; nonce++) {
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: accounts[0],
      nonce: nonce,
      value: 1
    })
  }

  const block10 = await web3.eth.getBlock(10);
  console.log(!!block10, block10.hash)
  const block11 = await web3.eth.getBlock(11);
  console.log(!!block11, !!block11 && block11.hash)
  
  // const nodeB = ganache.server({
  //   fork: "http://localhost:8545@10"
  // });
  // await new Promise(resolve => nodeB.listen(8546, function(err, chain) {resolve(chain)}));
  // let web3b = new Web3("http://localhost:8546");
  // let accountB = await web3b.eth.getAccounts();

  // console.log(accounts, accountB)

  // await web3.eth.sendTransaction({
  //   from: accounts[1],
  //   to: accounts[0],
  //   nonce: 0,
  //   value: 1
  // })
  // await web3b.eth.sendTransaction({
  //   from: accountB[2],
  //   to: accountB[0],
  //   nonce: 0,
  //   value: 1
  // })

  // const [latestA5,latestB5] = await Promise.all([
  //   web3.eth.getBlock(5),
  //   web3b.eth.getBlock(5)
  // ])
  // const [latestA,latestB] = await Promise.all([
  //   web3.eth.getBlock('latest'),
  //   web3b.eth.getBlock('latest')
  // ])
  // console.log(latestA5.hash === latestB5.hash);
  // console.log(latestA.hash === latestB.hash);
}
run()


// server.listen(8545, async function(err, blockchain) {
//   const web3 = new Web3(ganache.provider())
//   const accounts = await web3.eth.getAccounts()
//   let nonce = 0
//   while(true) {
//     console.log(await web3.eth.getAccounts())
//     console.log(await web3.eth.getBlockNumber())
//     await web3.eth.sendTransaction({
//       from: accounts[0],
//       to: accounts[0],
//       nonce: nonce++,
//       value: 1
//     })
//     await new Promise(resolve => setTimeout(resolve, 200))
//   }

//   console.log(server)
//   // console.log(blockchain)
// });
// import { NestFactory } from '@nestjs/core';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(3000);
// }
// bootstrap();
