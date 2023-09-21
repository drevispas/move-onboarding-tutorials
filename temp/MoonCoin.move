//:!:>moon
module MoonCoin::moon_coin {
  struct MoonCoin {}

  // `init_module()` is called by VM when the module is published.
  fun init_module(sender: &signer) {
    // managed_coin::initialize(): Publish `CoinInfo` and `Capabilities` resources under sender.
    aptos_framework::managed_coin::initialize<MoonCoin>(
      sender,
      b"Moon Coin",
      b"MOON",
      6,
      false,
    );
  }
}
//<:!:moon
