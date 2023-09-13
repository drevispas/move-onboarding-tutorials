module FACoin::fa_coin {

  use std::error;
  use std::option;
  use std::signer;
  use std::string::utf8;
  use aptos_framework::fungible_asset::{Self, BurnRef, FungibleAsset, FungibleStore, Metadata, MintRef, TransferRef};
  use aptos_framework::object::{Self, ConstructorRef, Object};
  use aptos_framework::primary_fungible_store;

  const E_NOT_OWNER: u64 = 1;

  const ASSET_SYMBOL: vector<u8> = b"FA";

  #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
  /// A resource beloning to OG
  struct ManagedFungibleAsset has key {
    mint_ref: MintRef,
    transfer_ref: TransferRef,
    burn_ref: BurnRef
  }

  fun init_module(admin: &signer) {
    // Create a new object. We can query the object by signer and seed deterministically.
    let constructor_ref: &ConstructorRef = &object::create_named_object(
      admin, // creator
      ASSET_SYMBOL // seed
    );

    // Create a fungible asset with the primary asset store. It stores a metadata under the creator.
    primary_fungible_store::create_primary_store_enabled_fungible_asset(
      constructor_ref,
      // The same as `Optional.empty()` in Java
      option::none(),
      utf8(b"FA Coin"),
      utf8(ASSET_SYMBOL),
      8,
      utf8(b"https://www.blocko.io/wp-content/uploads/2019/08/favicon.png"),
      utf8(b"https://blocko.io"),
    );

    // Save ability refs under the owner.
    let mint_ref: MintRef = fungible_asset::generate_mint_ref(constructor_ref);
    let burn_ref: BurnRef = fungible_asset::generate_burn_ref(constructor_ref);
    let transfer_ref: TransferRef = fungible_asset::generate_transfer_ref(constructor_ref);
    let metadata_object_signer: signer = object::generate_signer(constructor_ref);
    move_to(
      &metadata_object_signer,
      ManagedFungibleAsset { mint_ref, burn_ref, transfer_ref }
    )
  }

  #[view]
  public fun get_metadata(): Object<Metadata> {
    // Query object address of a named object.
    let asset_address: address = object::create_object_address(
      &@FACoin, // source
      ASSET_SYMBOL // seed
    );
    object::address_to_object<Metadata>(asset_address)
  }

  /// Return a resource containing FA refs.
  inline fun borrow_refs(
    owner: &signer,
    asset_metadata: Object<Metadata>
  ): &ManagedFungibleAsset acquires ManagedFungibleAsset {
    assert!(
      // Check if the metadata object is belong to the address.
      object::is_owner(
        asset_metadata, // object
        signer::address_of(owner) // owner address
      ),
      error::permission_denied(E_NOT_OWNER)
    );
    // Ref struct is also saved under the same owner of metadata object.
    borrow_global<ManagedFungibleAsset>(object::object_address(&asset_metadata))
  }

  /// An `entry` function is called by external dapps not by internal modules.
  /// Mint FA as the owner of metadata object.
  public entry fun mint(admin: &signer, to_address: address, amount: u64) acquires ManagedFungibleAsset {
    // Get the FA metadata object.
    let metadata: Object<Metadata> = get_metadata();
    // Get the resource representing FA refs.
    let managed_fungible_asset: &ManagedFungibleAsset = borrow_refs(admin, metadata);
    // Get the primary Fungible Store.
    let fs: Object<FungibleStore> = primary_fungible_store::ensure_primary_store_exists(to_address, metadata);
    // Mint and get minted fungible asset
    let fa: FungibleAsset = fungible_asset::mint(
      &managed_fungible_asset.mint_ref, // mintRef
      amount // amount
    );
    // Deposit the fungible asset to the store ignoring frozen.
    fungible_asset::deposit_with_ref(
      &managed_fungible_asset.transfer_ref, // transferRef
      fs, // store
      fa // fungibleAsset
    )
  }

  /// Transfer as the owner of metadata object. Create the primary FS of to_address if not exists.
  public entry fun transfer(
    admin: &signer,
    from_address: address,
    to_address: address,
    amount: u64
  ) acquires ManagedFungibleAsset {
    let metadata: Object<Metadata> = get_metadata();
    let transfer_ref: &TransferRef = &borrow_refs(admin, metadata).transfer_ref;
    // Get the primary FS of from-address.
    let from_fs: Object<FungibleStore> = primary_fungible_store::primary_store(from_address, metadata);
    // Get the primary FS of to-address. Create a new primary FS if not exist.
    let to_fs: Object<FungibleStore> = primary_fungible_store::ensure_primary_store_exists(to_address, metadata);
    fungible_asset::transfer_with_ref(transfer_ref, from_fs, to_fs, amount)
  }

  /// Burn fungible asset as the owner of metadata object.
  public entry fun burn(admin: &signer, from: address, amount: u64) acquires ManagedFungibleAsset {
    let metadata: Object<Metadata> = get_metadata();
    let burn_ref: &BurnRef = &borrow_refs(admin, metadata).burn_ref;
    let from_fs: Object<FungibleStore> = primary_fungible_store::primary_store(from, metadata);
    // Burn the amount of FA from the FS.
    fungible_asset::burn_from(burn_ref, from_fs, amount)
  }

  public entry fun freeze_account(admin: &signer, address_to_freeze: address) acquires ManagedFungibleAsset {
    let metadata: Object<Metadata> = get_metadata();
    let transfer_ref: &TransferRef = &borrow_refs(admin, metadata).transfer_ref;
    let fs: Object<FungibleStore> = primary_fungible_store::ensure_primary_store_exists(address_to_freeze, metadata);
    fungible_asset::set_frozen_flag(transfer_ref, fs, true)
  }

  public entry fun unfreeze_account(admin: &signer, address_to_freeze: address) acquires ManagedFungibleAsset {
    let metadata: Object<Metadata> = get_metadata();
    let transfer_ref: &TransferRef = &borrow_refs(admin, metadata).transfer_ref;
    let fs: Object<FungibleStore> = primary_fungible_store::ensure_primary_store_exists(address_to_freeze, metadata);
    fungible_asset::set_frozen_flag(transfer_ref, fs, false)
  }

  #[test(creator = @FACoin)]
  fun test_basic_flow(creator: &signer) acquires ManagedFungibleAsset {
    init_module(creator);
    let creator_address: address = signer::address_of(creator);
    let alice_address: address = @0xface;

    mint(
      creator, // signer
      creator_address, // to_address
      100 // amount
    );
    let metadata: Object<Metadata> = get_metadata();
    // Get the balance of the given address's primary store.
    assert!(primary_fungible_store::balance(creator_address, metadata) == 100, 4);
    freeze_account(creator, creator_address);
    assert!(primary_fungible_store::is_frozen(creator_address, metadata), 5);
    transfer(creator, creator_address, alice_address, 10);
    assert!(primary_fungible_store::balance(alice_address, metadata) == 10, 6);

    unfreeze_account(creator, creator_address);
    assert!(!primary_fungible_store::is_frozen(creator_address, metadata), 7);
    burn(creator, creator_address, 90);
  }

  #[test(creator = @FACoin, alice = @0xface)]
  #[expected_failure(abort_code = 0x50001, location = Self)]
  fun test_permission_denied(creator: &signer, alice: &signer) acquires ManagedFungibleAsset {
    // FA created by `creator`.
    init_module(creator);
    let creator_address = signer::address_of(creator);
    // But alice tries to mint who is not the owner of the FA.
    mint(alice, creator_address, 100);
  }
}
