import dotenv from "dotenv"
import {
  AptosAccount,
  AptosClient,
  CoinClient,
  FaucetClient,
  Network,
  Provider,
  TokenClient
} from "aptos"
import {FAUCET_URL, NODE_URL} from "./common"

dotenv.config();

(async () => {
  // Aptos API client
  const client = new AptosClient(NODE_URL)
  const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL)
  // Aptos Token client for common token operations such as creating collections and tokens, traferring and claiming them, and so on
  const tokenClient = new TokenClient(client)
  // Aptos Coin client for checking account balance
  const coinClient = new CoinClient(client)

  // Create local accounts.
  // Accounts have both on-chain and off-chain state. Off-chain state consists of address and pub/priv key pairs.
  const alice = new AptosAccount()
  const bob = new AptosAccount()
  // Create blockchain accounts.
  // On-chain accounts interact with dApps to receive and send tokens and coins.
  // We utilize the faucet to create on-chain accounts and fund.
  console.log("=== Alice and Bob get fund 100,000,000 ===");
  await faucetClient.fundAccount(alice.address(), 100_000_000)
  await faucetClient.fundAccount(bob.address(), 100_000_000)

  console.log("=== Coin Balances ===");
  console.log(`Alice: ${await coinClient.checkBalance(alice)}`);
  console.log(`Bob: ${await coinClient.checkBalance(bob)}`);
  console.log("");

  // Create a collection.
  console.log("=== Creating a collection ===");
  let collectionName = "Alice's";
  const txHash1 = await tokenClient.createCollection(
      alice,
      collectionName,
      "Alice's simple collection",
      "https://alice.com"
  )
  await client.waitForTransaction(txHash1, {checkSuccess: true})
  console.log("=== Coin Balances ===");
  console.log(`Alice: ${await coinClient.checkBalance(alice)}`);
  console.log(`Bob: ${await coinClient.checkBalance(bob)}`);
  console.log("");

  // Create a token.
  console.log("=== Creating a token under the collection ===");
  let tokenName = "Alice's first token";
  const txHash2 = await tokenClient.createToken(
      alice,
      collectionName,
      tokenName,
      "Alice's simple token",
      1,
      "https://aptos.dev/img/nyan.jpg"
  )
  await client.waitForTransaction(txHash2, {checkSuccess:true})
  console.log("=== Coin Balances ===");
  console.log(`Alice: ${await coinClient.checkBalance(alice)}`);
  console.log(`Bob: ${await coinClient.checkBalance(bob)}`);
  console.log("");

  // Read the collection data.
  const collectionData = await tokenClient.getCollectionData(alice.address(), collectionName)
  console.log(`Alice's collection metadata: ${JSON.stringify(collectionData, null, 2)}`)
  // Read the token data.
  const tokenData = await tokenClient.getTokenData(alice.address(), collectionName, tokenName)
  console.log(`Alice's token metadata: ${JSON.stringify(tokenData, null, 2)}`)
  // Read the token balance.
  let tokenPropertyVersion = 0;
  const aliceBalance = await tokenClient.getToken(
      alice.address(),
      collectionName,
      tokenName,
      `${tokenPropertyVersion}`
  )
  console.log(`Alice's token balance: ${JSON.stringify(aliceBalance, null, 2)}`)

  console.log("\n=== Transferring the token to Bob ===")
  // Alice offers Bob transfer
  console.log("\n=== Alice offers Bob ===")
  const txHash3 = await tokenClient.offerToken(
      alice,
      bob.address(),
      alice.address(),
      collectionName,
      tokenName,
      1,
      tokenPropertyVersion
  )
  await client.waitForTransaction(txHash3,{checkSuccess:true})
  console.log("=== Coin Balances ===");
  console.log(`Alice: ${await coinClient.checkBalance(alice)}`);
  console.log(`Bob: ${await coinClient.checkBalance(bob)}`);
  console.log("");
  // Bob accepts the transfer
  console.log("\n=== Bob claims ===")
  const txHash4 = await tokenClient.claimToken(
      bob,
      alice.address(),
      alice.address(),
      collectionName,
      tokenName,
      tokenPropertyVersion
  )
  await client.waitForTransaction(txHash4,{checkSuccess:true})
  console.log("=== Coin Balances ===");
  console.log(`Alice: ${await coinClient.checkBalance(alice)}`);
  console.log(`Bob: ${await coinClient.checkBalance(bob)}`);
  console.log("");
  const aliceBalanc2 = await tokenClient.getToken(
      alice.address(),
      collectionName,
      tokenName,
      `${tokenPropertyVersion}`
  )
  let tokenId = {
    token_data_id: {
      creator: alice.address().hex(),
      collection: collectionName,
      name: tokenName,
    },
    property_version: `${tokenPropertyVersion}`
  };
  const bobBalanc2 = await tokenClient.getTokenForAccount(bob.address(), tokenId)
  console.log(`Alice's token balance: ${aliceBalanc2["amount"]}`)
  console.log(`Bob's token balance: ${bobBalanc2["amount"]}`)

  console.log("\n=== Transferring the token back to Alice using MultiAgent ===")
  console.log("\n=== Bob transfer directly ===")
  let txHash5 = await tokenClient.directTransferToken(
      bob, alice, alice.address(), collectionName, tokenName, 1, tokenPropertyVersion
  )
  await client.waitForTransaction(txHash5,{checkSuccess:true})
  console.log("=== Coin Balances ===");
  console.log(`Alice: ${await coinClient.checkBalance(alice)}`);
  console.log(`Bob: ${await coinClient.checkBalance(bob)}`);
  console.log("");
  const aliceBalanc3 = await tokenClient.getToken(
      alice.address(),
      collectionName,
      tokenName,
      `${tokenPropertyVersion}`
  )
  const bobBalanc3 = await tokenClient.getTokenForAccount(bob.address(), tokenId)
  console.log(`Alice's token balance: ${aliceBalanc3["amount"]}`)
  console.log(`Bob's token balance: ${bobBalanc3["amount"]}`)


  const provider = new Provider(Network.DEVNET);
  console.log("\n=== Checking if indexer devnet chainId same as fullnode chainId  ===");
  const indexerLedgerInfo = await provider.getIndexerLedgerInfo();
  const fullNodeChainId = await provider.getChainId();

  console.log(
      `\n fullnode chain id is: ${fullNodeChainId}, indexer chain id is: ${indexerLedgerInfo.ledger_infos[0].chain_id}`,
  );

  if (indexerLedgerInfo.ledger_infos[0].chain_id !== fullNodeChainId) {
    console.log(`\n fullnode chain id and indexer chain id are not synced, skipping rest of tests`);
    return;
  }

  console.log("\n=== Getting Alices's NFTs ===");
  const aliceNfts = await provider.getAccountNFTs(alice.address().hex());
  console.log(`Alice current token ownership: ${aliceNfts.current_token_ownerships[0].amount}. Should be 1`);

  console.log("\n=== Getting Bob's NFTs ===");
  const bobNfts = await provider.getAccountNFTs(bob.address().hex());
  console.log(`Bob current token ownership: ${bobNfts.current_token_ownerships.length}. Should be 0`);
})()
