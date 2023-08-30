// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

//:!:>section_1
export const NODE_URL = process.env.APTOS_NODE_URL || "https://fullnode.devnet.aptoslabs.com";
export const FAUCET_URL = process.env.APTOS_FAUCET_URL || "https://faucet.devnet.aptoslabs.com";
//<:!:section_1

export const aptosCoinStore = "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>";
export const fungibleStore = "0x1::fungible_asset::FungibleStore";

export const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x477396f5f3a2f35ce89d0c917cbcd8cda2b84b27a1130d2723e7418a9c0e5085'
export const ACCOUNT_ADDRESS = process.env.PRIVATE_KEY || "0xad3962458c2b2872fae70cc4dd48466815f21037e7217124ecd2b0da3896e1ca"
