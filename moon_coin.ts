import {
  AptosAccount,
  AptosClient,
  FaucetClient,
  HexString,
  MaybeHexString,
  TxnBuilderTypes
} from "aptos";
import * as fs from "fs";
import * as path from "path";
import {ACCOUNT_ADDRESS, FAUCET_URL, NODE_URL, PRIVATE_KEY} from "./common";

// const readline = require("readline").createInterface({
//   input: process.stdin,
//   output: process.stdout
// })

class MoonCoinClient extends AptosClient {
  constructor() {
    super(NODE_URL);
  }

  async getBalance(accountAddress: MaybeHexString, coinTypeAddress: HexString): Promise<string | number> {
    try {
      const resource = await this.getAccountResource(
          accountAddress,
          `0x1::coin::CoinStore<${coinTypeAddress.hex()}::moon_coin::MoonCoin>`
      )
      return parseInt((resource.data as any)["coin"]["value"])
    } catch (_) {
      return 0
    }
  }

  async registerCoin(coinTypeAddress:HexString, coinReceiver:AptosAccount): Promise<string> {
    const rawTx=await this.generateTransaction(
        coinReceiver.address(), {
          // managed_coin:register() publishes `CoinStore` under the sender.
          function: "0x1::managed_coin::register",
          type_arguments: [`${coinTypeAddress.hex()}::moon_coin::MoonCoin`],
          arguments: []
        }
    )
    const bcsTx=await this.signTransaction(coinReceiver,rawTx)
    const pendingTx=await this.submitTransaction(bcsTx)
    return pendingTx.hash
  }

  async mintCoin(minter: AptosAccount, receiverAddress: HexString, amount: number | bigint) {
    const rawTx=await this.generateTransaction(minter.address(), {
      function: "0x1::managed_coin::mint",
      type_arguments: [`${minter.address()}::moon_coin::MoonCoin`],
      arguments: [receiverAddress.hex(), amount]
    })
    const bcsTx=await this.signTransaction(minter,rawTx)
    const pendingTx=await this.submitTransaction(bcsTx)
    return pendingTx.hash
  }

  async transferCoin(sender: AptosAccount, receiverAddress: HexString, amount: number) {
    const rawTx=await this.generateTransaction(sender.address(), {
      /// Convenient function to transfer a custom CoinType to a recipient account that might not exist.
      /// This would create the recipient account first and register it to receive the CoinType, before transferring.
      function: "0x1::aptos_account::transfer_coins",
      type_arguments: [`${sender.address()}::moon_coin::MoonCoin`],
      arguments: [receiverAddress.hex(), amount]
    })
    const bcsTx=await this.signTransaction(sender,rawTx)
    const pendingTx=await this.submitTransaction(bcsTx)
    return pendingTx.hash
  }
}

async function main() {
  const client = new MoonCoinClient()
  const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL)
  // const sender = new AptosAccount(
  //     Uint8Array.from(Buffer.from(PRIVATE_KEY)),
  //     ACCOUNT_ADDRESS
  // )
  // https://stackoverflow.com/questions/74511179/unable-to-create-aptosaccount-using-typescript-invalid-auth-key
  const sender = new AptosAccount(HexString.ensure(PRIVATE_KEY).toUint8Array())
  const alice = new AptosAccount()
  const bob = new AptosAccount()
  console.log("\n=== Accounts created ===")
  console.log(`Alice: ${alice.address()}`)
  console.log(`Bob: ${bob.address()}`)
  await faucetClient.fundAccount(alice.address(), 100_000_000)
  await faucetClient.fundAccount(bob.address(), 100_000_000)
  // await new Promise<void>((resolve) => {
  //   readline.question("Update MoonCoin address with Alice's, compile, and press Enter", () => {
  //     resolve()
  //     readline.close()
  //   })
  // })

  const modulePath = process.argv[2]
  const packageMetadata = fs.readFileSync(path.join(modulePath, "build", "Tutorial", "package-metadata.bcs"))
  const moduleData = fs.readFileSync(path.join(modulePath, "build", "Tutorial", "bytecode_modules", "moon_coin.mv"))
  console.log("\n=== Publishing MoonCoin package ===")
  let txHash = await client.publishPackage(
      sender,
      new HexString(packageMetadata.toString("hex")).toUint8Array(), [
        new TxnBuilderTypes.Module(new HexString(moduleData.toString("hex")).toUint8Array())
      ]
  )
  // After published the package, Moon coin is initialized.
  // The initialize() ensures `CoinType` was never published under the sender and
  // publishes `CoinInfo<CoinType>` and `Capabilities` under the sender.
  await client.waitForTransaction(txHash, {checkSuccess: true})
  console.log(`Sender's MoonCoin balance: ${await client.getBalance(ACCOUNT_ADDRESS, sender.address())}`)
  console.log(`Bob's MoonCoin balance: ${await client.getBalance(bob.address(), sender.address())}`)


  console.log("\n=== Registering CoinStore of MoonCoin ===")
  txHash=await client.registerCoin(sender.address(), sender)
  await client.waitForTransaction(txHash,{checkSuccess:true})

  console.log("\n=== Sender mints some of the Moon coins ===")
  txHash=await client.mintCoin(sender, sender.address(), 100);
  await client.waitForTransaction(txHash, {checkSuccess:true})
  console.log(`Sender's MoonCoin balance: ${await client.getBalance(ACCOUNT_ADDRESS, sender.address())}`)
  console.log(`Bob's MoonCoin balance: ${await client.getBalance(bob.address(), sender.address())}`)

  console.log("\n=== Sender transfers bob some Moon coins ===")
  txHash=await client.transferCoin(sender, bob.address(), 35);
  await client.waitForTransaction(txHash, {checkSuccess:true})
  console.log(`Sender's MoonCoin balance: ${await client.getBalance(ACCOUNT_ADDRESS, sender.address())}`)
  console.log(`Bob's MoonCoin balance: ${await client.getBalance(bob.address(), sender.address())}`)
}

if (require.main === module) {
  main().then((resp) => console.log(resp))
}
