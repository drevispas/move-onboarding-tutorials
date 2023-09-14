import {
  AptosAccount,
  CustomEndpoints,
  HexString,
  MaybeHexString,
  Network,
  Provider,
  Types,
} from "aptos"

// `Provider` contains `AptosClient` and `IndexerClient`.
class FACoinClient extends Provider {
  constructor(network: Network | CustomEndpoints) {
    super(network)
  }

  async getMetadata(creatorAccount: AptosAccount): Promise<MaybeHexString> {
    const payload: Types.ViewRequest = {
      function: `${creatorAccount.address().hex()}::fa_coin::get_metadata`,
      type_arguments: [],
      arguments: []
    }
    // AptosClient.view(): call module view function.
    return ((await this.view(payload)) as any)[0].inner as MaybeHexString
  }

  async mintCoin(creatorAccount: AptosAccount, receiverAddress: HexString, amount: number | bigint): Promise<string> {
    const rawTx = await this.generateTransaction(
        creatorAccount.address(), // sender address
        {
          function: `${creatorAccount.address().hex()}::fa_coin:mint`,
          type_arguments: [],
          arguments: [receiverAddress.hex(), amount]
        } // payload
    )
    const bcsTx: Uint8Array = await this.signTransaction(creatorAccount, rawTx)
    const pendingTx = await this.submitTransaction(bcsTx)
    return pendingTx.hash
  }

  async transferCoin(creatorAccount: AptosAccount, fromAddress: HexString, toAddress: HexString, amount: number | bigint): Promise<string> {
    const rawTx = await this.generateTransaction(creatorAccount.address(), {
      function: `${creatorAccount.address().hex()}::fa_coin::transfer`,
      type_arguments: [],
      arguments: [fromAddress.hex(), toAddress.hex(), amount]
    })
    const bcsTx = await this.signTransaction(creatorAccount, rawTx)
    const pendingTx = await this.submitTransaction(bcsTx)
    return pendingTx.hash
  }

  async burnCoin(creatorAccount: AptosAccount, fromAddress: HexString, amount: number | bigint): Promise<string> {
    const rawTx = await this.generateTransaction(creatorAccount.address(), {
      function: `${creatorAccount.address().hex()}::fa_coin::burn`,
      type_arguments: [],
      arguments: [fromAddress.hex(), amount]
    })
    const bcsTx = await this.signTransaction(creatorAccount, rawTx)
    const pendingTx = await this.submitTransaction(bcsTx)
    return pendingTx.hash
  }

  async freeze(creatorAccount: AptosAccount, targetAddress: HexString): Promise<string> {
    const rawTx = await this.generateTransaction(creatorAccount.address(), {
      function: `${creatorAccount.address().hex()}::fa_coin::freeze_account`,
      type_arguments: [],
      arguments: [targetAddress.hex()]
    })
    const bcsTx = await this.signTransaction(creatorAccount, rawTx)
    const pendingTx = await this.submitTransaction(bcsTx)
    return pendingTx.hash
  }

  async unfreeze(creatorAccount: AptosAccount, targetAddress: HexString): Promise<string> {
    const rawTx = await this.generateTransaction(creatorAccount.address(), {
      function: `${creatorAccount.address().hex()}::fa_coin::unfreeze_account`,
      type_arguments: [],
      arguments: [targetAddress.hex()]
    })
    const bcsTx = await this.signTransaction(creatorAccount, rawTx)
    const pendingTx = await this.submitTransaction(bcsTx)
    return pendingTx.hash
  }
}

async function main() {
}

if (require.main === module) {
  main().then(resp => console.log(resp))
}
